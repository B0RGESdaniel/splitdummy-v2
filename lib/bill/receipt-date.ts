// Fuso explícito: o servidor roda em UTC, e o cupom precisa da hora local.
const receiptDateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatReceiptDate(iso: string) {
  return receiptDateFormat.format(new Date(iso)).replace(",", "");
}
