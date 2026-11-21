import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

// Os dois jeitos de entrar, usados no login e no convite. Mesma pessoa pelos
// dois caminhos (mesmo e-mail) vira um usuário só: o Supabase liga as contas.
export function SignInOptions({ next }: { next?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <GoogleSignInButton next={next} />
      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        ou
        <span className="bg-border h-px flex-1" />
      </div>
      <EmailSignInForm next={next} />
    </div>
  );
}
