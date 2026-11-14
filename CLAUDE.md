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
| Login | Supabase Auth, **só Google OAuth** pra quem edita algo. **Participante pode existir sem conta** (cadastrado pelo organizador, só com nome) — reabertura da decisão original, ver TCC.md |
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
  - **Nível de detalhe**: entrada de changelog é nível produto/arquitetura (o quê e por quê), não code review. Cite nome de arquivo/função só quando isso for parte do que vale explicar no artigo (ex. um padrão técnico novo, tipo o passo 8 da Fase 1 sobre Realtime). Pra um ajuste pontual de UX/produto, uma frase basta.
    - ❌ Detalhe demais: "`getOrCreateActiveInvite` (`bills/actions.ts`) busca o convite ativo ou já cria um, chamado direto na `BillPage` antes de renderizar."
    - ✅ Nível certo: "Convite deixa de exigir um clique extra: o link já vem gerado quando o dono abre a tela de compartilhamento."

## Estrutura do app

```
app/(auth)/login, auth/callback
app/(dashboard)/page.tsx                                       # histórico de contas (dialog "Nova conta") — ainda no tema antigo (zinc/dark), fora do escopo da direção visual nova
app/(dashboard)/bills/actions.ts                                # createBill, createInvite, regenerateInvite, closeBill — compartilhado pelos dois grupos de rota abaixo
app/(bill)/bills/[billId]/layout.tsx                            # piloto da direção visual "guest check": chrome completo da conta (header com logo+Sair, cabeçalho da conta, BillTabs) num grupo de rota próprio, separado de (dashboard) — faz seu próprio auth-gate porque não compartilha ancestral com app/(dashboard)/layout.tsx. Aplica o escopo `.paper-check` (fontes Bitter/Caveat) na tela inteira, não só no conteúdo
app/(bill)/bills/[billId]/page.tsx                              # sem conteúdo próprio: redireciona pra /items (landing da conta)
app/(bill)/bills/[billId]/participants/{page.tsx,actions.ts}    # lista + adicionar convidado (sem conta) + remover
app/(bill)/bills/[billId]/items/{page.tsx,actions.ts}           # CRUD de itens (ItemsList client, realtime) + ações de partes (increment/decrementItemPart, usadas pela aba Dividir)
app/(bill)/bills/[billId]/split/page.tsx                        # aba "Dividir": seletor de item (SplitWorkspace client) + participantes sempre visíveis, sem navegação de rota; aceita ?item= pra abrir com um item pré-selecionado
app/(bill)/bills/[billId]/summary/page.tsx                      # resumo, taxa, aviso de não-divididos, fechar conta (BillSummary client, realtime)
components/theme-scope.tsx                                      # ThemeScope/usePortalContainer — publica o nó DOM do escopo de tema pra Dialogs (Radix Portal) herdarem os tokens via `container`, já que portal não é descendente no DOM real
app/(public)/join/[inviteToken]/page.tsx                        # resolve convite via service-role
app/api/invites/accept/route.ts                                 # aceita convite via service-role: cria participante novo ou reivindica um convidado existente
lib/supabase/{server,client,service-role}.ts, database.types.ts
lib/split/{calculate,validate}.ts                               # matemática pura da divisão (parts) + taxa de serviço
lib/realtime/use-realtime-table.ts                              # hook genérico: postgres_changes por bill_id -> invalida query do TanStack Query
components/providers/query-provider.tsx                         # QueryClientProvider global (app/layout.tsx)
components/bills/{create-bill-dialog,invite-qr-panel,item-form-dialog,delete-item-button,items-list,bill-tabs,split-workspace,create-item-button,parts-stepper,item-split,close-bill-button,bill-summary,service-tax-editor,add-guest-dialog,remove-participant-button}.tsx
```

Ainda não existentes, previstos no plano: `receipt`, `groups`.

## Progresso

### Fase 0 — Fundação ✅ completa
Next.js + Tailwind + shadcn, Supabase provisionado via Vercel Marketplace, schema inicial + RLS + triggers, `profiles` auto-criado no signup, login Google funcionando ponta a ponta.

