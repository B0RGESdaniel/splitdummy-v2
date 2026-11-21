import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SignInOptions } from "@/components/auth/sign-in-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  await connection();
  const { next, erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(next ?? "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Divide/ai</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {erro === "link" && (
            <p className="text-destructive text-sm">
              Esse link de login venceu ou já foi usado. Peça um código novo.
            </p>
          )}
          <SignInOptions next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
