import { redirect } from "next/navigation";
import { connection } from "next/server";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await connection();
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(next ?? "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Splitdummy</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleSignInButton next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
