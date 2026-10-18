import Link from "next/link";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  const { data: profile } = userId
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single()
    : { data: null };

  const { data: bills } = await supabase
    .from("bills")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Olá, {profile?.display_name ?? "tudo certo"}
        </h1>
        <Button asChild>
          <Link href="/bills/new">Nova conta</Link>
        </Button>
      </div>

      {!bills?.length ? (
        <p className="text-muted-foreground text-sm">
          Você ainda não participa de nenhuma conta.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {bills.map((bill) => (
            <Card key={bill.id}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{bill.name}</CardTitle>
                <Badge variant={bill.status === "open" ? "default" : "secondary"}>
                  {bill.status === "open" ? "aberta" : "fechada"}
                </Badge>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                {new Date(bill.created_at).toLocaleDateString("pt-BR")}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
