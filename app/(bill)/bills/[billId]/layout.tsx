import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Archivo_Narrow, Bitter, Caveat } from "next/font/google";

import Link from "next/link";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { ThemeScope } from "@/components/theme-scope";
import { createClient } from "@/lib/supabase/server";

// This route group has no shared ancestor with app/(dashboard)/layout.tsx
// (different top-level group, so it gets its own paper-world chrome instead
// of the dashboard's), so it repeats the auth-gate redirect check here.
export const instant = false;

const bitter = Bitter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-check-base",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default async function BillLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ billId: string }>;
}) {
  await connection();
  const { billId } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    redirect("/login");
  }
  const userId = claims.claims.sub;

  const { data: bill } = await supabase
    .from("bills")
    .select("id, name, status, owner_id, profiles(display_name)")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const isOwner = userId === bill.owner_id;

  const [invite, { count: participantCount }] = await Promise.all([
    isOwner ? getOrCreateActiveInvite(billId) : Promise.resolve(null),
    supabase
      .from("bill_participants")
      .select("id", { count: "exact", head: true })
      .eq("bill_id", billId),
  ]);

  return (
    <ThemeScope
      className={`${bitter.variable} ${caveat.variable} ${archivoNarrow.variable} paper-check flex flex-1 flex-col items-center bg-background text-foreground`}
    >
      <div className="flex w-full max-w-md flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-dashed border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground">
              {bill.name}
            </h1>
            <SignOutButton />
          </div>

          <div className="px-4 py-3">
            <div className="grid grid-cols-[1fr_1fr_auto] border-[1.5px] border-foreground text-xs">
              <div className="border-r-[1.5px] border-foreground px-3 py-2">
                <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Dono
                </div>
                <div className="truncate font-medium">
                  {bill.profiles?.display_name ?? "—"}
                </div>
              </div>
              <Link
                href={`/bills/${billId}/participants`}
                className="border-r-[1.5px] border-foreground px-3 py-2 hover:bg-muted"
              >
                <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Participantes
                </div>
                <div className="font-medium">{participantCount ?? 0}</div>
              </Link>
              <div className="flex items-center px-3 py-2">
                <BillStatusBadge isOpen={bill.status === "open"} />
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center justify-center border-t border-dashed border-border px-4 py-2">
              <InviteQrPanel billId={billId} invite={invite} />
            </div>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </div>
    </ThemeScope>
  );
}
