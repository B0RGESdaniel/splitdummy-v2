"use client";

import { useEffect, useRef, useState } from "react";

// Eventos que chegam juntos (ex.: "substituir tudo" de outra pessoa) viram
// um anúncio só, não um por item.
const FLUSH_AFTER_MS = 600;

function phrase(names: string[], singular: string, plural: string) {
  if (names.length === 0) return null;
  return names.length === 1 ? `${names[0]} ${singular}.` : `${names.length} itens ${plural}.`;
}

/**
 * Texto pra uma região `role="status"` da lista de Itens: avisa leitor de
 * tela quando um item entra ou sai por outra pessoa ("Chopp entrou na
 * lista."). Mudança de quantidade/partes não é anunciada — numa mesa com
 * várias pessoas editando, viraria ruído.
 *
 * Quem decide se o evento é de outra pessoa é quem chama (`isOwn`): o
 * Realtime não diz o autor.
 */
export function useItemChangeAnnouncer() {
  const [announcement, setAnnouncement] = useState("");
  const pending = useRef<{ added: string[]; removed: string[] }>({ added: [], removed: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mesmo texto duas vezes seguidas não é relido; alterna um espaço no fim.
  const toggle = useRef(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function announce(kind: "added" | "removed", description: string) {
    pending.current[kind].push(description);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { added, removed } = pending.current;
      pending.current = { added: [], removed: [] };
      const text = [
        phrase(removed, "saiu da lista", "saíram da lista"),
        phrase(added, "entrou na lista", "entraram na lista"),
      ]
        .filter(Boolean)
        .join(" ");
      toggle.current = !toggle.current;
      setAnnouncement(toggle.current ? text : `${text} `);
    }, FLUSH_AFTER_MS);
  }

  return { announcement, announce };
}
