"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { regenerateInvite } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePortalContainer } from "@/components/theme-scope";

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
  const portalContainer = usePortalContainer();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = invite && origin ? `${origin}/join/${invite.token}` : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon-lg" aria-label="Compartilhar convite">
          <Share2 />
        </Button>
      </DialogTrigger>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Convidar participantes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6">
          {!invite ? (
            <p className="text-muted-foreground text-sm">
              Não foi possível gerar o link de convite.
            </p>
          ) : (
            <>
              {link && (
                <div className="bg-white p-4">
                  <QRCodeSVG value={link} size={190} />
                </div>
              )}
              <div className="flex w-full gap-2">
                <Input readOnly value={link ?? ""} className="h-10 text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="size-10"
                  aria-label={copied ? "Link copiado" : "Copiar link"}
                  onClick={async () => {
                    if (!link) return;
                    try {
                      await navigator.clipboard.writeText(link);
                    } catch {
                      // Sem permissão de área de transferência (ou contexto
                      // não seguro): o link continua visível no campo ao lado.
                      toast.error("Não deu pra copiar. Selecione o link e copie à mão.");
                      return;
                    }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check /> : <Copy />}
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
