import type { Metadata, Viewport } from "next";
import "./globals.css";

import { archivoNarrow } from "@/app/fonts";

import { MotionProvider } from "@/components/providers/motion-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Divide/ai",
  description: "Divida contas de bar e restaurante com seus amigos",
  appleWebApp: { title: "Divide/ai" },
};

// Barra do sistema na cor do balcão (dashboard, login); a conta troca pra cor
// do papel no próprio layout.
export const viewport: Viewport = {
  themeColor: "#051638",
};

// Papéis entram no balcão em cascata só na primeira carga da sessão, e só se
// ela começa no balcão. Tem de rodar antes da primeira pintura (um effect
// chegaria depois e os papéis piscariam), por isso é script inline — e mora
// aqui porque o layout raiz não é renderizado de novo no cliente: num
// componente de página, o React o recriaria a cada navegação (e avisa que
// script criado no cliente nunca roda).
const BALCAO_ENTRANCE_SCRIPT = `try{if(location.pathname==="/"&&!sessionStorage.getItem("balcao-entrada")){sessionStorage.setItem("balcao-entrada","1");var el=document.documentElement;el.setAttribute("data-balcao-entrada","");setTimeout(function(){el.removeAttribute("data-balcao-entrada")},1500)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivoNarrow.variable} dark h-full antialiased`}
      // O script da entrada do balcão marca o <html> antes da hidratação.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BALCAO_ENTRANCE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <MotionProvider>{children}</MotionProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
