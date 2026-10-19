import { describe, expect, it } from "vitest";
import { validatePartsShares } from "./validate";

describe("validatePartsShares", () => {
  it("aceita partes válidas com ao menos um participante > 0", () => {
    const result = validatePartsShares([
      { profileId: "a", parts: 1 },
      { profileId: "b", parts: 2 },
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("aceita participante com 0 partes desde que outro tenha partes", () => {
    const result = validatePartsShares([
      { profileId: "a", parts: 0 },
      { profileId: "b", parts: 1 },
    ]);
    expect(result.valid).toBe(true);
  });

  it("rejeita quando nenhum participante tem partes > 0", () => {
    const result = validatePartsShares([
      { profileId: "a", parts: 0 },
      { profileId: "b", parts: 0 },
    ]);
    expect(result).toEqual({
      valid: false,
      reason: "nenhum participante com partes maiores que zero",
    });
  });

  it("rejeita lista vazia", () => {
    const result = validatePartsShares([]);
    expect(result.valid).toBe(false);
  });

  it("rejeita partes negativas", () => {
    const result = validatePartsShares([{ profileId: "a", parts: -1 }]);
    expect(result.valid).toBe(false);
  });

  it("rejeita partes não inteiras", () => {
    const result = validatePartsShares([{ profileId: "a", parts: 1.5 }]);
    expect(result.valid).toBe(false);
  });

  it("rejeita participante duplicado", () => {
    const result = validatePartsShares([
      { profileId: "a", parts: 1 },
      { profileId: "a", parts: 2 },
    ]);
    expect(result).toEqual({ valid: false, reason: "participante duplicado: a" });
  });
});
