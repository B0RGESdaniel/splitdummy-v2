"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { usePortalContainer } from "@/components/theme-scope";

export function SignOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const portalContainer = usePortalContainer();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Sair
        </Button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Sair da sua conta?</DialogTitle>
          <DialogDescription>
            Você vai precisar entrar de novo com o Google pra continuar usando o
            Splitdummy.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
