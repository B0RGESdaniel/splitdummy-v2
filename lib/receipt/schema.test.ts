import { describe, expect, it } from "vitest";
import { extractedReceiptSchema } from "./schema";

describe("extractedReceiptSchema", () => {
  it("aceita um item completo e válido", () => {
    const result = extractedReceiptSchema.safeParse({
      items: [{ description: "Cerveja long neck", quantity: 2, unitPrice: 12.5 }],
    });
    expect(result.success).toBe(true);
  });

  it("aceita lista vazia (a IA pode não encontrar nenhum item)", () => {
    const result = extractedReceiptSchema.safeParse({ items: [] });
    expect(result.success).toBe(true);
  });

  it("rejeita item sem descrição", () => {
    const result = extractedReceiptSchema.safeParse({
      items: [{ description: "", quantity: 1, unitPrice: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quantidade zero ou negativa", () => {
    const result = extractedReceiptSchema.safeParse({
      items: [{ description: "Água", quantity: 0, unitPrice: 5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita preço unitário negativo", () => {
    const result = extractedReceiptSchema.safeParse({
      items: [{ description: "Água", quantity: 1, unitPrice: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it("aceita preço unitário zero (cortesia/brinde)", () => {
    const result = extractedReceiptSchema.safeParse({
      items: [{ description: "Couvert", quantity: 1, unitPrice: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita mais de 50 itens", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      description: `Item ${i}`,
      quantity: 1,
      unitPrice: 1,
    }));
    const result = extractedReceiptSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it("aceita exatamente 50 itens", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      description: `Item ${i}`,
      quantity: 1,
      unitPrice: 1,
    }));
    const result = extractedReceiptSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });
});
