import { describe, expect, it } from "vitest";
import { calculateBillTotals, itemTotalCents, splitPartsCents } from "./calculate";

describe("itemTotalCents", () => {
  it("multiplica quantidade por preço unitário e converte para centavos", () => {
    expect(itemTotalCents({ quantity: 2, unitPrice: 10.5 })).toBe(2100);
  });

  it("arredonda quantidades fracionárias (quantity numeric(10,3))", () => {
    expect(itemTotalCents({ quantity: 1.5, unitPrice: 9.99 })).toBe(1499);
  });
});

describe("splitPartsCents", () => {
  it("divide igualmente quando as partes são iguais e o total é exato", () => {
    const result = splitPartsCents(300, [
      { profileId: "a", parts: 1 },
      { profileId: "b", parts: 1 },
      { profileId: "c", parts: 1 },
    ]);
    expect([...result.values()]).toEqual([100, 100, 100]);
  });

  it("distribui o resto pelo maior resto quando a divisão não é exata", () => {
    const result = splitPartsCents(100, [
      { profileId: "a", parts: 1 },
      { profileId: "b", parts: 1 },
      { profileId: "c", parts: 1 },
    ]);
    const total = [...result.values()].reduce((sum, v) => sum + v, 0);
    expect(total).toBe(100);
    expect(result.get("a")).toBe(34);
    expect(result.get("b")).toBe(33);
    expect(result.get("c")).toBe(33);
  });

  it("respeita a proporção das partes, não só a ordem", () => {
    const result = splitPartsCents(1000, [
      { profileId: "a", parts: 1 },
      { profileId: "b", parts: 2 },
      { profileId: "c", parts: 3 },
    ]);
    expect(result.get("a")).toBe(167);
    expect(result.get("b")).toBe(333);
    expect(result.get("c")).toBe(500);
    expect([...result.values()].reduce((sum, v) => sum + v, 0)).toBe(1000);
  });

  it("dá o total inteiro a um único participante", () => {
    const result = splitPartsCents(777, [{ profileId: "a", parts: 5 }]);
    expect(result.get("a")).toBe(777);
  });

  it("participante com 0 partes não recebe nada, mas não impede a divisão", () => {
    const result = splitPartsCents(100, [
      { profileId: "a", parts: 0 },
      { profileId: "b", parts: 1 },
    ]);
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(100);
  });

  it("lança erro quando nenhum participante tem partes", () => {
    expect(() =>
      splitPartsCents(100, [
        { profileId: "a", parts: 0 },
        { profileId: "b", parts: 0 },
      ]),
    ).toThrow("nenhum participante com partes maiores que zero");
  });

  it("lança erro com partes inválidas", () => {
    expect(() => splitPartsCents(100, [{ profileId: "a", parts: -1 }])).toThrow();
  });
});

describe("calculateBillTotals", () => {
  it("agrega o total de múltiplos itens por participante", () => {
    const totals = calculateBillTotals([
      {
        id: "item-1",
        quantity: 1,
        unitPrice: 10,
        shares: [
          { profileId: "a", parts: 1 },
          { profileId: "b", parts: 1 },
        ],
      },
      {
        id: "item-2",
        quantity: 1,
        unitPrice: 20,
        shares: [{ profileId: "a", parts: 1 }],
      },
    ]);

    expect(totals.get("a")).toBe(500 + 2000);
    expect(totals.get("b")).toBe(500);
  });

  it("ignora itens ainda sem partes atribuídas", () => {
    const totals = calculateBillTotals([
      { id: "item-1", quantity: 1, unitPrice: 10, shares: [] },
      {
        id: "item-2",
        quantity: 1,
        unitPrice: 20,
        shares: [{ profileId: "a", parts: 1 }],
      },
    ]);

    expect(totals.size).toBe(1);
    expect(totals.get("a")).toBe(2000);
  });
});
