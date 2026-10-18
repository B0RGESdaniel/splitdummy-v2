"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useFormStatus } from "react-dom";

import { createInvite, regenerateInvite } from "@/app/(dashboard)/bills/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Button type="submit" variant={variant} disabled={pending}>
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
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = invite && origin ? `${origin}/join/${invite.token}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar participantes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {!invite ? (
          <form action={createInvite.bind(null, billId)}>
            <SubmitButton>Gerar link de convite</SubmitButton>
          </form>
        ) : (
          <>
            {link && <QRCodeSVG value={link} size={160} />}
            <div className="flex w-full gap-2">
              <Input readOnly value={link ?? ""} />
              <Button
                type="button"
                variant="outline"
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
            <form action={regenerateInvite.bind(null, billId, invite.id)}>
              <SubmitButton variant="outline">Gerar novo link</SubmitButton>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
