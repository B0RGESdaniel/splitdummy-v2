"use client";

import { useLayoutEffect, useRef, useState } from "react";

const SETTLE_MS = 250;

function splitChange(previous: string, next: string) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = 0;
  while (
    end < previous.length - start &&
    end < next.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  return {
    prefix: next.slice(0, start),
    oldMiddle: previous.slice(start, previous.length - end),
    newMiddle: next.slice(start, next.length - end),
    suffix: next.slice(next.length - end),
  };
}

/**
 * Rótulo que troca guardando as letras em comum ("text morph" do
 * transitions.dev, sem o desfoque): "Adicionar" → "Adicionando..." só
 * esmaece o final, e a largura acompanha. Depois de assentar, volta a ser
 * texto puro. O trecho antigo fica fora do leitor de tela.
 */
export function TextMorph({ children: text }: { children: string }) {
  const [shown, setShown] = useState({ text, previous: null as string | null, key: 0 });
  if (shown.text !== text) {
    setShown({ text, previous: shown.text, key: shown.key + 1 });
  }

  const swapRef = useRef<HTMLSpanElement>(null);
  const oldRef = useRef<HTMLSpanElement>(null);
  const newRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const swap = swapRef.current;
    const oldPart = oldRef.current;
    const newPart = newRef.current;
    if (!swap || !oldPart || !newPart) return;

    swap.style.width = `${oldPart.offsetWidth}px`;
    void swap.offsetWidth;
    swap.classList.add("is-morphing");
    swap.style.width = `${newPart.offsetWidth}px`;

    const key = shown.key;
    const timer = setTimeout(() => {
      setShown((current) => (current.key === key ? { ...current, previous: null } : current));
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [shown.key]);

  if (shown.previous === null) {
    return <span className="text-morph">{text}</span>;
  }

  const { prefix, oldMiddle, newMiddle, suffix } = splitChange(shown.previous, text);
  return (
    <span className="text-morph">
      {prefix}
      <span key={shown.key} ref={swapRef} className="text-morph-swap">
        <span ref={oldRef} className="text-morph-old" aria-hidden>
          {oldMiddle}
        </span>
        <span ref={newRef} className="text-morph-new">
          {newMiddle}
        </span>
      </span>
      {suffix}
    </span>
  );
}
