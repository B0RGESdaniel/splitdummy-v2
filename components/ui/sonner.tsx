"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Check, InfoIcon, TriangleAlertIcon, SquareExclamationPoint, Loader2Icon } from "lucide-react"

// Toast "etiqueta da comanda" (opção A de `Toasts da comanda`): papel, borda
// sólida e sombra dura em tinta; erro em vermelho (cores em globals.css). Mora
// no layout raiz pra um toast sobreviver à troca de rota (ex.: "Você não
// participa mais desta conta." vai pro dashboard). No topo: embaixo cobria a
// faixa fixa do "fecha para mim" e os botões principais, na zona do polegar.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group comanda-toaster"
      position="top-center"
      icons={{
        success: <Check className="size-[18px]" strokeWidth={2.2} />,
        info: <InfoIcon className="size-[18px]" strokeWidth={2.2} />,
        warning: <TriangleAlertIcon className="size-[18px]" strokeWidth={2.2} />,
        error: <SquareExclamationPoint className="size-[18px]" strokeWidth={2.2} />,
        loading: <Loader2Icon className="size-[18px] animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "comanda-toast",
          icon: "comanda-toast-icon",
          content: "comanda-toast-content",
          actionButton: "comanda-toast-action",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
