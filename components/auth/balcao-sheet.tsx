import { archivoNarrow, bitter, kalam } from "@/app/fonts";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeScope } from "@/components/theme-scope";

// Telas de antes de entrar no app (login, primeiro acesso, convite): o mesmo
// balcão do histórico, com a marca da casa impressa no alto e uma folha de
// papel com o que a pessoa precisa preencher.
export function BalcaoSheet({
  label,
  tagline,
  children,
}: {
  label: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  return (
    <ThemeScope
      className={`${archivoNarrow.variable} ${bitter.variable} ${kalam.variable} paper-check balcao flex flex-1 flex-col items-center justify-center px-5 py-10`}
    >
      <main className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandWordmark className="text-5xl" />
          {tagline && <p className="text-[color:var(--balcao-soft)] text-sm">{tagline}</p>}
        </div>

        <div className="balcao-folha flex flex-col gap-4 px-5 pt-3 pb-5 text-foreground">
          <h1 className="-mx-5 border-b-[1.5px] border-border px-5 pb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
            {label}
          </h1>
          {children}
        </div>
      </main>
    </ThemeScope>
  );
}
