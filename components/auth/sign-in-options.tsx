"use client";

import { useState } from "react";

import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

// Os dois jeitos de entrar, usados no login e no convite. Mesma pessoa pelos
// dois caminhos (mesmo e-mail) vira um usuário só: o Supabase liga as contas.
export function SignInOptions({ next }: { next?: string }) {
  const [isCodeStep, setIsCodeStep] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {!isCodeStep && (
        <>
          <GoogleSignInButton next={next} />
          <div className="flex items-center gap-3 text-xs">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <EmailSignInForm next={next} onCodeStep={setIsCodeStep} />
    </div>
  );
}
