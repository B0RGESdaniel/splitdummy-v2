import { describe, expect, it } from "vitest";

import { charsPerLine, truncate, wrapLines } from "./wrap";

describe("charsPerLine", () => {
  it("conta caracteres de 0,6em que cabem na largura", () => {
    expect(charsPerLine(300, 10)).toBe(50);
    expect(charsPerLine(320, 18)).toBe(29);
  });
});

describe("wrapLines", () => {
  it("mantém numa linha o que cabe", () => {
    expect(wrapLines("Fofoca", 29)).toEqual(["Fofoca"]);
  });

  it("quebra por palavra", () => {
    expect(wrapLines("Aniversário do Léo no bar", 12)).toEqual(["Aniversário", "do Léo no", "bar"]);
  });

  it("parte palavra maior que a linha", () => {
    expect(wrapLines("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("texto vazio ainda ocupa uma linha", () => {
    expect(wrapLines("   ", 10)).toEqual([""]);
  });
});

describe("truncate", () => {
  it("corta com reticências só o que passa do limite", () => {
    expect(truncate("Bia", 5)).toBe("Bia");
    expect(truncate("Maria Eduarda", 6)).toBe("Maria…");
  });
});
