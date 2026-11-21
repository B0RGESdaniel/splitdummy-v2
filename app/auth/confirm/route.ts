import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Link do e-mail de login. Confere o token no servidor (token_hash), então
// funciona em qualquer navegador — diferente do PKCE do /auth/callback, que
// só troca o código no navegador que pediu o login.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  // Só caminho do próprio app: "//outro.site" seria um redirect pra fora.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("erro", "link");
  if (next) {
    loginUrl.searchParams.set("next", safeNext);
  }
  return NextResponse.redirect(loginUrl);
}
