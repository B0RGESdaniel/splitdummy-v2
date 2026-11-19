import { describe, expect, it } from "vitest";

import { openBillPartialCents, paidBillTotals } from "./bill-totals";

const cerveja = { id: "x", unit_price: 12.5, quantity: 4 };
const batata = { id: "y", unit_price: 30, quantity: 1 };

describe("openBillPartialCents", () => {
  it("soma todos os itens, divididos ou não, com a taxa", () => {
    expect(openBillPartialCents([cerveja, batata], 10)).toBe(8800);
  });

  it("conta vazia é zero", () => {
    expect(openBillPartialCents([], 10)).toBe(0);
  });
});

describe("paidBillTotals", () => {
  const shares = [
    { item_id: "x", participant_id: "a", parts: 1 },
    { item_id: "x", participant_id: "b", parts: 1 },
    { item_id: "y", participant_id: "b", parts: 1 },
  ];

  it("total é a soma das parciais e a parte própria sai da parcial de quem vê", () => {
    const result = paidBillTotals([cerveja, batata], shares, ["a", "b"], "a", 10);
    expect(result).toEqual({ totalCents: 8800, ownCents: 2750 });
  });

  it("sem participante próprio, a parte é zero", () => {
    const result = paidBillTotals([cerveja, batata], shares, ["a", "b"], null, 0);
    expect(result.ownCents).toBe(0);
  });
});
