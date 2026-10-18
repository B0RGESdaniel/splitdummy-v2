import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold">
        Olá, {profile?.display_name ?? "tudo certo"}
      </h1>
      <p className="text-muted-foreground text-sm">
        Suas contas vão aparecer aqui.
      </p>
    </div>
  );
}
