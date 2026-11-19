"use client";

import { useId, useState } from "react";
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

  return (
    <div className="flex gap-3">
      <input type="hidden" name={name} value={selected} />
      {AVATAR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={`Escolher avatar ${key}`}
          aria-pressed={selected === key}
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
