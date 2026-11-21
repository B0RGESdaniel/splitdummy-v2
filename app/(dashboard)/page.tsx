import { BalcaoComanda, BalcaoCupom } from "@/components/bills/balcao-papers";
import { CreateBillDialog } from "@/components/bills/create-bill-dialog";
import { openBillPartialCents, paidBillTotals } from "@/lib/bill/bill-totals";
import { getProfile, getSupabase, requireUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// O balcão espera os dados antes de aparecer, sem esqueleto: a comanda que
// volta da conta pelo ← encolhe até o lugar dela, e esse lugar tem de existir
// no momento da troca de tela.
export const instant = false;

// Fuso explícito: o servidor roda em UTC, e a comanda mostra a hora local.
const openedAtFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const paidAtFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function groupByBill<T extends { bill_id: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.bill_id) ?? [];
    list.push(row);
    groups.set(row.bill_id, list);
  }
  return groups;
}


function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="flex items-baseline justify-between border-b border-[color:var(--balcao-line)] pb-1.5 text-xs font-semibold tracking-[0.12em] text-[color:var(--balcao-soft)]">
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </h2>
  );
}

export default async function DashboardPage() {
  const userId = await requireUser("/");
  const supabase = await getSupabase();

  const [profile, { data: bills }] = await Promise.all([
    getProfile(userId),
    supabase
      .from("bills")
      .select(
        "id, name, status, owner_id, service_tax_percent, created_at, closed_at, profiles(display_name)",
      )
      .order("created_at", { ascending: false }),
  ]);

  const billList = bills ?? [];
  const billIds = billList.map((bill) => bill.id);
  const ownerIds = [...new Set(billList.map((bill) => bill.owner_id))];

  // Uma query por tabela pra todas as contas de uma vez (sem N+1).
  const [{ data: participants }, { data: items }, { data: shares }, { data: ownerBills }] =
    billIds.length
      ? await Promise.all([
          supabase.from("bill_participants").select("id, bill_id, profile_id").in("bill_id", billIds),
          supabase.from("items").select("id, bill_id, unit_price, quantity").in("bill_id", billIds),
          supabase
            .from("item_shares")
            .select("bill_id, item_id, participant_id, parts")
            .in("bill_id", billIds),
          // Número da conta = posição entre as contas do dono, como no cupom
          // do Resumo. Service-role porque o participante não enxerga (por
          // RLS) as outras contas do dono; só id/dono/data saem daqui.
          createServiceRoleClient()
            .from("bills")
            .select("id, owner_id, created_at")
            .in("owner_id", ownerIds)
            .order("created_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const participantsByBill = groupByBill(participants ?? []);
  const itemsByBill = groupByBill(items ?? []);
  const sharesByBill = groupByBill(shares ?? []);

  const billNumbers = new Map<string, number>();
  const countByOwner = new Map<string, number>();
  for (const bill of ownerBills ?? []) {
    const next = (countByOwner.get(bill.owner_id) ?? 0) + 1;
    countByOwner.set(bill.owner_id, next);
    billNumbers.set(bill.id, next);
  }

  const openBills = billList.filter((bill) => bill.status === "open");
  const paidBills = billList
    .filter((bill) => bill.status === "closed")
    .sort((a, b) => (b.closed_at ?? b.created_at).localeCompare(a.closed_at ?? a.created_at));

  const firstName = profile?.display_name?.split(" ")[0];

  let entranceIndex = 0;
  const entrance = () => ({ "--i": entranceIndex++ }) as React.CSSProperties;

  return (
    <div className="contents">
      <h1 className="text-xl font-semibold tracking-[0.04em]">
        {firstName ? `Olá, ${firstName}` : "Olá"}
      </h1>

      <section className="flex flex-col gap-3.5">
        {openBills.length > 0 && <SectionHeading label="Abertas" count={openBills.length} />}

        {openBills.map((bill) => {
          const billParticipants = participantsByBill.get(bill.id) ?? [];
          return (
            <div key={bill.id} className="balcao-entrada" style={entrance()}>
              <BalcaoComanda
                billId={bill.id}
                name={bill.name}
                number={billNumbers.get(bill.id) ?? 1}
                ownerFirstName={bill.profiles?.display_name?.split(" ")[0] ?? "—"}
                participantCount={billParticipants.length}
                openedAt={openedAtFormat.format(new Date(bill.created_at)).replace(",", " ·")}
                partialCents={openBillPartialCents(
                  itemsByBill.get(bill.id) ?? [],
                  bill.service_tax_percent,
                )}
              />
            </div>
          );
        })}

        {billList.length === 0 && (
          <p className="text-sm text-[color:var(--balcao-soft)]">
            Nenhuma conta por aqui ainda. Abra uma comanda e chame a mesa pelo link.
          </p>
        )}

        <div className="balcao-entrada" style={entrance()}>
          <CreateBillDialog />
        </div>
      </section>

      {paidBills.length > 0 && (
        <section className="flex flex-col gap-7">
          <SectionHeading label="Pagas" count={paidBills.length} />

          {paidBills.map((bill) => {
            const billParticipants = participantsByBill.get(bill.id) ?? [];
            const { totalCents, ownCents } = paidBillTotals(
              itemsByBill.get(bill.id) ?? [],
              sharesByBill.get(bill.id) ?? [],
              billParticipants.map((participant) => participant.id),
              billParticipants.find((participant) => participant.profile_id === userId)?.id ??
                null,
              bill.service_tax_percent,
            );
            return (
              <div key={bill.id} className="balcao-entrada" style={entrance()}>
                <BalcaoCupom
                  billId={bill.id}
                  name={bill.name}
                  number={billNumbers.get(bill.id) ?? 1}
                  paidAt={paidAtFormat.format(new Date(bill.closed_at ?? bill.created_at))}
                  participantCount={billParticipants.length}
                  totalCents={totalCents}
                  ownCents={ownCents}
                />
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
