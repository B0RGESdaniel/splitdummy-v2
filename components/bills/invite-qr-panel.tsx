"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useFormStatus } from "react-dom";

import { createInvite, regenerateInvite } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function SubmitButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="w-full">
      {pending ? "Gerando..." : children}
    </Button>
  );
}

export function InviteQrPanel({
  billId,
  invite,
}: {
  billId: string;
  invite: { id: string; token: string } | null;
}) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = invite && origin ? `${origin}/join/${invite.token}` : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Share2 data-icon="inline-start" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar participantes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6">
          {!invite ? (
            <form action={createInvite.bind(null, billId)} className="w-full">
              <SubmitButton>Gerar link de convite</SubmitButton>
            </form>
          ) : (
            <>
              {link && (
                <div className="rounded-lg bg-white p-4">
                  <QRCodeSVG value={link} size={190} />
                </div>
              )}
              <div className="flex w-full gap-2">
                <Input readOnly value={link ?? ""} className="h-10 text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    if (!link) return;
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
              <form action={regenerateInvite.bind(null, billId, invite.id)} className="w-full">
                <SubmitButton variant="outline">Gerar novo link</SubmitButton>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
