import { Archivo_Narrow, Bitter, Courier_Prime, DotGothic16, Kalam } from "next/font/google";

// Voz-base da comanda. Mora aqui (e não só no layout da conta) porque o
// Toaster fica no layout raiz e os toasts usam a mesma fonte em todo o app.
export const archivoNarrow = Archivo_Narrow({
  variable: "--font-check-base",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// As outras vozes são compartilhadas entre a conta e o dashboard (balcão),
// que mostra comandas e cupons em miniatura — uma instância só de cada.
export const bitter = Bitter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const kalam = Kalam({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const courierPrime = Courier_Prime({
  variable: "--font-receipt-base",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const dotGothic16 = DotGothic16({
  variable: "--font-receipt-digits",
  subsets: ["latin"],
  weight: ["400"],
});
