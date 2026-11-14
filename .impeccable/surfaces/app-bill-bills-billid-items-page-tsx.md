---
version: 1
slug: "app-bill-bills-billid-items-page-tsx"
primary_target: "app/(bill)/bills/[billId]/items/page.tsx"
related_targets: []
---

## Scope and visitor mode

Surface: Itens (`app/(dashboard)/bills/[billId]/items/page.tsx` + `components/bills/items-list.tsx`, `item-form-dialog.tsx`, `create-item-button.tsx`, `delete-item-button.tsx`). Visitor mode: Operate (task-completion app UI). Pilot screen for the app's new visual world — not yet rolled out to other tabs (Participantes/Dividir/Resumo/Dashboard).

Audience, job, action, proof, constraints: see `PRODUCT.md` (`## Users`, `## Operating Context`). Primary action: add/edit/remove bill items on the phone, at the table, right after the check arrives. Proof: real items with real prices, no placeholder content. Constraint: mobile-first; shadcn/ui component primitives stay as the structural layer (closed architecture decision) — this is a restyle, not a library swap; existing CRUD Server Actions/mutations are unchanged.

## Direction contract

THESIS: The items list is not a data table with rows — it is the guest check's line items, and adding an item is filling in the next blank line on a paper pad, not inserting a row. Refuses the generic SaaS-dashboard look (flat gray cards, pill badges, icon-only buttons) any bill-splitting app could ship unchanged.

OWN-WORLD: Ground is a cream/off-white paper tone (not a busy illustrated texture — Operate restraint). Color strategy Restrained: paper neutrals + navy-indigo as the dominant structural "ink" (labels, chrome, rules, header) + red reserved strictly for signal (totals-adjacent emphasis, destructive/alert states) — mirrors the pinned reference's blue print + red check-number. Thin horizontal rule lines between item rows, echoing the check's printed lines. Two fixed type voices: a retro slab/serif print face for structure, labels, and header chrome, paired with a monospace face for all numerals (prices, quantities, totals); a casual handwritten script face reserved exclusively for user-entered content (item names) — never for numbers.

STORY: Opening the Itens tab reads immediately as "the check in your hand." Each row is understood as an item ordered; adding an item feels like writing the next line. Numbers stay in clean print/mono so the total is always trusted at a glance, even though entries look handwritten.

FIRST VIEWPORT: Header bar styled like the check's boxed Date/Table/Guests/Server fields, carrying this bill's context (name/participant count). Below it, itemized rows separated by thin rule lines: item name left in script voice, quantity/price right in mono voice. The add-item action sits as the next blank/dashed line at the end of the list, not a floating generic "+" button.

FORM: seed: none (pinned). Quoted pin: "eu quero que a estética seja baseada nessa imagem... um fundo de papel, com letras retro, e os textos de preenchimento handwritten" (user message, reference image `/Users/danielborges/Downloads/conta_4.jpeg`, recorded in `PRODUCT.md` `## Brand Commitments`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

- Exact font families for each voice (print/mono/script) — picked during typeset, from real legible Google Fonts candidates (print: Clarendon-style slab; mono: IBM Plex Mono or Space Mono; script: Caveat or Kalam), never a generic AI-default face.
- Whether this direction extends to other tabs (Participantes/Dividir/Resumo/Dashboard) and to the product name/logo — both explicitly out of scope for this pass; decided after this pilot is validated.
- No dark mode variant for this world (single paper mode) — confirmed with the user; existing dark-mode tokens in `app/globals.css`/`next-themes` stay untouched outside the Itens route until a full rollout decision is made.
