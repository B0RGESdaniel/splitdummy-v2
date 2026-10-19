# Splitdummy v2

Evolução do [splitdummy v1](https://github.com/B0RGESdaniel/splitdummy) (SPA mono-usuário, tudo em `localStorage`) para um app **multi-usuário e colaborativo em tempo real** de divisão de contas de bar/restaurante. Este projeto é o **TCC** do usuário (Sistemas de Informação) — prioriza uma stack coesa e fácil de justificar por escrito sobre otimizações prematuras.

Plano completo original (contexto de decisão, não reescrever): `/Users/danielborges/.claude/plans/curried-wibbling-cherny.md`. Este arquivo é a fonte de verdade operacional daqui pra frente — se divergir do plano original, este arquivo vence.

## Pilares do produto

1. Contas multi-usuário e compartilháveis (convite por link + QR code).
2. Histórico de contas.
3. Leitura de cupom fiscal por foto via IA (pré-popula itens, revisão humana obrigatória antes de gravar).
4. Grupos recorrentes simples (lista privada de participantes para facilitar convite — não é uma entidade complexa).
5. Divisão por partes, porcentagem ou valor fixo. Exportar/compartilhar resultado.

## Arquitetura (decisões fechadas — não reabrir sem motivo forte)

| Camada | Escolha |
|---|---|
| App | Next.js 16 App Router, TypeScript strict, Cache Components habilitado |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) via Vercel Marketplace |
| Login | Supabase Auth, **só Google OAuth** — sem convidado anônimo |
| Acesso a dados | `@supabase/supabase-js` direto, sem ORM. RLS faz toda a autorização |
| Convite | Link + QR code (mesmo link), sem e-mail |
| IA do cupom | Vercel AI SDK `generateObject` + Zod via AI Gateway (modelo a escolher na hora) |
| UI | Tailwind + shadcn/ui (base `radix`, preset `nova`) |
| Estado/colaboração | TanStack Query + Supabase Realtime (`postgres_changes`) — introduzido na Fase 1 passo 8 (itens, split e resumo; `bills`/`bill_participants` ainda sem realtime) |
| Permissões dentro de uma conta | Totalmente colaborativo: qualquer participante edita itens/partes de qualquer um; só o dono convida/remove; autorremoção sempre permitida |
| Fechamento de conta | Imutável, sem reabrir |
| Grupos | Lista simples e privada (1 dono, membros = perfis que já têm conta) — ainda não implementado (Fase 3) |

### Defaults técnicos assumidos
- Arredondamento: método do maior resto (largest remainder) — implementado em `lib/split/calculate.ts`.
- Link de convite: um ativo por conta; "regenerar" = revoga o atual + cria novo.
- Troca de modo de divisão num item com partes já atribuídas: apaga as partes existentes (com confirmação do usuário) — ainda não relevante até modos percent/fixed existirem.
- Página pública de compartilhamento: só resumo final + itens, de contas fechadas.

## Modelo de dados (já todo criado nas migrations)

`profiles` · `groups` + `group_members` · `bills` (status open/closed) · `bill_participants` · `bill_invites` (token, expiração, revogável) · `items` · `item_shares` (share_type: parts/percent/fixed) · `receipts`.

Toda tabela "por conta" indexa `bill_id`, que é o filtro de RLS e o escopo do canal Realtime. `is_bill_participant(bill_id)` é a função helper reutilizada nas políticas.

### ⚠️ Gotcha de RLS já encontrado (não repetir)

`INSERT ... RETURNING` também é filtrado pela política de **SELECT** da tabela, não só pelo `WITH CHECK` do insert — e isso acontece **antes** de qualquer trigger `AFTER INSERT` disparar. Se a política de select de uma tabela depende de uma linha-filha que só é criada *depois* (ex.: dono só é "participante" depois de inserir em `bill_participants`), o `RETURNING` do insert do pai falha com `new row violates row-level security policy`, mesmo com JWT/sessão perfeitamente válidos. Já aconteceu com `bills` (ver migration `20261018195832_fix_bill_owner_select_and_auto_participant.sql`): a correção foi alargar a política de select (`owner_id = auth.uid() OR is_bill_participant(id)`) em vez de depender só do trigger. Ao criar `groups`/`group_members` (Fase 3) ou qualquer outra combinação "criar pai + criar vínculo", checar esse caso antes de usar `.select()` depois de um insert. Pra depurar rápido: reproduzir direto via `psql "$POSTGRES_URL_NON_POOLING"` com `set local role authenticated; set local "request.jwt.claims" to '{"sub":"<uuid>","role":"authenticated"}';` — isola a política SQL de qualquer dúvida sobre sessão/cliente.

## Regras de trabalho com o usuário (importante)

