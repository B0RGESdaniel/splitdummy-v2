import { describe, expect, it } from "vitest";
import { buildParticipantBreakdowns } from "./breakdown";

const cerveja = {
  id: "cerveja",
  description: "Cerveja",
  quantity: 3,
  unitPrice: 10,
  shares: [
    { profileId: "a", parts: 2 },
    { profileId: "b", parts: 1 },
  ],
};

const batata = {
  id: "batata",
  description: "Batata",
  quantity: 1,
  unitPrice: 20,
  shares: [{ profileId: "b", parts: 1 }],
};

describe("buildParticipantBreakdowns", () => {
  it("lista os itens de cada participante com fração e valor", () => {
    const result = buildParticipantBreakdowns([cerveja, batata], ["a", "b"], 0);

    expect(result.get("a")?.items).toEqual([
      {
        id: "cerveja",
        description: "Cerveja",
        quantity: 3,
        myParts: 2,
        totalParts: 3,
        amountCents: 2000,
      },
    ]);
    expect(result.get("b")?.items.map((item) => [item.id, item.amountCents])).toEqual([
      ["cerveja", 1000],
      ["batata", 2000],
    ]);
  });

  it("aplica a taxa de serviço sobre o subtotal", () => {
    const result = buildParticipantBreakdowns([cerveja, batata], ["a", "b"], 10);

    expect(result.get("a")).toMatchObject({ subtotalCents: 2000, totalCents: 2200 });
    expect(result.get("b")).toMatchObject({ subtotalCents: 3000, totalCents: 3300 });
  });

  it("participante sem partes aparece zerado e sem itens", () => {
    const result = buildParticipantBreakdowns([cerveja], ["a", "b", "c"], 10);

    expect(result.get("c")).toEqual({ items: [], subtotalCents: 0, totalCents: 0 });
  });

  it("ignora itens não divididos e partes zeradas", () => {
    const naoDividido = { ...batata, id: "x", shares: [] };
    const zerado = { ...batata, id: "y", shares: [{ profileId: "a", parts: 0 }, { profileId: "b", parts: 1 }] };
    const result = buildParticipantBreakdowns([naoDividido, zerado], ["a", "b"], 0);

    expect(result.get("a")?.items).toEqual([]);
    expect(result.get("b")?.items.map((item) => item.id)).toEqual(["y"]);
  });
});
