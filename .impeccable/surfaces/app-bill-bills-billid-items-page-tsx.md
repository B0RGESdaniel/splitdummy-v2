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

OWN-WORLD (revised after user review — see "resolved" changelog below): Ground is a duller, more neutral paper tone than the first pass (less pastel-cream), with a subtle grain texture (SVG feTurbulence, no image asset). Color strategy Restrained: paper neutrals + navy-indigo as the dominant structural "ink" + red reserved strictly for signal (status badge, destructive/alert states) — mirrors the pinned reference's blue print + red check-number. Base/default type voice for the whole scope is **monospace (JetBrains Mono)** — "printed order ticket" register, not the retro slab serif; the retro slab serif (Bitter) is reserved *only* for the account name in the header masthead. Handwritten script (Caveat) is reserved *only* for the item description (what a diner "wrote in"). Participant-name voice is explicitly undecided — do not default it to mono or script; ask the user. Items list gets a real ruled table grid (horizontal AND vertical rules between description/qty/price columns), echoing the reference's lined box, not just a row divider. Buttons: square/sharp corners, no radius softness; no neobrutalist hard-offset shadow (user requested it then explicitly walked it back — keep it plain squared-off, not a costume).

STORY: Opening the Itens tab reads immediately as "the check in your hand." Each row is understood as an item ordered; adding an item feels like writing the next line. Numbers and all structural chrome stay in the clean printed-ticket voice so the total is always trusted at a glance, even though item names look handwritten.

FIRST VIEWPORT: Header bar carries a minimal logo (left), the bill name centered in the retro masthead voice, and the open/closed status as a colored corner badge (echoing the reference's red invoice-number box) — not in the tab row. Below it, itemized rows in a ruled grid: item name left in script voice, quantity/price right in mono voice. Tapping a row opens a Dialog (same pattern as "Editar item") showing participants + part steppers for that item — splitting is not a separate screen/route, it's a dialog reached from the item row. The add-item action sits as the next blank/dashed line at the end of the list.

Navigation (once the split-dialog merge lands): 3 areas instead of 4 — Itens (now including split), Participantes, Resumo — presented as stacked "vias" (carbon-copy layers) instead of flat underlined tabs: the active via is full-size, the other two peek as a thin stacked edge with slight rotation/shadow; tapping a peeking edge brings it forward with a slide transition. This is the signature interaction for this phase.

FORM: seed: none (pinned). Quoted pin: "eu quero que a estética seja baseada nessa imagem... um fundo de papel, com letras retro, e os textos de preenchimento handwritten" (user message, reference image `/Users/danielborges/Downloads/conta_4.jpeg`, recorded in `PRODUCT.md` `## Brand Commitments`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Resolved since the first pass (2026-11-14)

- First build was colour/font applied to stock shadcn components, not a real redesign (user feedback) — font-family leak root-caused (CSS inheritance only re-reads `var(--font-sans)` where `font-family` is actually declared) and fixed by declaring it on `.paper-check` itself.
- Palette moved from a lighter/pastel cream to a duller, textured paper tone.
- Navigation/screen count is genuinely open and now decided (see FIRST VIEWPORT): split merges into Items via dialog, tab count drops from 4 to 3, tab transition becomes a stacked-vias motion instead of flat underline tabs.
- **Base visual pass done**: base font swapped to JetBrains Mono app-wide within `.paper-check` (Bitter kept only for the header account name); participant-name voice resolved — user picked handwritten (Caveat) first, then reverted same-day back to mono (matching the rest of the structural voice), applied consistently across Participantes/Dividir/Resumo; items list got a real ruled grid (vertical + horizontal rules between qty/description/price columns); buttons and badges squared off to radius zero (`!important`, since badges hadn't been touched yet and still used the stock pill shape).
- **Split-as-dialog done**: removed the `/split` route and `SplitWorkspace`/item-selector. Each item row now opens a Dialog (`ItemSplitDialog`, reusing `ItemSplit` unchanged) showing participants + steppers, same interaction pattern as "Editar item". Tab count dropped from 4 to 3 (Itens/Participantes/Resumo) as a side effect; the tab bar itself is still the old underlined `BillTabs`, not yet the stacked-vias treatment.

## Unresolved decisions — pick up next session here, in this order

1. **Vias navigation**: replace `BillTabs` (now 3 areas) with the stacked carbon-copy-layer interaction described above.
2. **Header redesign**: minimal logo (no asset yet — Claude proposes a simple inline SVG mark, user reacts), bill name centered in Bitter, status badge moves to a colored corner box.

Whether this direction extends to dashboard/login is still explicitly out of scope — decided after this bill-section pass is validated.
