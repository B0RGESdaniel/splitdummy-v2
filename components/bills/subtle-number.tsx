"use client";

import { useState } from "react";

/**
 * Valor que muda ao vivo sem chamar atenção ("number subtle change", do
 * transitions.dev): só os caracteres que mudaram trocam, subindo quando o
 * valor aumenta e descendo quando diminui. Sem o desfoque do original (papel
 * e tinta). Na primeira renderização mostra o texto parado.
 */
export function SubtleNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const text = format(value);
  const [shown, setShown] = useState({ value, text, previous: null as string | null, dir: 1, key: 0 });

  // Ajuste durante a renderização (não em effect): o valor novo já sai com a troca.
  if (shown.value !== value || shown.text !== text) {
    setShown({
      value,
      text,
      previous: shown.text,
      dir: value >= shown.value ? 1 : -1,
      key: shown.key + 1,
    });
  }

  const { previous } = shown;
  const sameLength = previous !== null && previous.length === text.length;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span
        key={shown.key}
        aria-hidden
        className={previous === null ? "subtle-number" : "subtle-number is-animating"}
        style={{ "--subtle-dir": shown.dir } as React.CSSProperties}
      >
        {previous === null
          ? text
          : [...text].map((char, index) =>
              sameLength && previous[index] === char ? (
                char
              ) : (
                <span key={index} className="subtle-number-slot">
                  {sameLength && <span className="subtle-number-old">{previous[index]}</span>}
                  <span className="subtle-number-new">{char}</span>
                </span>
              ),
            )}
      </span>
    </span>
  );
}
