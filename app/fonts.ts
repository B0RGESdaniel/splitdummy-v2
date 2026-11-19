import { Archivo_Narrow } from "next/font/google";

// Voz-base da comanda. Mora aqui (e não só no layout da conta) porque o
// Toaster fica no layout raiz e os toasts usam a mesma fonte em todo o app.
export const archivoNarrow = Archivo_Narrow({
  variable: "--font-check-base",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
