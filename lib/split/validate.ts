export type PartsShareInput = {
  profileId: string;
  parts: number;
};

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validatePartsShares(shares: PartsShareInput[]): ValidationResult {
  const seen = new Set<string>();

  for (const share of shares) {
    if (seen.has(share.profileId)) {
      return { valid: false, reason: `participante duplicado: ${share.profileId}` };
    }
    seen.add(share.profileId);

    if (!Number.isInteger(share.parts) || share.parts < 0) {
      return { valid: false, reason: `partes inválidas para ${share.profileId}: ${share.parts}` };
    }
  }

  const totalParts = shares.reduce((sum, share) => sum + share.parts, 0);
  if (totalParts <= 0) {
    return { valid: false, reason: "nenhum participante com partes maiores que zero" };
  }

  return { valid: true };
}
