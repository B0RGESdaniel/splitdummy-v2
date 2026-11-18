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

`profiles` (+ `avatar_key`, 4 valores fixos) · `groups` + `group_members` · `bills` (status open/closed) · `bill_participants` (+ `avatar_key`, mesmo domínio de `profiles`) · `bill_invites` (token, expiração, revogável) · `items` · `item_shares` (share_type: parts/percent/fixed) · `receipts`.

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
app/(bill)/bills/[billId]/layout.tsx                            # chrome mínimo da conta, num grupo de rota próprio separado de (dashboard) — faz seu próprio auth-gate porque não compartilha ancestral com app/(dashboard)/layout.tsx. Só masthead (nome da conta + botão Sair) e, pra quem é dono, a barra "Compartilhar" (InviteQrPanel); a grade de campos Dono/Participantes/Status não mora mais aqui, ver items/page.tsx. Aplica o escopo `.paper-check` (fontes Bitter/Kalam/Archivo Narrow, uppercase) na tela inteira
app/(bill)/bills/[billId]/page.tsx                              # sem conteúdo próprio: redireciona pra /items (landing da conta, tela principal)
app/(bill)/bills/[billId]/participants/{page.tsx,actions.ts}    # "a mesa": grid CSS vista de cima, dono na cabeceira (3 colunas) + participantes alternando esquerda/direita por linha, coluna central decorativa ligando as fileiras; cada assento é um avatar (AvatarIcon, 4 ilustrações fixas) + nome + badge; vaga vazia tracejada "+" abre AddGuestDialog (com AvatarPicker); tocar no próprio assento sem avatar ainda abre SelfAvatarDialog (setOwnAvatar, grava em profiles, funciona mesmo com a conta fechada); link "← Itens" no topo (BackToItemsLink)
app/(bill)/bills/[billId]/items/{page.tsx,actions.ts}           # tela principal da conta. Grade de campos Dono/Participantes/Status no topo (Participantes é link pra /participants); CRUD de itens como tabela HTML (ItemsList client, realtime) com 3 colunas (Descrição tocável abre ItemFormDialog de editar/excluir · stepper de Qtd inline, increment/decrementItemQuantity · botão Dividir abre ItemSplitDialog, reaproveita ItemSplit); botão "fecha para mim" no fim leva pro Resumo
app/(bill)/bills/[billId]/summary/page.tsx                      # resumo "cupom fiscal" — mundo visual próprio dentro de `.paper-check` (classe `.cupom-fiscal`, Courier Prime em tudo + DotGothic16 restrita a dígitos/"R$"/frações via utilitário `.font-digits`), mesmo aberta ou fechada a conta (sem pré-visualização separada); taxa, aviso de não-divididos, fechar conta (BillSummary client, realtime); link "← Itens" no topo (BackToItemsLink)
components/theme-scope.tsx                                      # ThemeScope/usePortalContainer — publica o nó DOM do escopo de tema pra Dialogs (Radix Portal) herdarem os tokens via `container`, já que portal não é descendente no DOM real
app/(public)/join/[inviteToken]/page.tsx                        # resolve convite via service-role
app/api/invites/accept/route.ts                                 # aceita convite via service-role: cria participante novo ou reivindica um convidado existente
lib/supabase/{server,client,service-role}.ts, database.types.ts
lib/split/{calculate,validate}.ts                               # matemática pura da divisão (parts) + taxa de serviço
lib/realtime/{use-realtime-table,use-remote-change-flash}.ts    # hook genérico postgres_changes por bill_id -> invalida query do TanStack Query; + hook de flash visual (classe `realtime-flash`) quando a mudança vem de outro participante, não da própria mutation otimista
components/providers/query-provider.tsx                         # QueryClientProvider global (app/layout.tsx)
components/bills/{create-bill-dialog,invite-qr-panel,item-form-dialog,delete-item-button,items-list,back-to-items-link,item-split-dialog,create-item-button,parts-stepper,item-split,close-bill-button,bill-summary,service-tax-editor,add-guest-dialog,remove-participant-button,bill-status-badge,confirm-delete-button,avatar-icon,avatar-picker,self-avatar-dialog}.tsx
```

`BillTabs` e a rota `split/page.tsx` (SplitWorkspace) foram removidos — não há mais navegação por abas (ver Bloco C abaixo).

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
     - **Estado implementado até agora** (2026-11-14): escopo de tema `.paper-check` com paleta papel+tinta+vermelho (2ª versão, mais fosca/texturizada que a 1ª), textura de grão via SVG, fonte-base corrigida pra não vazar Poppins (depois trocada pra JetBrains Mono, ver passo 1 abaixo), botões com borda mais grossa no outline. Cards viraram linhas com régua em Itens e Participantes.
     - ✅ **Passo 1 — base visual** (fundo/tipografia/tabela/botões): fonte-base do app virou **JetBrains Mono** dentro de `.paper-check`; Bitter ficou só pro nome da conta no cabeçalho. Manuscrita (Caveat) restrita só à descrição do item — nome do participante foi perguntado de novo, usuário escolheu manuscrita numa primeira resposta e depois voltou atrás no mesmo dia, pedindo mono igual ao resto (Participantes, Dividir e Resumo ficaram só com `font-medium`/peso, sem classe de fonte especial — herdam o mono da base). Lista de itens ganhou grade real (colunas qtd/descrição/valor com régua vertical e horizontal, `components/bills/items-list.tsx`). Botões e badges com raio zero (`border-radius: 0 !important` escopado em `[data-slot="button"]`/`[data-slot="badge"]`). Typecheck/lint/testes limpos.
       - ⚠️ **SUPERSEDIDA em 2026-11-14 (sessão seguinte) — ver "Passo 3" abaixo.** JetBrains Mono saiu como fonte-base: o usuário achou que o selo "fechada" parecia carimbo, não texto pré-impresso. Virou **Archivo Narrow** na comanda (Itens/Participantes/cabeçalho); JetBrains Mono não é mais usada em lugar nenhum do app.
     - ✅ **Passo 2 — "Dividir" virou diálogo**: removida a rota `/split` e o `SplitWorkspace` (seletor de item). Cada linha da lista de Itens agora abre um Dialog (`ItemSplitDialog`, mesmo padrão do "Editar item") reaproveitando `ItemSplit` sem alteração de lógica — só o jeito de chegar lá mudou. `ItemSplit.initialShares` ficou opcional (busca via TanStack Query ao abrir o Dialog, sem dado vindo de uma rota própria). `items/page.tsx` passou a buscar `bill_participants` (antes só a `split/page.tsx` fazia isso) pra alimentar o Dialog. `BillTabs` caiu de 4 pra 3 abas (Itens/Participantes/Resumo) — a troca visual pra "vias" empilhadas é o próximo passo, separado.
     - ⏸️ **Navegação em "vias" — adiada, não decidida se entra.** Usuário escolheu a versão fiel à referência (pilha de folhas completas, não só abas tipo ficha/pasta), o que exigiria fundir as 3 rotas atuais (`/items`, `/participants`, `/summary`) numa só pra manter as 3 montadas ao mesmo tempo — mudança de arquitetura grande o bastante pra parar e perguntar antes de fazer (regra do `CLAUDE.md`). Resposta do usuário: "vamos deixar isso para depois, não sei se vou querer manter isso depois que as outras alterações forem feitas" — ou seja, não é só adiar a implementação, é reabrir se a ideia sobrevive depois do resto do redesign. Não assumir nenhuma das duas arquiteturas (fundir rotas vs. Parallel Routes) sem perguntar de novo quando/se isso for retomado.
     - ✅ **Cabeçalho novo (v1, pré-revisão)**: cabeçalho da conta virou 2 linhas. A de cima é o "masthead": uma logo mínima proposta por mim (`ReceiptMark`, SVG de comanda com borda serrilhada, ainda não validada pelo usuário — reagir se pedir ajuste), nome da conta centralizado em Bitter, e o status aberta/fechada saiu da linha das abas e virou uma caixinha sólida no canto (`BillStatusBadge`: tinta/ink quando aberta, vermelho só quando fechada — não os dois estados em cor, pra manter o vermelho reservado como sinal, conforme a estratégia de cor da direção). A de baixo é a barra de utilidades (Compartilhar + Sair), que já existia. `BillTabs` ficou só com as 3 abas, sem o badge que carregava antes. **Essa versão está sob revisão — ver "Passo 3" abaixo, usuário achou os dois cabeçalhos inconsistentes e Sair/Compartilhar "soltos".**
     - ✅ **`/impeccable critique` rodado em 2026-11-14** sobre a superfície inteira da conta (cabeçalho + Itens + Participantes + Resumo + diálogo de dividir). Método dual-agent (revisão de design isolada + detector). Nota 27/40 ("aceitável"). Achados principais: Resumo quebra a identidade visual no momento mais importante (não segue a régua de Itens); cor âmbar fora do sistema de sinal em `item-split.tsx` (aviso de item não dividido); dois pontos de deriva da regra de manuscrita; badge de status aquém do brief original; nenhum sinal visual de mudança em tempo real feita por outro participante. Relatório completo salvo em `.impeccable/critique/2026-11-14T12-22-43Z__app-bill-bills-billid-items-page-tsx.md`. **O achado "Resumo deveria copiar a régua de Itens" foi substituído** pela decisão do Passo 3 abaixo (Resumo vira um mundo visual próprio, não uma cópia de Itens) — mais específico pro produto do que a sugestão original da crítica. Os outros achados (cor âmbar, deriva de manuscrita, badge, sinal de realtime) continuam válidos e pendentes, não cobertos pelo Passo 3.
     - ✅ **Passo 3 — tipografia, cor e arquitetura visual, fechado em 2026-11-16.** Partiu do critique acima + comparações ao vivo em artifacts. Tudo que tinha ficado como "pendente, decidir depois" na rodada anterior foi resolvido nesta mesma leva de commits (detalhe completo, entrada por entrada, no changelog do `TCC.md` — o que segue é o resumo do estado final):
       - **Resumo é "cupom fiscal"**, mundo visual próprio (`.cupom-fiscal`): Courier Prime em tudo + DotGothic16 restrita a dígitos/"R$"/frações (`.font-digits`). Estrutura por pessoa em `Accordion` (nome + subtotal na linha do trigger, itens + fração de partes só expandido). **Decisão sobre conta aberta**: sem pré-visualização separada — o cupom fiscal é o único visual do Resumo, aberta ou fechada a conta; o que muda é só a presença dos controles de edição (taxa editável, botão fechar).
       - **Comanda (Itens/Participantes/cabeçalho)**: fonte-base final é **Archivo Narrow** (uppercase, via `.paper-check`) — passou por JetBrains Mono antes, descartada por parecer terminal/código. Manuscrita final é **Kalam** (não Caveat, pouco legível) — restrita à descrição do item e ao preenchimento dos campos Dono/Participantes no cabeçalho, com cor própria `--ink-handwritten` (tinta quase preta) pra não perder contraste contra o azul vívido da estrutura.
       - **Paleta "Royal"**: azul royal saturado virou a cor base de todo o escopo (`--foreground`/`--primary`, não só bordas/rótulos); a variável intermediária `--ink-structural` foi removida por redundância. Vermelho continua reservado só como cor de sinal (fechamento/ações destrutivas).
       - **Cabeçalho reestruturado em 2 blocos**, batendo com a referência "guest check": (1) masthead só com nome da conta + botão de Sair (ícone, sem logo nem selo disputando espaço — resolve a inconsistência "Sair é ação de usuário, Compartilhar é ação da conta" levantada antes: Sair subiu pro masthead, Compartilhar ficou só na barra de utilidades abaixo, visível só pra quem é dono); (2) a grade de campos Dono/Participantes/Status (com `BillStatusBadge`) desceu pra `items/page.tsx` — não é mais chrome global do layout, é conteúdo da tela principal. `ReceiptMark` (logo provisória) foi removida, nunca chegou a ser validada.
       - **Navegação por abas removida de vez** (`BillTabs` deletado): Itens é a tela principal; Participantes se acessa tocando no número de participantes da grade; Resumo via botão "fecha para mim" (`ConciergeBell`) no fim da lista de Itens. A questão de "vias empilhadas" (ver nota abaixo) ficou sem efeito — não há mais 3 abas simétricas pra fundir.
       - **Participantes virou "a mesa"**: visão de cima da conta (referência ao dito "quem senta na ponta paga a conta") — dono na cabeceira, participantes alternando lado a lado conforme entram. Avatar é um conjunto fixo de 4 ilustrações (`avatar_key` em `profiles`/`bill_participants`, ver Modelo de dados) — cada um escolhe o próprio tocando no próprio assento (`SelfAvatarDialog`), convidado sem conta recebe o avatar escolhido pelo dono no `AddGuestDialog`. Resolve a pergunta "o que significa baixo destaque pra essa tela visualmente" — não ficou mais leve que Itens, ganhou uma linguagem própria.
       - **Linha de item na lista redesenhada**: tabela HTML de 3 colunas (Descrição / Qtd / Dividir) — descrição tocável abre o diálogo de editar (excluir virou ação de risco dentro desse diálogo, não mais ícone solto na lista), stepper de quantidade inline (`incrementItemQuantity`/`decrementItemQuantity`, mesmo padrão otimista das mutations de partes), botão de dividir abre o `ItemSplitDialog`. Coluna "Total" foi descartada (só serve pra conferência contra o cupom físico, não é dado de divisão) — preço unitário/total voltou a ser subtexto da descrição.
       - Achados do critique de 2026-11-14, todos endereçados: cor âmbar trocada por `Alert variant="warning"` (tinta + borda tracejada) em `item-split.tsx` e no aviso de itens não divididos do Resumo; badges "dono"/"convidado" em Participantes diferenciados (preenchimento sólido vs. borda tracejada); badge de status com mais peso visual + leve rotação só no estado "fechada" (efeito carimbo); sinal de mudança remota via Realtime — flash breve na cor de tinta (`useRemoteChangeFlash`, classe `realtime-flash`) em Itens e Dividir quando a mudança vem de outro participante, não da própria mutation otimista. `create-item-button.tsx` manteve a manuscrita de propósito (preferência direta do usuário, não é mais desvio a corrigir).
     - ⏸️ **Navegação em "vias" (pilha de folhas) — não decidida, e agora sem pré-requisito claro.** Tinha ficado adiada porque exigiria fundir Itens/Participantes/Resumo numa única rota pra manter as 3 montadas ao mesmo tempo. Como a navegação por abas simétrica foi removida (Itens é a tela principal, as outras duas são destinos contextuais), não está claro se essa ideia ainda se aplica da mesma forma — não assumir nenhuma arquitetura nem retomar sem perguntar de novo ao usuário primeiro.
     - **Combinado sobre quando usar comandos `/impeccable` nomeados** (não é tarefa, é calibração de processo pra lembrar): enquanto o usuário está dando feedback direto e específico, isso já cobre o papel do `critique`. Comandos como `critique`/`audit`/`polish` valem a pena quando tiver mais tela pronta e precisar de uma checagem sistemática/de fora; `document` (gera `DESIGN.md` de verdade) só faz sentido quando essa rodada de redesign estiver de fato fechada — ainda não rodado.
   - Detalhe completo do plano original de dark mode: `/Users/danielborges/.claude/plans/unified-jumping-hennessy.md`.
   - ✅ **Bloco C encerrado.** `/impeccable document` rodado em 2026-11-17: `DESIGN.md` (raiz do repo) + sidecar `.impeccable/design.json` carbonizam a direção construída — North Star "Da Comanda ao Cupom". Nessa conversa o usuário também declarou uma direção de produto nova, ainda não implementada: o histórico de contas (dashboard) deve eventualmente adotar a linguagem de cupom fiscal pra visualizar contas antigas, em vez do tema genérico atual — considerar na Fase 3/4 quando o dashboard entrar em pauta.

### Fase 2 — IA de leitura de cupom (**próxima fase**)
Bucket privado `receipts`, upload, `api/ai/extract-receipt` (`generateObject` + Zod via AI Gateway), tela de revisão obrigatória antes de gravar em `items`.

### Fase 3 — Grupos, % / valor fixo, compartilhamento público (não iniciada)
`groups`/`group_members` UI, adicionar participantes em bulk a partir de grupo, estender split pra `percent`/`fixed`, página pública `share/[shareToken]`, botão compartilhar.

### Fase 4 — Fora do MVP, só se der tempo (não iniciada)
Exportar PDF/imagem, notificações, polimento mobile/acessibilidade, Playwright.

## Testes
- Vitest instalado, foco em `lib/split/{calculate,validate}.ts` (24 testes): modo `parts` isolado, combinações entre itens, arredondamento (maior resto), taxa de serviço, itens não divididos, casos de borda de validação.
- RLS: validar direto contra o Postgres remoto via `psql` com JWT simulado (ver gotcha acima) antes de testar no navegador.
