import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Archivo_Narrow, Bitter, Caveat } from "next/font/google";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { BillTabs } from "@/components/bills/bill-tabs";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { ReceiptMark } from "@/components/bills/receipt-mark";
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
    .select("id, name, status, owner_id")
    .eq("id", billId)
    .single();

  if (!bill) {
    notFound();
  }

  const isOwner = userId === bill.owner_id;
  const invite = isOwner ? await getOrCreateActiveInvite(billId) : null;

  return (
    <ThemeScope
      className={`${bitter.variable} ${caveat.variable} ${archivoNarrow.variable} paper-check flex flex-1 flex-col items-center bg-background text-foreground`}
    >
      <div className="flex w-full max-w-md flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-dashed border-border bg-background/95 backdrop-blur-sm">
          <div className="relative flex items-center justify-center px-10 py-3">
            <ReceiptMark className="absolute left-4 size-5 text-foreground" />
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground">
              {bill.name}
            </h1>
            <div className="absolute right-4">
              <BillStatusBadge isOpen={bill.status === "open"} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-border px-4 py-2">
            {isOwner ? (
              <InviteQrPanel billId={billId} invite={invite} />
            ) : (
              <span />
            )}
            <SignOutButton />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">
          <BillTabs billId={billId} />

          {children}
        </main>
      </div>
    </ThemeScope>
  );
}