### Fase 1 — Núcleo colaborativo ✅ completa
1. ✅ `createBill` + listagem no dashboard (via dialog, redireciona pra página da conta).
2. ✅ Geração de convite: `bill_invites` + `InviteQrPanel` (link + QR via `qrcode.react`).
3. ✅ Rotas públicas `join/[inviteToken]` (resolve via service-role) + `api/invites/accept` (grava `bill_participants` via service-role, pós-login, com `next=` propagado pelo fluxo de login).
4. ✅ CRUD de `items` em `items/page.tsx`.
5. ✅ `lib/split/calculate.ts` + `validate.ts` pro modo `parts` (arredondamento por maior resto) + 24 testes Vitest.
6. ✅ Tela `items/[itemId]/split` pro modo `parts` (stepper +/- de partes por participante).
7. ✅ Tela `summary/page.tsx`: total por participante (subtotal + taxa via `applyServiceTax`), aviso de itens não divididos, ação "Fechar conta".
8. ✅ TanStack Query + `lib/realtime/use-realtime-table.ts` (`postgres_changes` por `bill_id`), em commits separados por tela: infra + itens, split, resumo. `bills`/`bill_participants` ficaram fora dessa rodada (sem realtime ainda).
9. ✅ Updates otimistas nas mutações de itens/partes, reconciliando com o eco do Realtime (stepper de partes + CRUD de itens, todos via `useMutation` + `onMutate`/`onError`).
10. ✅ **Checkpoint de saída**: duas contas Google diferentes, dois navegadores, convidadas pra mesma conta, editando itens/partes e vendo a mudança uma da outra sem recarregar. Validado pelo usuário em 2026-10-20, sem bugs.

