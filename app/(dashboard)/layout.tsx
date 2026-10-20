import { redirect } from "next/navigation";
import { connection } from "next/server";

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
  // Defer to request time before touching cookies()/the Supabase client —
  // without this, Next still attempts a static shell and trips on a
  // synchronous Date.now() call inside the Supabase client's init.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-md flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
          <span className="font-semibold">Splitdummy</span>
          <SignOutButton />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </div>
    </div>
  );
}
