import type { MetadataRoute } from "next";

// Cor do balcão (`--balcao` em globals.css), em hex porque o manifest não
// aceita oklch. É o fundo da tela de abertura do app instalado.
const BALCAO = "#051638";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Divide/ai",
    short_name: "Divide/ai",
    description: "Divida contas de bar e restaurante com seus amigos",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BALCAO,
    theme_color: BALCAO,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
