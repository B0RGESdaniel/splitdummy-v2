import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { getBillNumber } from "@/lib/bill/bill-number";
import { formatReceiptDate } from "@/lib/bill/receipt-date";
import { waiterForBill } from "@/lib/bill/waiter";
import { charsPerLine, truncate, wrapLines } from "@/lib/receipt-image/wrap";
import { buildParticipantBreakdowns } from "@/lib/split/breakdown";
import { createClient } from "@/lib/supabase/server";

// Cupom de uma conta paga como imagem, pra mandar no grupo. Gerado no
// servidor (Satori, via next/og) em vez de capturar a tela: sai igual em
// qualquer celular. Mesmas vozes do Resumo — Courier Prime, com DotGothic16
// só nos dígitos —, sem carimbo PAGO e sem textura: só as linhas do papel.

const fontsDir = join(process.cwd(), "assets/fonts");
const [courierRegular, courierBold, dotGothic] = await Promise.all([
  readFile(join(fontsDir, "CourierPrime-Regular.ttf")),
  readFile(join(fontsDir, "CourierPrime-Bold.ttf")),
  readFile(join(fontsDir, "DotGothic16-Regular.ttf")),
]);

// Desenhado em 360px de largura (a do celular) e exportado em 2x.
const SCALE = 2;
const WIDTH = 360;
const PAD_X = 20;
const PAD_Y = 22;
const INNER = WIDTH - PAD_X * 2;
const LINE_HEIGHT = 1.45;

const TITLE = 18;
const BASE = 14;
const SMALL = 12;
const TINY = 11;

const PAPER = "#f8f9fb";
const INK = "#22252b";
const MUTED = "#5b5f66";
const RULE = "#6f737a";

const s = (px: number) => px * SCALE;
const lineBox = (fontSize: number) => fontSize * LINE_HEIGHT;

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// A DotGothic16 tem ascendente/descendente bem diferentes da Courier Prime
// (hhea: 1160/-288 em 1000 contra 1600/-700 em 2048): na mesma altura de
// linha, a linha de base dela fica 0,216em mais baixa, e o Satori não alinha
// irmãos de fontes diferentes pela linha de base. Sobe os dígitos esse tanto.
const DIGITS_RAISE_EM = (1160 - 288) / 1000 / 2 - (1600 - 700) / 2048 / 2;

function Digits({ children }: { children: string }) {
  return (
    <span style={{ fontFamily: "DotGothic16", position: "relative", top: `-${DIGITS_RAISE_EM}em` }}>
      {children}
    </span>
  );
}

function Row({
  left,
  right,
  fontSize,
  color = INK,
  bold = false,
  indent = 0,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  fontSize: number;
  color?: string;
  bold?: boolean;
  indent?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: s(lineBox(fontSize)),
        lineHeight: LINE_HEIGHT,
        paddingLeft: s(indent),
        fontSize: s(fontSize),
        fontWeight: bold ? 700 : 400,
        color,
      }}
    >
      {left}
      <div style={{ flexGrow: 1 }} />
      {right}
    </div>
  );
}

