import type { AvatarKey } from "@/components/bills/avatar-icon";

export type BillParticipant = {
  participant_id: string;
  display_name: string | undefined;
  avatar_key: AvatarKey | null;
  is_self: boolean;
};

type ParticipantRow = {
  id: string;
  profile_id: string | null;
  display_name: string | null;
  avatar_key: string | null;
  profiles: { display_name: string | null; avatar_key: string | null } | null;
};

// Linhas já vêm em ordem de entrada (joined_at); quem está vendo sobe pro
// topo, pra achar o próprio valor sem procurar. A Mesa não usa isto: lá a
// posição do assento é a metáfora, então a ordem de entrada é mantida.
export function toBillParticipantsSelfFirst(
  rows: ParticipantRow[],
  userId: string | undefined,
): BillParticipant[] {
  const participants = rows.map((row) => ({
    participant_id: row.id,
    display_name: row.display_name ?? row.profiles?.display_name ?? undefined,
    avatar_key: (row.avatar_key ?? row.profiles?.avatar_key ?? null) as AvatarKey | null,
    is_self: userId !== undefined && row.profile_id === userId,
  }));

  return [
    ...participants.filter((p) => p.is_self),
    ...participants.filter((p) => !p.is_self),
  ];
}
