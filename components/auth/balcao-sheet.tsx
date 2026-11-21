import { archivoNarrow, bitter, kalam } from "@/app/fonts";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeScope } from "@/components/theme-scope";

// Telas de antes de entrar no app (login, primeiro acesso, convite): uma
// comanda em branco, arrancada do bloco (picote no topo), sobre o mesmo
// balcão do histórico. O topo é o impresso de toda comanda — "Divide/ai Nº" —
// e o número só existe quando já há uma conta (convite) — pode chegar depois
// da folha, por isso aceita um pedaço em streaming no lugar do número.
export function BalcaoSheet({
  label,
  number,
  children,
}: {
  label: string;
  number?: number | React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ThemeScope
      className={`${archivoNarrow.variable} ${bitter.variable} ${kalam.variable} paper-check balcao flex flex-1 flex-col items-center justify-center px-5 py-10`}
    >
      <main className="balcao-bloco w-full max-w-sm">
        <div className="balcao-folha flex flex-col text-foreground">
          <div className="flex items-baseline gap-2 border-b-[1.5px] border-border px-5 pt-3 pb-2.5">
            <BrandWordmark className="text-[26px]" />
            <span className="text-[11px] font-semibold tracking-[0.08em] tabular-nums">
              Nº {typeof number === "number" ? String(number).padStart(3, "0") : (number ?? "———")}
            </span>
          </div>
          <h1 className="sr-only">{label}</h1>
          <div className="flex flex-col gap-4 px-5 pt-4 pb-5">{children}</div>
        </div>
      </main>
    </ThemeScope>
  );
}
