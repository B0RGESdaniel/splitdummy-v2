"use client";

import { useCallback, useRef, useState } from "react";

const SELF_ECHO_WINDOW_MS = 4000;
const FLASH_DURATION_MS = 900;

/**
 * Marca quais ids acabaram de mudar via Realtime por causa de OUTRO
 * participante, pra acender um flash visual só nesses casos. `markOwn`
 * registra um id logo antes de disparar a própria mutation otimista; se o
 * eco do Realtime pra esse id chegar dentro da janela curta, é descartado
 * como eco (não é remoto) em vez de piscar.
 */
export function useRemoteChangeFlash() {
  const ownRef = useRef(new Map<string, number>());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  const markOwn = useCallback((id: string) => {
    ownRef.current.set(id, Date.now());
  }, []);

  const handleRemoteChange = useCallback((id: string) => {
    const ownAt = ownRef.current.get(id);
    if (ownAt !== undefined) {
      ownRef.current.delete(id);
      if (Date.now() - ownAt < SELF_ECHO_WINDOW_MS) return;
    }

    setFlashing((current) => {
      if (current.has(id)) return current;
      return new Set(current).add(id);
    });

    setTimeout(() => {
      setFlashing((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, FLASH_DURATION_MS);
  }, []);

  return { flashing, markOwn, handleRemoteChange };
}
