import { redirect } from "next/navigation";
import { connection } from "next/server";

import { WelcomeForm } from "@/components/auth/welcome-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

// Primeiro acesso: nome e avatar, os dois obrigatórios. Quem já tem os dois
// segue direto pro destino.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await connection();
  const next = safeNextPath((await searchParams).next);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_key")
    .eq("id", userId)
    .single();

  if (profile?.display_name.trim() && profile.avatar_key) {
    redirect(next);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Boas-vindas ao Divide/ai</CardTitle>
        </CardHeader>
        <CardContent>
          <WelcomeForm defaultName={profile?.display_name ?? ""} next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
