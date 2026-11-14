---
version: 1
slug: "app-bill-bills-billid-items-page-tsx"
primary_target: "app/(bill)/bills/[billId]/items/page.tsx"
related_targets: []
---

## Scope and visitor mode

Surface: Itens (`app/(bill)/bills/[billId]/items/page.tsx` + `components/bills/items-list.tsx`, `item-form-dialog.tsx`, `create-item-button.tsx`, `delete-item-button.tsx`). Visitor mode: Operate (task-completion app UI). Extended beyond the initial pilot to the whole bill section (`app/(bill)/bills/[billId]/layout.tsx`, all 4 tabs) — not yet rolled out to dashboard/login.

Audience, job, action, proof, constraints: see `PRODUCT.md` (`## Users`, `## Operating Context`). Primary action: add/edit/remove bill items on the phone, at the table, right after the check arrives. Proof: real items with real prices, no placeholder content. Constraint: mobile-first; shadcn/ui component primitives stay as the structural layer (closed architecture decision) — this is a restyle, not a library swap; existing CRUD Server Actions/mutations are unchanged.

## Direction contract

THESIS: The items list is not a data table with rows — it is the guest check's line items, and adding an item is filling in the next blank line on a paper pad, not inserting a row. Refuses the generic SaaS-dashboard look (flat gray cards, pill badges, icon-only buttons) any bill-splitting app could ship unchanged.

OWN-WORLD (revised after user review — see "resolved" changelog below): Ground is a duller, more neutral paper tone than the first pass (less pastel-cream), with a subtle grain texture (SVG feTurbulence, no image asset). Color strategy Restrained: paper neutrals + navy-indigo as the dominant structural "ink" + red reserved strictly for signal (status badge, destructive/alert states) — mirrors the pinned reference's blue print + red check-number. Buttons: square/sharp corners, no radius softness; no neobrutalist hard-offset shadow (user requested it then explicitly walked it back — keep it plain squared-off, not a costume).

**Two distinct type/voice worlds within the surface (decided 2026-11-14, see Resolved below) — not one shared voice anymore:**
- **Comanda** (Itens, Participantes, header chrome — the bill while *open*): structural/base voice is **Archivo Narrow** (a plain condensed grotesque closest to the Date/Table/Guests/Server fields on the pinned reference pad), replacing the earlier JetBrains Mono call. Bitter stays reserved *only* for the account name in the header masthead. Caveat (handwritten) stays reserved *only* for the item description.
- **Cupom fiscal** (Resumo — effectively only meaningful once the bill is *closed*): a deliberately different, more literal "printed receipt" world. Body/structural voice is **Courier Prime** (names, "TOTAL", "Subtotal", item descriptions — everything). **DotGothic16** is used ONLY for digits, the "R$" currency mark, and fractions (e.g. "2/3") — tested at large size against the user's own reaction: DotGothic16's uppercase Latin letters render at visibly uneven heights, confirmed by the user as "esquisito", so it must never be used for words, only numerals. This surface brief's primary target is still `items/page.tsx`, but Resumo's direction now genuinely diverges enough that a future `/impeccable document` or `shape` pass should probably split it into its own surface brief rather than keep inheriting this one by default.

Participant-name voice: resolved as the comanda's plain structural voice (not handwritten) — carries over unchanged into Archivo Narrow.

STORY: Opening the Itens tab reads immediately as "the check in your hand." Each row is understood as an item ordered; adding an item feels like writing the next line. Numbers and all structural chrome stay in the clean printed-ticket voice so the total is always trusted at a glance, even though item names look handwritten. Closing the bill is the moment the comanda becomes a cupom fiscal — a deliberate register change, not just a status flip.

