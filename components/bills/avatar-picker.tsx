"use client";

import { useState } from "react";
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
          className={cn(
            "flex h-12 w-12 items-center justify-center p-1.5 text-foreground",
            selected === key ? "border-2 border-foreground" : "opacity-40",
          )}
        >
          <AvatarIcon avatarKey={key} className="h-full w-full" />
        </button>
      ))}
    </div>
  );
}
