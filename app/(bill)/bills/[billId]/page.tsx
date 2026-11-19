import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function BillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  await connection();
  const { billId } = await params;
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("bills")
    .select("id, status")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  // Conta fechada é só o cupom: não há mais o que editar em Itens/Mesa.
  redirect(
    bill.status === "closed"
      ? `/bills/${billId}/summary`
      : `/bills/${billId}/items`,
  );
}
