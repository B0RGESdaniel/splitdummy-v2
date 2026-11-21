// A imagem do cupom é gerada no servidor (Satori), que exige a altura antes
// de desenhar. Como o texto é Courier Prime (monoespaçada, todo caractere
// com 0,6em de largura), dá pra saber em quantas linhas um texto quebra sem
// medir nada: basta contar caracteres.
export const MONO_ADVANCE_EM = 0.6;

export function charsPerLine(widthPx: number, fontSizePx: number) {
  return Math.max(1, Math.floor(widthPx / (fontSizePx * MONO_ADVANCE_EM)));
}

// Quebra por palavra, como o navegador: palavra que não cabe numa linha
// vazia é partida no meio.
export function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of text.trim().split(/\s+/)) {
    let rest = word;
    while (rest.length > 0) {
      const candidate = current ? `${current} ${rest}` : rest;
      if (candidate.length <= maxChars) {
        current = candidate;
        rest = "";
      } else if (current) {
        lines.push(current);
        current = "";
      } else {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export function truncate(text: string, maxChars: number) {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}
