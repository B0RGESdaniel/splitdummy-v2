import { describe, expect, it } from "vitest";
import {
  MAX_DESCRIPTION_LENGTH,
  normalizeDescription,
  normalizeExtractedItems,
  toDisplayCase,
  truncateDescription,
} from "./normalize";

describe("toDisplayCase", () => {
  it("converte CAIXA ALTA pra Capitalize", () => {
    expect(toDisplayCase("CHOPP BRAHMA")).toBe("Chopp Brahma");
  });

  it("mantém preposições minúsculas no meio, mas não no início", () => {
    expect(toDisplayCase("PORÇÃO DE FRITAS COM CHEDDAR")).toBe(
      "Porção de Fritas com Cheddar",
    );
    expect(toDisplayCase("A MODA DA CASA")).toBe("A Moda da Casa");
  });

  it("trata acentos e cedilha do pt-BR", () => {
    expect(toDisplayCase("ÁGUA SEM GÁS")).toBe("Água Sem Gás");
  });

  it("capitaliza cada parte de palavras hifenizadas", () => {
    expect(toDisplayCase("COCA-COLA LATA")).toBe("Coca-Cola Lata");
  });

  it("deixa números e unidades em minúsculo", () => {
    expect(toDisplayCase("HEINEKEN 600ML")).toBe("Heineken 600ml");
  });

  it("respeita texto que já vem com minúsculas", () => {
    expect(toDisplayCase("Caipirinha de limão")).toBe("Caipirinha de limão");
  });
});

describe("truncateDescription", () => {
  it("não mexe em texto dentro do limite", () => {
    expect(truncateDescription("Chopp Brahma")).toBe("Chopp Brahma");
  });

  it("corta no último espaço antes do limite", () => {
    const long = "Picanha na Chapa com Arroz Feijão Farofa e Vinagrete";
    const result = truncateDescription(long);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(result).toBe("Picanha na Chapa");
  });

  it("corta seco quando não há espaço", () => {
    const result = truncateDescription("x".repeat(60));
    expect(result).toHaveLength(MAX_DESCRIPTION_LENGTH);
  });
});

describe("normalizeDescription", () => {
  it("colapsa espaços repetidos antes de normalizar", () => {
    expect(normalizeDescription("  CHOPP   BRAHMA  ")).toBe("Chopp Brahma");
  });
});

describe("normalizeExtractedItems", () => {
  it("normaliza só a descrição, preservando quantidade e preço", () => {
    expect(
      normalizeExtractedItems([
        { description: "CHOPP BRAHMA", quantity: 3, unitPrice: 12.5 },
      ]),
    ).toEqual([{ description: "Chopp Brahma", quantity: 3, unitPrice: 12.5 }]);
  });
});
