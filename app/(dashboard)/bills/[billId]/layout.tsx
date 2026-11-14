import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Bitter, Caveat } from "next/font/google";

import { getOrCreateActiveInvite } from "@/app/(dashboard)/bills/actions";
import { BillTabs } from "@/components/bills/bill-tabs";
import { InviteQrPanel } from "@/components/bills/invite-qr-panel";
import { ThemeScope } from "@/components/theme-scope";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const bitter = Bitter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["500", "600"],
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
  const userId = claims?.claims.sub;

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
      className={`${bitter.variable} ${caveat.variable} paper-check flex flex-1 flex-col gap-4 rounded-lg bg-background p-4 text-foreground shadow-md ring-1 ring-black/10`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-border pb-3">
        <h1 className="truncate font-display text-xl font-bold tracking-tight text-foreground">
          {bill.name}
        </h1>
        {isOwner && <InviteQrPanel billId={billId} invite={invite} />}
      </div>

      <BillTabs billId={billId} isOpen={bill.status === "open"} />

      {children}
    </ThemeScope>
  );
}
