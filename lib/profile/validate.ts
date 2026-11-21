import { AVATAR_KEYS, type AvatarKey } from "@/components/bills/avatar-icon";
import { MAX_FIRST_NAME_LENGTH } from "@/lib/auth/first-name";

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as string[]).includes(value);
}

// Perfil guarda só o primeiro nome, como o que vem do Google: é o que cabe na
// mesa. null = vazio ou longo demais.
export function normalizeFirstName(raw: string): string | null {
  const firstName = raw.trim().split(/\s+/)[0] ?? "";
  if (!firstName || firstName.length > MAX_FIRST_NAME_LENGTH) {
    return null;
  }
  return firstName;
}
