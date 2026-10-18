import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
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
    .select("id, name, status, service_tax_percent")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{bill.name}</h1>
        <Badge variant={bill.status === "open" ? "default" : "secondary"}>
          {bill.status === "open" ? "aberta" : "fechada"}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Convite, itens e divisão vão aparecer aqui nos próximos passos.
      </p>
    </div>
  );
}