### Pós-Fase 1 — Ajustes de uso real (em andamento, antes da Fase 2)
Plano completo: `/Users/danielborges/.claude/plans/unified-jumping-hennessy.md`.
1. ✅ Bloco 1 — convite sem clique extra (`getOrCreateActiveInvite`) + taxa de serviço editável (`updateServiceTax`).
2. ✅ Bloco A — participante sem conta: `bill_participants.profile_id` nullable + `display_name`, `item_shares.participant_id`, tela `participants/page.tsx` (adicionar convidado/remover), fluxo de reivindicação em `join/[inviteToken]` + `api/invites/accept`.
3. ✅ Bloco B — navegação por abas (Itens/Participantes/Dividir/Resumo, `BillTabs`) substituindo a antiga tela "hub" com lista de botões (removida — `/bills/[billId]` só redireciona pra `/items`); "Dividir" é aba própria (`split/page.tsx` + `SplitWorkspace`, seletor de item, aceita `?item=` pra deep link a partir da lista de itens); botão "Compartilhar" (`InviteQrPanel`) migrou pra aparecer no topo de qualquer aba, não mais numa tela própria.
4. ⬜ **Bloco C — próximo passo**: passada de design/UX antes de seguir pra Fase 2. Começou como ajuste de paleta dark mode, mas expandiu depois de um levantamento geral de inconsistências de UI/fluxo — direção visual final ainda em definição com o usuário, que quer algo mais característico do domínio "dividir conta de bar/restaurante" em vez de um dark mode genérico (zinc + azul).
   - Motivação original da paleta (ainda válida, só não é mais o único objetivo do bloco): hoje `app/globals.css` usa cinza quase puro (baixo croma) em quase tudo, só com azul isolado em `--primary`/`--ring` do dark mode — sem profundidade real entre superfícies.
   - **Parte 1/2 ✅ — ajustes de UX/fluxo** (levantados em revisão de código, 2026-11-13; ver `TCC.md` pra detalhe): confirmação de ações destrutivas, hierarquia visual de botões, badges, cor de avisos, toasts de erro/sucesso e copy divergente, todos resolvidos sem tocar na paleta.
   - **Parte 2/2 ⬜ — direção visual**: em andamento com o plugin/skill Impeccable. `impeccable init` rodado (`PRODUCT.md` na raiz) e `shape` fechou a direção "guest check" (papel + tinta azul-marinho/vermelho + duas vozes tipográficas) num surface brief (`.impeccable/surfaces/`). **Piloto estendido pras 4 abas da conta** (Itens/Participantes/Dividir/Resumo), incluindo a barra superior (logo+Sair) — por isso as rotas de conta migraram de `app/(dashboard)/bills/[billId]` pra um grupo de rota próprio, `app/(bill)/bills/[billId]`, com chrome e auth-gate independentes de `app/(dashboard)/layout.tsx` (ver "Estrutura do app" e "Decisões técnicas notáveis"). Fora da conta (dashboard/histórico, login) segue no tema antigo. Typecheck, lint, testes (`npm test`) e `impeccable detect` limpos a cada rodada.
     - **Estado implementado até agora** (2026-11-14): escopo de tema `.paper-check` com paleta papel+tinta+vermelho (2ª versão, mais fosca/texturizada que a 1ª), textura de grão via SVG, fonte-base corrigida pra não vazar Poppins (mas essa decisão de fonte-base **vai mudar** — ver próxima sessão), botões com borda mais grossa no outline. Cards viraram linhas com régua em Itens e Participantes.
     - **Próxima sessão — retomar daqui, nessa ordem** (usuário foi dormir em 2026-11-14 depois de fechar essas decisões, nada abaixo foi implementado ainda):
       1. **Fundo/tipografia/tabela/botões** (base visual, menor risco, independente do resto):
          - Fonte-base do app vira **JetBrains Mono** (não mais Bitter) — efeito de comanda impressa/matricial. Bitter fica reservado só pro nome da conta no cabeçalho (ver passo 4).
          - Manuscrita (Caveat) fica restrita só à **descrição do item**. Nome de participante: **ainda em aberto** — usuário disse que vai decidir (não assumir mono nem manuscrita sem perguntar de novo).
          - Lista de itens ganha régua de tabela de verdade: linhas horizontais **e verticais** separando descrição/qtd/preço, tipo a grade do guest check de referência (não só a linha fina `divide-y` atual).
          - Botões: cantos quadrados/retos (sem neobrutalismo — usuário pediu e depois recuou da sombra dura/efeito de pressionar; manter só o visual quadradão).
       2. **"Dividir" vira diálogo**: em vez de aba/rota própria (`/split`, `SplitWorkspace`), cada item na lista de Itens abre um Dialog (mesmo padrão do "Editar item") com os participantes + steppers do `ItemSplit` reaproveitado. Remove a rota `/split` e o seletor de item.
       3. **Navegação em "vias"**: depende do passo 2 (reduz de 4 pra 3 áreas: Itens, Participantes, Resumo). Troca a `BillTabs` atual (abas sublinhadas) por um visual de vias empilhadas tipo talão de papel carbono — via ativa na frente, as outras duas espiando atrás/do lado com leve rotação/sombra; tocar na borda visível traz aquela via pra frente com transição de deslize.
       4. **Cabeçalho novo**: logo mínima à esquerda (ainda sem asset — Claude propõe um SVG simples e o usuário reage), nome da conta centralizado na fonte antiga/retrô (Bitter), badge "aberta/fechada" sai da linha das abas e vira uma caixinha colorida no canto do cabeçalho (ecoando o número vermelho do print de referência).
     - **Combinado sobre quando usar comandos `/impeccable` nomeados** (não é tarefa, é calibração de processo pra lembrar): enquanto o usuário está dando feedback direto e específico (como agora), isso já cobre o papel do `critique`. Comandos como `critique`/`audit`/`polish` valem a pena quando tiver mais tela pronta e precisar de uma checagem sistemática/de fora; `document` (gera `DESIGN.md` de verdade) só faz sentido quando essa rodada de redesign estiver de fato fechada.
   - Detalhe completo do plano original de dark mode: `/Users/danielborges/.claude/plans/unified-jumping-hennessy.md`.

### Fase 2 — IA de leitura de cupom (**próxima fase**)
Bucket privado `receipts`, upload, `api/ai/extract-receipt` (`generateObject` + Zod via AI Gateway), tela de revisão obrigatória antes de gravar em `items`.

### Fase 3 — Grupos, % / valor fixo, compartilhamento público (não iniciada)
`groups`/`group_members` UI, adicionar participantes em bulk a partir de grupo, estender split pra `percent`/`fixed`, página pública `share/[shareToken]`, botão compartilhar.

### Fase 4 — Fora do MVP, só se der tempo (não iniciada)
Exportar PDF/imagem, notificações, polimento mobile/acessibilidade, Playwright.

## Testes
- Vitest instalado, foco em `lib/split/{calculate,validate}.ts` (24 testes): modo `parts` isolado, combinações entre itens, arredondamento (maior resto), taxa de serviço, itens não divididos, casos de borda de validação.
- RLS: validar direto contra o Postgres remoto via `psql` com JWT simulado (ver gotcha acima) antes de testar no navegador.
