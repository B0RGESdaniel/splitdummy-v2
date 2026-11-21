"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

// Espera mínima do Supabase entre dois envios pro mesmo e-mail.
const RESEND_COOLDOWN_SECONDS = 60;

type Step = { kind: "email" } | { kind: "code"; email: string };

// Login sem senha: o Supabase manda um código pro e-mail e a pessoa digita
// aqui mesmo. Código em vez de link porque o link loga o navegador em que é
// aberto (no celular, muitas vezes o navegador interno do app de e-mail), não
// este aqui.
export function EmailSignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(email: string) {
    setIsPending(true);
    setError(null);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({ email });
    setIsPending(false);

    if (sendError) {
      setError(
        sendError.status === 429
          ? "Muitos envios seguidos. Espere um pouco e tente de novo."
          : "Não deu pra mandar o código. Confira o e-mail e tente de novo.",
      );
      return false;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (await sendCode(email)) {
      setStep({ kind: "code", email });
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "code") return;
    const token = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");

    setIsPending(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: step.email,
      token,
      type: "email",
    });

    if (verifyError) {
      setIsPending(false);
      setError("Código errado ou vencido. Confira o e-mail ou peça outro.");
      return;
    }

    router.replace(next ?? "/");
    router.refresh();
  }

  if (step.kind === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" variant="outline" disabled={isPending} className="w-full">
          {isPending ? "Enviando..." : "Receber código por e-mail"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Mandamos um código para <span className="text-foreground font-medium">{step.email}</span>.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9 ]{6,10}"
          maxLength={10}
          required
          autoFocus
          className="font-mono tracking-[0.3em]"
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Conferindo..." : "Entrar"}
      </Button>
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setError(null);
            setStep({ kind: "email" });
          }}
        >
          Trocar e-mail
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || cooldown > 0}
          onClick={() => sendCode(step.email)}
        >
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
        </Button>
      </div>
    </form>
  );
}
