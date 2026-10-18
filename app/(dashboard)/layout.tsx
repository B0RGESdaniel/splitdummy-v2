import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

// Every route under here is an auth-gated redirect check — it must block
// on the session lookup rather than being prerendered/streamed.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Splitdummy</span>
        <SignOutButton />
      </header>
      <main className="flex flex-1 flex-col p-4">{children}</main>
    </div>
  );
}
