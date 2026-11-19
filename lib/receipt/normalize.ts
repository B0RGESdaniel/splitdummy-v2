import type { ExtractedReceiptItem } from "./schema";

export const MAX_DESCRIPTION_LENGTH = 24;

const LOWERCASE_WORDS = new Set([
  "a", "à", "ao", "aos", "as", "com", "da", "das", "de", "do", "dos",
  "e", "em", "na", "nas", "no", "nos", "o", "os", "p/", "s/", "c/",
]);

function capitalize(word: string): string {
  return word
    .split("-")
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
    .join("-");
}

/**
 * Reforço do prompt: se o modelo ainda devolver a descrição em CAIXA ALTA
 * (como sai impressa no cupom), converte pra Capitalize em pt-BR, mantendo
 * artigos/preposições minúsculos. Texto que já vem com minúsculas é
 * respeitado como está.
 */
export function toDisplayCase(text: string): string {
  if (text !== text.toLocaleUpperCase("pt-BR")) {
    return text;
  }

  return text
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word) ? word : capitalize(word),
    )
    .join(" ");
}

/**
 * Corta no último espaço antes do limite, pra não partir palavra no meio, e
 * descarta artigo/preposição que sobrar pendurado no fim ("Picanha na Chapa
 * com" → "Picanha na Chapa").
 */
export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) {
    return text;
  }

  // Olha um caractere além do limite: se ele for espaço, a palavra que
  // termina exatamente no limite cabe inteira.
  const lastSpace = text.slice(0, MAX_DESCRIPTION_LENGTH + 1).lastIndexOf(" ");
  if (lastSpace <= 0) {
    return text.slice(0, MAX_DESCRIPTION_LENGTH).trim();
  }

  const words = text.slice(0, lastSpace).trim().split(" ");
  while (words.length > 1 && LOWERCASE_WORDS.has(words[words.length - 1].toLocaleLowerCase("pt-BR"))) {
    words.pop();
  }
  return words.join(" ");
}

export function normalizeDescription(text: string): string {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return truncateDescription(toDisplayCase(collapsed));
}

export function normalizeExtractedItems(
  items: ExtractedReceiptItem[],
): ExtractedReceiptItem[] {
  return items.map((item) => ({
    ...item,
    description: normalizeDescription(item.description),
  }));
}
