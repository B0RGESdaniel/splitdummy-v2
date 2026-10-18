import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");

  if (!token) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (!userId) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/join/${token}`)}`,
    );
  }

  const serviceRole = createServiceRoleClient();
  const { data: invite } = await serviceRole
    .from("bill_invites")
    .select("bill_id, bills(status)")
    .eq("token", token)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite || invite.bills?.status !== "open") {
    return NextResponse.redirect(`${origin}/join/${token}`);
  }

  const { error } = await serviceRole
    .from("bill_participants")
    .upsert(
      { bill_id: invite.bill_id, profile_id: userId },
      { onConflict: "bill_id,profile_id", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.redirect(`${origin}/join/${token}`);
  }

  return NextResponse.redirect(`${origin}/bills/${invite.bill_id}`);
}