- **Nunca rodar `git add` ou `git commit`** — o usuário faz staging e commit dele mesmo.
- Ao terminar cada unidade de trabalho do tamanho de um commit, **parar, relatar o que mudou e pedir pra ele comitar antes de seguir pro próximo passo**. Não empacotar vários passos do plano numa única entrega.
- Só sugerir mensagem de commit quando ele pedir.
- O usuário gosta de validar manualmente no navegador antes de avançar; quando possível, validar primeiro direto no banco (via `psql`) para não depender do navegador pra pegar bug de RLS/lógica.
- **Manter o `TCC.md` atualizado.** Esse projeto é o TCC do usuário — `TCC.md` (raiz do repo) registra a stack completa, as regras de negócio e um changelog de funcionalidades/ferramentas, com breve justificativa de cada uma, pra servir de matéria-prima quando ele for escrever o artigo. Toda vez que uma funcionalidade ou ferramenta nova for introduzida (biblioteca, padrão de arquitetura, tabela, decisão técnica não-óbvia), adicionar uma entrada curta no changelog do `TCC.md` **antes de reportar a unidade de trabalho como concluída** — não deixar acumular pra fazer depois. Decisões/bugs interessantes pro artigo (ex.: por que largest remainder, gotchas de RLS, exigências do Realtime) entram na seção "Decisões técnicas notáveis", não só no changelog.

## Estrutura do app

```
app/(auth)/login, auth/callback
app/(dashboard)/page.tsx                                       # histórico de contas (dialog "Nova conta")
app/(dashboard)/bills/actions.ts                                # createBill, createInvite, regenerateInvite, closeBill
app/(dashboard)/bills/[billId]/page.tsx                         # overview + painel de convite (dono) + links itens/resumo
app/(dashboard)/bills/[billId]/items/{page.tsx,actions.ts}      # CRUD de itens (ItemsList client, realtime)
app/(dashboard)/bills/[billId]/items/[itemId]/split/{page.tsx,actions.ts}  # stepper de partes (ItemSplit client, realtime)
app/(dashboard)/bills/[billId]/summary/page.tsx                 # resumo, taxa, aviso de não-divididos, fechar conta (BillSummary client, realtime)
app/(public)/join/[inviteToken]/page.tsx                        # resolve convite via service-role
app/api/invites/accept/route.ts                                 # aceita convite via service-role (insert owner-only em bill_participants)
lib/supabase/{server,client,service-role}.ts, database.types.ts
lib/split/{calculate,validate}.ts                               # matemática pura da divisão (parts) + taxa de serviço
lib/realtime/use-realtime-table.ts                              # hook genérico: postgres_changes por bill_id -> invalida query do TanStack Query
components/providers/query-provider.tsx                         # QueryClientProvider global (app/layout.tsx)
components/bills/{create-bill-dialog,invite-qr-panel,item-form-dialog,delete-item-button,items-list,parts-stepper,item-split,close-bill-button,bill-summary}.tsx
```

Ainda não existentes, previstos no plano: `bills/[billId]/participants`, `receipt`, `groups`.

## Progresso

### Fase 0 — Fundação ✅ completa
Next.js + Tailwind + shadcn, Supabase provisionado via Vercel Marketplace, schema inicial + RLS + triggers, `profiles` auto-criado no signup, login Google funcionando ponta a ponta.

### Fase 1 — Núcleo colaborativo (em andamento)
1. ✅ `createBill` + listagem no dashboard (via dialog, redireciona pra página da conta).
2. ✅ Geração de convite: `bill_invites` + `InviteQrPanel` (link + QR via `qrcode.react`).
3. ✅ Rotas públicas `join/[inviteToken]` (resolve via service-role) + `api/invites/accept` (grava `bill_participants` via service-role, pós-login, com `next=` propagado pelo fluxo de login).
4. ✅ CRUD de `items` em `items/page.tsx`.
5. ✅ `lib/split/calculate.ts` + `validate.ts` pro modo `parts` (arredondamento por maior resto) + 24 testes Vitest.
6. ✅ Tela `items/[itemId]/split` pro modo `parts` (stepper +/- de partes por participante).
7. ✅ Tela `summary/page.tsx`: total por participante (subtotal + taxa via `applyServiceTax`), aviso de itens não divididos, ação "Fechar conta".
8. ✅ TanStack Query + `lib/realtime/use-realtime-table.ts` (`postgres_changes` por `bill_id`), em commits separados por tela: infra + itens, split, resumo. `bills`/`bill_participants` ficaram fora dessa rodada (sem realtime ainda).
9. ⬜ Updates otimistas nas mutações de itens/partes, reconciliando com o eco do Realtime. **Próximo passo.**
10. ⬜ **Checkpoint de saída**: duas contas Google diferentes, dois navegadores, convidadas pra mesma conta, editando itens/partes e vendo a mudança uma da outra sem recarregar.

### Fase 2 — IA de leitura de cupom (não iniciada)
Bucket privado `receipts`, upload, `api/ai/extract-receipt` (`generateObject` + Zod via AI Gateway), tela de revisão obrigatória antes de gravar em `items`.

### Fase 3 — Grupos, % / valor fixo, compartilhamento público (não iniciada)
`groups`/`group_members` UI, adicionar participantes em bulk a partir de grupo, estender split pra `percent`/`fixed`, página pública `share/[shareToken]`, botão compartilhar.

### Fase 4 — Fora do MVP, só se der tempo (não iniciada)
Exportar PDF/imagem, notificações, polimento mobile/acessibilidade, Playwright.

## Testes
- Vitest instalado, foco em `lib/split/{calculate,validate}.ts` (24 testes): modo `parts` isolado, combinações entre itens, arredondamento (maior resto), taxa de serviço, itens não divididos, casos de borda de validação.
- RLS: validar direto contra o Postgres remoto via `psql` com JWT simulado (ver gotcha acima) antes de testar no navegador.
