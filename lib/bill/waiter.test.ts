import { describe, expect, it } from "vitest";

import { WAITER_NICKNAMES, waiterForBill } from "./waiter";

describe("waiterForBill", () => {
  it("é determinístico pro mesmo id", () => {
    const id = "6f1c2b9e-4d3a-4c8e-9a51-2f7d0b6e8c11";
    expect(waiterForBill(id)).toBe(waiterForBill(id));
  });

  it("sempre devolve um apelido da lista", () => {
    for (let i = 0; i < 50; i++) {
      expect(WAITER_NICKNAMES).toContain(waiterForBill(crypto.randomUUID()));
    }
  });

  it("espalha ids diferentes por mais de um apelido", () => {
    const seen = new Set(
      Array.from({ length: 50 }, () => waiterForBill(crypto.randomUUID())),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
