"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { cn } from "cn";

import { AVATAR_KEYS, AvatarIcon, type AvatarKey } from "@/components/bills/avatar-icon";

export function AvatarPicker({
  name,
  defaultValue = AVATAR_KEYS[0],
}: {
  name: string;
  defaultValue?: AvatarKey;
}) {
  const [selected, setSelected] = useState<AvatarKey>(defaultValue);
  // layoutId é global no documento: escopa por instância do seletor.
  const frameId = `avatar-picker-frame-${useId()}`;
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Grupo de opção única (padrão radiogroup): Tab entra só no selecionado,
  // setas trocam a escolha e movem o foco junto.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + AVATAR_KEYS.length) % AVATAR_KEYS.length;
    setSelected(AVATAR_KEYS[next]);
    buttonsRef.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Avatar" className="flex gap-3">
      <input type="hidden" name={name} value={selected} />
      {AVATAR_KEYS.map((key, index) => (
        <button
          key={key}
          ref={(node) => {
            buttonsRef.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-label={`Avatar ${index + 1}`}
          aria-checked={selected === key}
          tabIndex={selected === key ? 0 : -1}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onClick={() => setSelected(key)}
          className="relative flex h-12 w-12 items-center justify-center p-1.5 text-foreground"
        >
          {selected === key && (
            // A moldura é um elemento só, que escorrega do avatar antigo pro
            // novo em vez de sumir num e aparecer no outro.
            <motion.span
              layoutId={frameId}
              aria-hidden
              className="absolute inset-0 border-2 border-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <AvatarIcon
            avatarKey={key}
            className={cn(
              "h-full w-full transition-opacity duration-200",
              selected !== key && "opacity-40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
