// Destino pós-login vem da URL: só aceita caminho do próprio app, senão
// "//outro.site" viraria um redirect pra fora.
export function safeNextPath(next: string | null | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}
