"use client";

import { useActionState } from "react";

import { completeProfile } from "@/app/(auth)/welcome/actions";
import { ProfileFields } from "@/components/auth/profile-fields";
import { SheetGrid } from "@/components/auth/sheet-grid";
import type { AvatarKey } from "@/components/bills/avatar-icon";
import { Button } from "@/components/ui/button";
import { TextMorph } from "@/components/ui/text-morph";

export function WelcomeForm({
  defaultName,
  defaultAvatar,
  next,
}: {
  defaultName: string;
  defaultAvatar?: AvatarKey;
  next: string;
}) {
  const [state, formAction, isPending] = useActionState(completeProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <SheetGrid>
        <ProfileFields defaultName={defaultName} defaultAvatar={defaultAvatar} />
      </SheetGrid>
      <p className="text-sm">Só o primeiro nome, é o que aparece na mesa.</p>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="h-11 w-full">
        <TextMorph>{isPending ? "Salvando..." : "Continuar"}</TextMorph>
      </Button>
    </form>
  );
}
