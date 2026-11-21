"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SheetCell, SheetGrid, SheetInput, SheetValue } from "@/components/auth/sheet-grid";
import { TextMorph } from "@/components/ui/text-morph";
import { createClient } from "@/lib/supabase/client";

// Espera mínima do Supabase entre dois envios pro mesmo e-mail.
const RESEND_COOLDOWN_SECONDS = 60;

type Step = { kind: "email" } | { kind: "code"; email: string };

// Login sem senha: o Supabase manda um código pro e-mail e a pessoa digita
// aqui mesmo. Código em vez de link porque o link loga o navegador em que é
// aberto (no celular, muitas vezes o navegador interno do app de e-mail), não
// este aqui.
export function EmailSignInForm({
  next,
  onCodeStep,
}: {
  next?: string;
  // Na etapa do código o resto da folha (Google, "ou") sai de cena.
  onCodeStep?: (isCodeStep: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [lastEmail, setLastEmail] = useState("");

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  function goToStep(nextStep: Step) {
    setError(null);
    if (nextStep.kind === "code") setLastEmail(nextStep.email);
    setStep(nextStep);
    onCodeStep?.(nextStep.kind === "code");
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(email: string) {
    setIsPending(true);
    setError(null);
    const supabase = createClient();
    // O mesmo e-mail traz um link de atalho, que passa pelo /auth/confirm e
    // volta pro mesmo destino.
    const confirmUrl = new URL("/auth/confirm", window.location.origin);
    confirmUrl.searchParams.set("next", next ?? "/");
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: confirmUrl.toString() },
    });
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
      goToStep({ kind: "code", email });
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
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
        <SheetGrid>
          <SheetCell label="E-mail" htmlFor="email">
            <SheetInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              defaultValue={lastEmail}
              required
            />
          </SheetCell>
        </SheetGrid>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" variant="outline" disabled={isPending} className="h-11 w-full">
          <TextMorph>{isPending ? "Enviando..." : "Receber código por e-mail"}</TextMorph>
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
      <SheetGrid>
        <SheetCell label="E-mail">
          <SheetValue
            action={
              <button
                type="button"
                onClick={() => goToStep({ kind: "email" })}
                className="h-9 shrink-0 text-[11px] font-semibold tracking-wide uppercase underline underline-offset-[3px]"
              >
                Trocar
              </button>
            }
          >
            {step.email}
          </SheetValue>
        </SheetCell>
        <SheetCell label="Código do e-mail" htmlFor="code">
          <SheetInput
            id="code"
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9 ]{6,10}"
            maxLength={10}
            required
            autoFocus
            className="tracking-[0.2em]"
          />
        </SheetCell>
      </SheetGrid>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isPending} className="h-11 w-full">
        <TextMorph>{isPending ? "Conferindo..." : "Entrar"}</TextMorph>
      </Button>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11"
          disabled={isPending || cooldown > 0}
          onClick={() => sendCode(step.email)}
        >
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
        </Button>
      </div>
    </form>
  );
}
