import { NextResponse, type NextRequest } from "next/server";

import { isAvatarKey, normalizeFirstName } from "@/lib/profile/validate";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const claimParticipantId = formData.get("claim_participant_id");

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

  // Perfil sem nome ou avatar confirma os dois na folha do convite (vazios
  // pra quem não está na lista, preenchidos com os do convidado reivindicado).
  const hasProfileFields = formData.has("display_name");
  if (hasProfileFields) {
    const firstName = normalizeFirstName(String(formData.get("display_name") ?? ""));
    const avatarKey = String(formData.get("avatar_key") ?? "");

    if (!firstName || !isAvatarKey(avatarKey)) {
      return NextResponse.redirect(`${origin}/join/${token}?erro=perfil`);
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: firstName, avatar_key: avatarKey })
      .eq("id", userId);

    if (error) {
      return NextResponse.redirect(`${origin}/join/${token}?erro=perfil`);
    }
  }

  if (claimParticipantId) {
    const { error, data } = await serviceRole
      .from("bill_participants")
      // Quem confirmou nome e avatar passa a aparecer com os do perfil: os do
      // convidado (que o dono escreveu) têm prioridade na mesa e esconderiam
      // o que a pessoa acabou de escolher.
      .update(
        hasProfileFields
          ? { profile_id: userId, display_name: null, avatar_key: null }
          : { profile_id: userId },
      )
      .eq("id", String(claimParticipantId))
      .eq("bill_id", invite.bill_id)
      .is("profile_id", null)
      .select("id");

    if (error || !data?.length) {
      return NextResponse.redirect(`${origin}/join/${token}`);
    }
  } else {
    const { error } = await serviceRole
      .from("bill_participants")
      .upsert(
        { bill_id: invite.bill_id, profile_id: userId },
        { onConflict: "bill_id,profile_id", ignoreDuplicates: true },
      );

    if (error) {
      return NextResponse.redirect(`${origin}/join/${token}`);
    }
  }

  return NextResponse.redirect(`${origin}/bills/${invite.bill_id}`);
}
