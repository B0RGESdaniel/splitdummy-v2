/**
 * Sacode um campo pra dizer "isso está errado" (error state shake do
 * transitions.dev). Tira a classe, força o reflow e põe de novo, pra a
 * animação repetir a cada erro; sai sozinha no fim. A cor de erro é do
 * próprio campo (`aria-invalid`), não daqui.
 */
export function shake(element: HTMLElement | null) {
  if (!element) return;
  element.classList.remove("is-shaking");
  void element.offsetWidth;
  element.classList.add("is-shaking");
  element.addEventListener("animationend", () => element.classList.remove("is-shaking"), {
    once: true,
  });
}