FIRST VIEWPORT: Header bar carries a minimal logo (left), the bill name centered in the retro masthead voice, and the open/closed status as a colored corner badge (echoing the reference's red invoice-number box) — not in the tab row. **Header treatment is under active revision, see Unresolved below — do not treat the current shipped header as final.** Below it, itemized rows: item name (tappable, opens the full edit dialog) in script voice with a quiet unit-price caption, a combined qty stepper (reusing the same stepper visual already used for per-participant parts in the split dialog) that edits `items.quantity` directly from the list, a live line total, and a divide button — 4 visual groups, not the earlier 3-column ruled grid. Tapping the divide icon opens a Dialog (same pattern as "Editar item") showing participants + part steppers for that item. The add-item action sits as the next blank/dashed line at the end of the list.

Navigation (once the split-dialog merge lands): 3 areas instead of 4 — Itens (now including split), Participantes, Resumo — presented as stacked "vias" (carbon-copy layers) instead of flat underlined tabs: the active via is full-size, the other two peek as a thin stacked edge with slight rotation/shadow; tapping a peeking edge brings it forward with a slide transition. This is the signature interaction for this phase.

FORM: seed: none (pinned). Quoted pin: "eu quero que a estética seja baseada nessa imagem... um fundo de papel, com letras retro, e os textos de preenchimento handwritten" (user message, reference image `/Users/danielborges/Downloads/conta_4.jpeg`, recorded in `PRODUCT.md` `## Brand Commitments`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Resolved since the first pass (2026-11-14)

- First build was colour/font applied to stock shadcn components, not a real redesign (user feedback) — font-family leak root-caused (CSS inheritance only re-reads `var(--font-sans)` where `font-family` is actually declared) and fixed by declaring it on `.paper-check` itself.
- Palette moved from a lighter/pastel cream to a duller, textured paper tone.
- Navigation/screen count is genuinely open and now decided (see FIRST VIEWPORT): split merges into Items via dialog, tab count drops from 4 to 3, tab transition becomes a stacked-vias motion instead of flat underline tabs.
- **Base visual pass done**: base font swapped to JetBrains Mono app-wide within `.paper-check` (Bitter kept only for the header account name); participant-name voice resolved — user picked handwritten (Caveat) first, then reverted same-day back to mono (matching the rest of the structural voice), applied consistently across Participantes/Dividir/Resumo; items list got a real ruled grid (vertical + horizontal rules between qty/description/price columns); buttons and badges squared off to radius zero (`!important`, since badges hadn't been touched yet and still used the stock pill shape).
- **Split-as-dialog done**: removed the `/split` route and `SplitWorkspace`/item-selector. Each item row now opens a Dialog (`ItemSplitDialog`, reusing `ItemSplit` unchanged) showing participants + steppers, same interaction pattern as "Editar item". Tab count dropped from 4 to 3 (Itens/Participantes/Resumo) as a side effect; the tab bar itself is still the old underlined `BillTabs`, not yet the stacked-vias treatment.

- **Header redesign done (v1, now under revision)**: minimal logo (`ReceiptMark`, an inline SVG receipt silhouette with a torn/zigzag bottom edge — proposed, not yet reacted to by the user), bill name centered in Bitter, status badge moved out of the tab row into a solid colored corner box (`BillStatusBadge`). Color call: only "closed" gets red; "open" gets the neutral ink color, keeping red strictly as the signal color rather than a traffic-light green/red pair. User later flagged this version as visually/logically inconsistent (see Unresolved below) — treat as superseded once the header is revisited, not as settled.
- **`/impeccable critique` run (2026-11-14)**: dual-agent, 27/40. Findings: Resumo didn't match the comanda's visual identity (superseded by the comanda/cupom-fiscal split below, which is a more specific fix than "make it match Items"); a stray `text-amber-400` off-palette warning color in `item-split.tsx`; handwritten-voice drift in `create-item-button.tsx` and the empty state of `items-list.tsx`; the status badge under-delivering its own brief; no visual signal for remote Realtime changes. Full report: `.impeccable/critique/2026-11-14T12-22-43Z__app-bill-bills-billid-items-page-tsx.md`. The amber color, voice drift, badge, and realtime-signal findings are still open — not addressed by the typography/architecture pass below.
- **Typography + comanda/cupom-fiscal world split (2026-11-14, decisions closed, implementation not started)**: see OWN-WORLD and FIRST VIEWPORT above for the settled direction. Worked out live against comparison mockups in an artifact: https://claude.ai/artifact/RjMzCMWxwefpSeLEEXWcb5 (open before implementing — it has the agreed specimens, including the confirmed-bad DotGothic16 uppercase test). Also settled: the item row's new 4-group layout, which needs a new pair of Server Actions/mutations (`incrementItemQuantity`/`decrementItemQuantity` on `items.quantity`, analogous to the existing `item_shares.parts` increment/decrement actions, same optimistic-update pattern).

## Unresolved decisions — pick up next session here, in this order

1. **Header**: user flagged the current header as visually and logically inconsistent — Sair (account-level action) and Compartilhar (bill-level action) sit in the same utility row as if they were the same kind of thing. A hypothesis was raised in conversation but NOT decided: maybe they shouldn't live in the same place at all, given they operate at different scopes. Do not assume a solution; ask before building.
2. **Participantes**: user confirmed this screen stays low-emphasis ("pouco mexida") relative to Itens — it should NOT get the heavy ruled-grid treatment, but what it *should* look like beyond "inherits the comanda's structural font" hasn't been discussed yet.
3. **Resumo while the bill is still open**: the cupom-fiscal treatment only really makes sense once a bill is closed. Asked whether Resumo should show a simple live preview (still in the comanda world, since no real cupom exists yet) while open, or whether the tab should be hidden/disabled until closing — **user has not answered this yet; ask again before implementing.**

## Deferred, not dropped

- **Vias navigation** (stacked carbon-copy-layer replacing `BillTabs`): user picked the "full stacked sheets" variant over the simpler folder-tab variant, which needs the three routes (`/items`, `/participants`, `/summary`) merged into one so all three stay mounted — a big enough architecture change that it was flagged to the user before building. Their call: "let's leave that for later, not sure I'll still want it after the other changes are done." Do not pick an architecture (route merge vs. Next.js Parallel Routes) without asking again when/if this gets picked back up.

Whether this direction extends to dashboard/login is still explicitly out of scope — decided after this bill-section pass is validated.
