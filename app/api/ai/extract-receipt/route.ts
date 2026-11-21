import { NextResponse, type NextRequest } from "next/server";
import { generateText, Output } from "ai";

import { MAX_ITEM_DESCRIPTION_LENGTH } from "@/lib/bill/item-description";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { extractedReceiptSchema } from "@/lib/receipt/schema";
import { normalizeExtractedItems } from "@/lib/receipt/normalize";

const EXTRACTION_MODEL = "google/gemini-2.5-flash-lite";

// O cliente já comprime pra JPEG de até 1600px (~300–600 KB); esses
// limites só barram quem chama a rota direto, fora do app.
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// 50 itens (teto do schema) × ~30 tokens cada, com folga. Se a resposta
// for cortada, o parse do schema falha e cai no erro 422 abaixo.
const MAX_OUTPUT_TOKENS = 2000;

const MAX_EXTRACTIONS_PER_BILL = 5;
const MAX_EXTRACTIONS_PER_USER_PER_DAY = 20;

const EXTRACTION_PROMPT = `Você está lendo a foto de um cupom fiscal de bar ou restaurante brasileiro.

Extraia cada item consumido como uma linha, com: descrição, quantidade, e preço unitário em reais (R$).

Regras:
- A descrição é o nome curto do item como apareceria num cardápio, em Capitalize (só a primeira letra de cada palavra maiúscula, preposições em minúsculo), sem códigos internos, abreviações truncadas ou CAIXA ALTA, com no máximo ${MAX_ITEM_DESCRIPTION_LENGTH} caracteres (é o que cabe na lista do app). Se não couber, priorize o nome do produto e descarte detalhes como tamanho ou embalagem, sem abreviar palavras. Ex.: "CERV HEINEKEN LN 330ML" vira "Heineken Long Neck"; "PICANHA NA CHAPA C/ ARROZ FEIJAO FAROFA" vira "Picanha na Chapa".
- Ignore linhas de subtotal, total, taxa de serviço, troco, forma de pagamento, CNPJ e outros dados fiscais — só itens consumidos.
- Se um item for vendido por peso (kg) em vez de unidade, use quantity: 1 e unitPrice como o valor total daquele item.
- Se a mesma descrição aparecer em mais de uma linha do cupom, mantenha como linhas separadas — não some.
- Se não conseguir ler a foto com confiança (borrada, cortada, iluminação ruim, ou não é um cupom fiscal), retorne items como uma lista vazia em vez de inventar valores.`;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const billId = String(formData.get("billId") ?? "");
  const photo = formData.get("photo");

  if (!billId || !(photo instanceof File)) {
    return NextResponse.json(
      { error: "Envie uma foto e o id da conta." },
      { status: 400 },
    );
  }

  if (!ACCEPTED_PHOTO_TYPES.has(photo.type)) {
    return NextResponse.json(
      { error: "Formato de imagem não suportado." },
      { status: 415 },
    );
  }

  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "Foto grande demais." },
      { status: 413 },
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [{ data: bill }, { data: participant }] = await Promise.all([
    supabase.from("bills").select("status").eq("id", billId).single(),
    supabase
      .from("bill_participants")
      .select("id")
      .eq("bill_id", billId)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (!bill || bill.status !== "open" || !participant) {
    return NextResponse.json(
      { error: "Conta não encontrada, já paga, ou você não participa dela." },
      { status: 403 },
    );
  }

  // Contagem via service-role: pela RLS o usuário só enxerga `receipts`
  // das contas de que ainda participa — sair de uma conta zeraria o
  // contador diário dele. Duas requisições simultâneas ainda podem passar
  // juntas pelo teto; aceito como limitação conhecida.
  const serviceRole = createServiceRoleClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [billCount, userCount] = await Promise.all([
    serviceRole
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("bill_id", billId),
    serviceRole
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", userId)
      .gte("created_at", oneDayAgo),
  ]);

  if (billCount.error || userCount.error) {
    return NextResponse.json(
      { error: "Não foi possível ler o cupom agora. Tente de novo." },
      { status: 500 },
    );
  }

  if ((billCount.count ?? 0) >= MAX_EXTRACTIONS_PER_BILL) {
    return NextResponse.json(
      {
        error: `Essa conta já usou as ${MAX_EXTRACTIONS_PER_BILL} leituras de cupom disponíveis. Adicione os itens à mão.`,
      },
      { status: 429 },
    );
  }

  if ((userCount.count ?? 0) >= MAX_EXTRACTIONS_PER_USER_PER_DAY) {
    return NextResponse.json(
      {
        error: "Você atingiu o limite diário de leituras de cupom. Tente amanhã ou adicione os itens à mão.",
      },
      { status: 429 },
    );
  }

  // Grava antes de chamar a IA: uma chamada que falha também gasta token
  // e precisa contar pro teto acima.
  const { data: receipt, error: insertError } = await supabase
    .from("receipts")
    .insert({
      bill_id: billId,
      uploaded_by: userId,
      ai_model: EXTRACTION_MODEL,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !receipt) {
    return NextResponse.json(
      { error: "Não foi possível ler o cupom agora. Tente de novo." },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await photo.arrayBuffer());

  try {
    const { output } = await generateText({
      model: EXTRACTION_MODEL,
      reasoning: "none",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      output: Output.object({ schema: extractedReceiptSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "file",
              mediaType: photo.type,
              data: buffer,
            },
          ],
        },
      ],
    });

    const { error: updateError } = await supabase
      .from("receipts")
      .update({ ai_raw_result: output })
      .eq("id", receipt.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Itens extraídos, mas não deu pra salvar o registro de auditoria." },
        { status: 500 },
      );
    }

    // `ai_raw_result` guarda a saída crua do modelo (auditoria); só a
    // resposta pro cliente passa pela normalização.
    return NextResponse.json({
      receiptId: receipt.id,
      items: normalizeExtractedItems(output.items),
    });
  } catch (error) {
    console.error("extract-receipt: falha na extração", error);
    await supabase
      .from("receipts")
      .update({ status: "failed" })
      .eq("id", receipt.id);

    return NextResponse.json(
      {
        error:
          "Não consegui ler essa foto. Tente outra, bem iluminada e sem cortar o cupom.",
      },
      { status: 422 },
    );
  }
}