function Rule({ gap = 10, style = "dashed" }: { gap?: number; style?: "dashed" | "double" }) {
  if (style === "double") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: s(2), margin: `${s(gap)}px 0` }}>
        <div style={{ height: s(1), backgroundColor: INK }} />
        <div style={{ height: s(1), backgroundColor: INK }} />
      </div>
    );
  }
  return <div style={{ margin: `${s(gap)}px 0`, borderTop: `${s(1)}px dashed ${RULE}` }} />;
}
// Altura de cada Rule: margem dos dois lados + traço (o duplo tem 2 traços
// e o vão entre eles).
const ruleHeight = (gap = 10, style: "dashed" | "double" = "dashed") =>
  gap * 2 + (style === "double" ? 4 : 1);

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/bills/[billId]/receipt-image">) {
  const { billId } = await ctx.params;
  const supabase = await createClient();

  // RLS: só quem participa da conta lê a conta.
  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status, service_tax_percent, owner_id, created_at, closed_at")
    .eq("id", billId)
    .single();

  if (!bill) {
    return new Response("Conta não encontrada.", { status: 404 });
  }
  // Conta aberta ainda muda: só a paga (imutável) vira imagem.
  if (bill.status !== "closed") {
    return new Response("Só conta paga vira imagem.", { status: 409 });
  }

  const [{ data: participants }, { data: items }, { data: shares }, billNumber] = await Promise.all([
    supabase
      .from("bill_participants")
      .select("id, display_name, profiles(display_name)")
      .eq("bill_id", billId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("items")
      .select("id, description, unit_price, quantity")
      .eq("bill_id", billId)
      .order("created_at", { ascending: true }),
    supabase.from("item_shares").select("item_id, participant_id, parts").eq("bill_id", billId),
    getBillNumber(bill.owner_id, bill.created_at),
  ]);

  const people = (participants ?? []).map((row) => ({
    id: row.id,
    name: row.display_name ?? row.profiles?.display_name ?? "",
  }));

  const sharesByItem = new Map<string, { profileId: string; parts: number }[]>();
  for (const share of shares ?? []) {
    const list = sharesByItem.get(share.item_id) ?? [];
    list.push({ profileId: share.participant_id, parts: share.parts ?? 0 });
    sharesByItem.set(share.item_id, list);
  }
  const breakdowns = buildParticipantBreakdowns(
    (items ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      shares: sharesByItem.get(item.id) ?? [],
    })),
    people.map((person) => person.id),
    bill.service_tax_percent,
  );

  const totals = [...breakdowns.values()];
  const totalCents = totals.reduce((sum, b) => sum + b.totalCents, 0);
  const subtotalCents = totals.reduce((sum, b) => sum + b.subtotalCents, 0);

  const titleLines = wrapLines(bill.name.toUpperCase(), charsPerLine(INNER, TITLE));
  // O valor da pessoa fica à direita na mesma linha: o nome cabe no resto.
  const nameChars = charsPerLine(INNER - 110, BASE);
  // Item: recuo, fração ("1/2 ") e valor à direita. Descrição antiga (antes
  // do limite de 20 caracteres) pode passar disso e é cortada com "…".
  const itemChars = (fraction: string) =>
    charsPerLine(INNER - 12 - 92, SMALL) - (fraction.length + 1);

  // Altura somada linha a linha, na mesma ordem do desenho abaixo.
  let height = PAD_Y * 2;
  height += titleLines.length * lineBox(TITLE) + lineBox(13);
  height += ruleHeight();
  height += lineBox(BASE) + lineBox(SMALL) * 3;
  height += 10 + 1 + lineBox(SMALL) + 8 + 1; // cabeçalho NOME/VALOR: respiro, traços e respiro de baixo
  for (const person of people) {
    const breakdown = breakdowns.get(person.id)!;
    height += 16 + lineBox(BASE); // respiro da linha + nome/valor
    height +=
      breakdown.items.length === 0
        ? lineBox(TINY)
        : 4 + (breakdown.items.length + 1) * lineBox(SMALL);
  }
  height += people.length > 0 ? (people.length - 1) * 1 : 0; // traços entre pessoas
  height += ruleHeight() + lineBox(BASE) * 2 + ruleHeight(10, "double") + lineBox(16);
  height += ruleHeight() + lineBox(SMALL);

  const date = formatReceiptDate(bill.closed_at ?? bill.created_at);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: `${s(PAD_Y)}px ${s(PAD_X)}px`,
          backgroundColor: PAPER,
          color: INK,
          fontFamily: "Courier Prime",
        }}
      >
        {titleLines.map((line, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "center",
              height: s(lineBox(TITLE)),
              fontSize: s(TITLE),
              fontWeight: 700,
            }}
          >
            {line}
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            height: s(lineBox(13)),
            lineHeight: LINE_HEIGHT,
            fontSize: s(13),
            color: MUTED,
          }}
        >
          DIVIDE/AI · CONTA #<Digits>{String(billNumber).padStart(3, "0")}</Digits>
        </div>

        <Rule />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            height: s(lineBox(BASE)),
            fontSize: s(BASE),
            fontWeight: 700,
          }}
        >
          CUPOM DE RATEIO
        </div>
        <Row fontSize={SMALL} left="DATA" right={<Digits>{date}</Digits>} />
        <Row
          fontSize={SMALL}
          left={
            <>
              PESSOAS:&nbsp;<Digits>{String(people.length)}</Digits>
            </>
          }
        />
        <Row fontSize={SMALL} left={`GARÇOM: ${waiterForBill(bill.id).toUpperCase()}`} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(10),
            borderTop: `${s(1)}px dashed ${RULE}`,
            borderBottom: `${s(1)}px dashed ${RULE}`,
            paddingBottom: s(8),
          }}
        >
          <Row fontSize={SMALL} left="NOME" right="VALOR" />
        </div>

        {people.map((person, index) => {
          const breakdown = breakdowns.get(person.id)!;
          return (
            <div
              key={person.id}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingTop: s(8),
                paddingBottom: s(8),
                borderTop: index > 0 ? `${s(1)}px dashed ${RULE}80` : "none",
              }}
            >
              <Row
                fontSize={BASE}
                bold
                left={truncate(person.name.toUpperCase(), nameChars)}
                right={<Digits>{formatCurrency(breakdown.totalCents)}</Digits>}
              />
              {breakdown.items.length === 0 ? (
                <Row fontSize={TINY} color={MUTED} left="não consumiu nada" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", marginTop: s(4) }}>
                  {breakdown.items.map((item) => (
                    <Row
                      key={item.id}
                      fontSize={SMALL}
                      indent={12}
                      left={
                        <>
                          <Digits>{`${item.myParts}/${item.totalParts}`}</Digits>
                          &nbsp;
                          {truncate(item.description, itemChars(`${item.myParts}/${item.totalParts}`))}
                        </>
                      }
                      right={<Digits>{formatCurrency(item.amountCents)}</Digits>}
                    />
                  ))}
                  <Row
                    fontSize={SMALL}
                    indent={12}
                    color={MUTED}
                    left={
                      <>
                        + taxa&nbsp;<Digits>{`${bill.service_tax_percent}%`}</Digits>
                      </>
                    }
                    right={
                      <Digits>{formatCurrency(breakdown.totalCents - breakdown.subtotalCents)}</Digits>
                    }
                  />
                </div>
              )}
            </div>
          );
        })}

        <Rule />
        <Row fontSize={BASE} left="SUBTOTAL" right={<Digits>{formatCurrency(subtotalCents)}</Digits>} />
        <Row
          fontSize={BASE}
          left={
            <>
              TAXA SERVIÇO&nbsp;<Digits>{`${bill.service_tax_percent}%`}</Digits>
            </>
          }
          right={<Digits>{formatCurrency(totalCents - subtotalCents)}</Digits>}
        />
        <Rule style="double" />
        <Row fontSize={16} bold left="TOTAL" right={<Digits>{formatCurrency(totalCents)}</Digits>} />
        <Rule />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            height: s(lineBox(SMALL)),
            fontSize: s(SMALL),
          }}
        >
          OBRIGADO E VOLTE SEMPRE
        </div>
      </div>
    ),
    {
      width: s(WIDTH),
      height: Math.ceil(s(height)),
      fonts: [
        { name: "Courier Prime", data: courierRegular, weight: 400, style: "normal" },
        { name: "Courier Prime", data: courierBold, weight: 700, style: "normal" },
        { name: "DotGothic16", data: dotGothic, weight: 400, style: "normal" },
      ],
      headers: {
        // Conta paga não muda mais; privado porque depende de quem pode ver.
        "Cache-Control": "private, max-age=3600",
      },
    },
  );
}
