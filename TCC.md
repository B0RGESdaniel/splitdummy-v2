# TCC — Splitdummy v2

Documentação de apoio pra escrita do artigo do TCC (Sistemas de Informação). Não é a fonte de verdade operacional do projeto (isso é o `CLAUDE.md`) — este arquivo registra **o que foi feito, com que ferramenta e por quê**, pra servir de matéria-prima quando for escrever o artigo. Atualizado a cada funcionalidade/ferramenta nova (ver regra no `CLAUDE.md`).

## Contexto

Evolução do [splitdummy v1](https://github.com/B0RGESdaniel/splitdummy) — SPA mono-usuário, React + Vite + TS + Tailwind + Radix, estado 100% em `localStorage`, sem conta, sem backend, sem colaboração — pra um app **multi-usuário e colaborativo em tempo real** de divisão de contas de bar/restaurante.

## Stack

| Camada | Escolha | Versão (na época da decisão) |
|---|---|---|
| Framework | Next.js App Router | 16.4.2 |
| Linguagem | TypeScript, strict mode | ^5 |
| UI | React | 19.3.0 |
| Estilo | Tailwind CSS | ^4 |
| Componentes | shadcn/ui (base radix, preset nova) + `radix-ui` | ^1.8.1 |
| Ícones | lucide-react | ^1.59.0 |
| Backend | Supabase (Postgres + Auth + Realtime + Storage), provisionado via Vercel Marketplace | — |
| Acesso a dados | `@supabase/supabase-js` direto, sem ORM — autorização inteira via RLS | ^2.118.0 |
| SSR/cookies Supabase | `@supabase/ssr` | ^0.12.7 |
| Login | Supabase Auth, só Google OAuth (sem convidado anônimo) | — |
| Estado/colaboração cliente | TanStack Query (`@tanstack/react-query`) | ^5.104.4 |
| Colaboração em tempo real | Supabase Realtime (`postgres_changes`, via publication `supabase_realtime`) | — |
| Convite | Link + QR code (mesmo link) via `qrcode.react` | ^4.2.0 |
| Notificações in-app | sonner | ^2.0.8 |
| Testes | Vitest | ^5.0.5 |
| Deploy | Vercel | — |

Ainda não incorporado (planejado): Vercel AI SDK (`generateObject` + Zod via AI Gateway) pra leitura de cupom fiscal (Fase 2).

## Regras de negócio

### Pilares do produto
1. Contas multi-usuário e compartilháveis (convite por link + QR code).
2. Histórico de contas.
3. Leitura de cupom fiscal por foto via IA (pré-popula itens, revisão humana obrigatória antes de gravar) — ainda não implementado.
4. Grupos recorrentes simples (lista privada de participantes pra agilizar convite) — ainda não implementado.
5. Divisão por partes, porcentagem ou valor fixo. Exportar/compartilhar resultado — só o modo `parts` implementado até agora.

### Decisões de modelagem/arquitetura
- **Autorização**: 100% via RLS do Postgres, sem camada de autorização na aplicação.
- **Permissões dentro de uma conta**: totalmente colaborativo — qualquer participante edita itens/partes de qualquer um; só o dono convida/remove participantes; autorremoção sempre permitida.
- **Convite**: um link ativo por conta; "regenerar" revoga o atual e cria um novo. Entrada só por link/QR, sem e-mail.
- **Fechamento de conta**: imutável, sem reabrir. Ao fechar, um trigger de banco (`protect_bill_lifecycle`) grava `closed_at` e gera `share_token` (pra página pública de compartilhamento, Fase 3). Só o dono pode fechar.
- **Arredondamento**: método do maior resto (largest remainder) — garante que a soma dos valores por participante sempre reconcilia exatamente com o total, tanto na divisão por partes de um item quanto na aplicação da taxa de serviço sobre o total da conta.
- **Taxa de serviço**: aplicada sobre o subtotal de cada participante, redistribuindo o total-com-taxa proporcionalmente (mesmo método do maior resto), não um cálculo independente por pessoa.

## Decisões técnicas notáveis (material pra discussão no artigo)

### Por que largest remainder em vez do arredondamento do v1
O v1 calculava `partPrice = totalPrice / totalParts` (arredondado pra 2 casas) e multiplicava por `part` pra cada participante, cada conta arredondada **independentemente**. Isso não garante que a soma bata com o total — ex.: item de R$10,00 em 3 partes iguais perde 1 centavo (3 × R$3,33 = R$9,99). O v2 resolve isso trabalhando em centavos inteiros e redistribuindo o resíduo de arredondamento (a diferença entre o total e a soma dos valores truncados) pros participantes com maior resíduo fracionário, até a soma fechar exatamente — é o mesmo método usado em sistemas de apuração eleitoral e em sistemas financeiros pra fechar centavos. Implementado em `lib/split/calculate.ts`.

Importante: isso **não substitui** a detecção de "item não dividido" (ninguém com partes > 0) — essa é uma validação separada, ortogonal ao arredondamento, e o v1 já tinha algo parecido (`getNotDivivedItems()`). No v2 isso é `getUnsplitItemIds()`, usado na tela de resumo.

### Gotcha de RLS: INSERT...RETURNING filtrado pela policy de SELECT
`INSERT ... RETURNING` é filtrado pela política de **SELECT** da tabela, não só pelo `WITH CHECK` do insert — e isso acontece **antes** de qualquer trigger `AFTER INSERT`. Se a política de select de uma tabela depende de uma linha-filha criada só depois (ex.: dono só é "participante" depois de inserir em `bill_participants`), o `RETURNING` do insert do pai falha com RLS mesmo com sessão válida. Encontrado em `bills` (corrigido alargando a política de select pra `owner_id = auth.uid() OR is_bill_participant(id)`), documentado pra não repetir em `groups`/`group_members` (Fase 3).

### Supabase Realtime exige tabela na publication
`postgres_changes` do Supabase Realtime só entrega eventos de tabelas explicitamente adicionadas à publication `supabase_realtime` — isso **não é automático** e não aparece em nenhuma config de nível de app, só é visível inspecionando `pg_publication_tables` direto no Postgres. A RLS normal da tabela já controla quem recebe o quê (sem precisar de policy específica de realtime).

### Update otimista + eco do Realtime: por que não causa flicker/duplicação
Sem update otimista, cada clique no stepper de partes dependia de um round-trip completo: Server Action grava no banco → Postgres propaga a mudança pro Realtime → o próprio autor da mudança recebe o eco do seu evento → o listener invalida a query → refetch. Em redes mais lentas isso é perceptível (o número fica "preso" no valor antigo por um instante). A solução foi usar `onMutate` do TanStack Query (`useMutation`) pra escrever o novo valor **direto no cache local**, de forma síncrona, no clique — sem esperar o servidor. Quando o eco do Realtime chega (ou o Server Action falha), a query é invalidada/revertida e o valor otimista é substituído pelo valor real — na prática, imperceptível quando tudo dá certo, e com rollback automático (`onError` restaura o snapshot anterior) quando não dá.

Importante: o valor otimista não "briga" com o eco porque os dois fazem a mesma coisa de formas diferentes — o otimista aplica o delta **imediatamente e localmente**, o eco **confirma a verdade do servidor depois**. Não há necessidade de ignorar/debounce um dos dois.

### Tema com escopo local + Dialog (Radix Portal) não herda CSS por posição no DOM
A direção visual nova ("guest check") foi aplicada só na tela de Itens, via uma classe (`.paper-check`) que sobrescreve as mesmas variáveis CSS (`--background`, `--primary` etc.) já usadas pelo tema global — qualquer componente shadcn que já usa esses tokens (não cor fixa) herda a paleta nova automaticamente, sem precisar reescrever cada componente. Isso funciona porque CSS custom properties seguem a posição no DOM, não a ordem do stylesheet: a declaração mais próxima do elemento vence.

O problema: `Dialog` (Radix) renderiza seu conteúdo num Portal — ou seja, no DOM real, o diálogo não fica dentro da `div` que tem a classe `.paper-check`, fica direto como filho de `<body>`. Resultado: um diálogo aberto a partir da tela de Itens não herdava a paleta nova, mesmo estando visualmente "dentro" da tela na tela do usuário. A correção foi expor o nó DOM do escopo de tema via um Context (`components/theme-scope.tsx`) e passar esse nó como `container` pro `Dialog` (prop que o Radix já aceita nativamente pra portal), fazendo o React portal montar dentro do escopo certo. Vale repetir esse padrão (Context + `container`) em qualquer componente futuro que use portal (Dialog, Dropdown, Tooltip) dentro de uma área com tema isolado.

### Direção visual nova exigiu um grupo de rota próprio, separado do dashboard
Depois de ver o piloto restrito à tela de Itens, o usuário apontou que avaliar a direção visual ficava impossível assim: navegando pelas abas da conta, a área de conteúdo virava papel, mas a barra superior (logo + botão "Sair") e a moldura ao redor continuavam no tema antigo — a experiência parecia um cartão flutuando dentro de um app diferente, não um produto coerente.

A barra superior, porém, é renderizada em `app/(dashboard)/layout.tsx`, compartilhada entre o histórico de contas (fora do escopo dessa rodada) e as telas de uma conta (dentro do escopo). CSS custom properties só herdam na direção pai → filho; como a barra é renderizada *antes* (num ancestral comum) do conteúdo da conta, não tinha como um tema aplicado só dentro de `bills/[billId]` alcançá-la. A solução não foi tentar "empurrar" o tema pra cima com CSS — foi mover as rotas de conta (`bills/[billId]/*`) pra um Route Group do Next.js separado (`app/(bill)/`, antes `app/(dashboard)/bills/[billId]`), que não compartilha layout com o dashboard e por isso pode ter seu próprio chrome (header, auth-gate, tema) do zero, sem herdar nada do tema antigo. Route Groups do Next.js (pastas entre parênteses) não aparecem na URL — a rota pública continua `/bills/[billId]/...` exatamente igual, só a árvore de arquivos/layouts é que mudou.

### font-family só reavalia var() onde é declarada, não onde a custom property muda
Depois de recolorir o mundo "guest check", a fonte antiga (Poppins) continuava aparecendo em botões, inputs, badges e diálogos — só o nome do item e o cabeçalho tinham a fonte nova, porque eram os únicos elementos com uma classe `font-*` explícita. A causa: `font-family` é uma propriedade herdada normalmente em CSS, mas só é *recalculada* onde é de fato declarada. Como `html { font-family: var(--font-sans) }` é a única declaração de `font-family` na árvore, o valor já resolvido (Poppins) ali é o que desce por herança pra todo mundo — redefinir a custom property `--font-sans` mais perto da folha (em `.paper-check`) não tem efeito nenhum se nenhum elemento daquele escopo *redeclara* `font-family` usando essa variável. A correção foi declarar `font-family: var(--font-display)` direto na própria classe `.paper-check`, criando um novo ponto de resolução pra escopo inteiro herdar — o nome do item e os números continuam com suas fontes próprias (manuscrita/mono) porque uma declaração mais específica sempre vence a herdada.

### Por que reabrir "só Google OAuth, sem convidado anônimo"
Essa era uma decisão fechada desde a Fase 0. Na prática, numa conta com muita gente, exigir que todo mundo logue só pra ter o nome registrado é fricção desproporcional ao valor — a maioria só quer ver quanto deve, não interagir. A solução não é abrir acesso anônimo ao app (login continua obrigatório pra quem *edita* algo); é permitir que `bill_participants` represente uma pessoa sem conta (um nome cadastrado pelo organizador), que pode depois ser "reivindicada" por alguém que loga de verdade. Efeito colateral de modelagem: `item_shares` deixou de apontar direto pra `profiles` e passou a apontar pra `bill_participants` — assim uma parte pode ser atribuída a alguém que ainda não tem conta.

## Changelog de funcionalidades e ferramentas

### Fase 0 — Fundação
- Scaffold Next.js 16 App Router + TypeScript strict + Tailwind + shadcn/ui.
- Supabase provisionado via Vercel Marketplace (Postgres + Auth + Realtime + Storage).
- Schema inicial completo (`profiles`, `groups`+`group_members`, `bills`, `bill_participants`, `bill_invites`, `items`, `item_shares`, `receipts`) + RLS + triggers.
- `profiles` auto-criado no signup (trigger em `auth.users`).
- Login Google OAuth ponta a ponta.

### Fase 1 — Núcleo colaborativo
- **Passo 1** — `createBill` (Server Action) + listagem no dashboard. Dono adicionado como participante automaticamente via trigger.
- **Passo 2** — Geração de convite: tabela `bill_invites` (token, expiração, revogável) + componente `InviteQrPanel` (link + QR via `qrcode.react`).
- **Passo 3** — Rotas públicas de convite: `join/[inviteToken]` (resolve via cliente service-role, já que quem acessa ainda não é participante) + `api/invites/accept` (grava `bill_participants` via service-role, pós-login).
- **Passo 4** — CRUD de `items` (Server Actions `createItem`/`updateItem`/`deleteItem`), sem realtime ainda nesse momento.
- **Passo 5** — `lib/split/calculate.ts` + `validate.ts` pro modo `parts`, com arredondamento por maior resto (ver seção de decisões técnicas). 24 testes Vitest cobrindo divisão exata, resto distribuído, proporções desiguais, validação e agregação entre itens. Primeira introdução do Vitest no projeto.
- **Passo 6** — Tela `items/[itemId]/split`: stepper de partes (+/-) por participante, Server Actions fazendo upsert em `item_shares`.
- **Passo 7** — Tela `summary/page.tsx`: total por participante (subtotal + taxa de serviço via `applyServiceTax`), aviso de itens não divididos, ação "Fechar conta" (só dono, conta aberta). Esse passo expôs e corrigiu um bug em `calculateBillTotals` (item com participantes mas todas as partes zeradas lançava erro em vez de ser tratado como "não dividido").
- **Passo 8 ✅** — Introdução de TanStack Query + Supabase Realtime pra colaboração em tempo real:
  - Infra: `QueryClientProvider` global + hook genérico `lib/realtime/use-realtime-table.ts` (assina `postgres_changes` filtrado por `bill_id`, invalida a query do React Query correspondente a cada evento).
  - Habilitada publication `supabase_realtime` pra `items` e `item_shares` (nenhuma tabela estava habilitada até então — é um passo manual, não automático).
  - Telas de itens (`ItemsList`), split (`ItemSplit`) e resumo (`BillSummary`) migradas de fetch só-servidor pra `useQuery` com `initialData` do SSR + realtime. O resumo reusa a mesma `queryKey` `["items", billId]` da tela de itens (cache compartilhado dentro da mesma navegação client-side) e adiciona uma query própria pra `item_shares` escopada no `bill_id` inteiro (diferente da query da tela de split, que é por `item_id`).
  - `bills`/`bill_participants` ficaram de fora dessa rodada (status da conta e lista de participantes continuam só server-rendered) — participantes entrando/saindo ou a conta sendo fechada por outra aba só aparecem ao recarregar. Fica pra quando isso virar um problema real de uso.
- **Passo 9 ✅** — Updates otimistas nas mutações, reconciliando com o eco do Realtime (ver seção de decisões técnicas):
  - Stepper de partes (`ItemSplit`/`PartsStepper`): migrado de `<form action>` (Server Action direto) pra `useMutation` com `onMutate` escrevendo o delta no cache local na hora do clique, e `onError` revertendo pro snapshot anterior se a Server Action falhar.
  - CRUD de itens: `CreateItemButton` (novo componente, dono da mutação de criar — antes o dialog vivia direto na página server-rendered) e `ItemsList` (editar/remover) seguem o mesmo padrão. `ItemFormDialog`/`DeleteItemButton` não precisaram mudar nada — continuam só recebendo uma função `action`, seja ela a Server Action direto ou um `mutation.mutateAsync` por cima dela.
  - Criação otimista usa um id temporário (`optimistic-<uuid>`) só pra existir como `key` do React até o eco do Realtime trazer o id real e substituir a linha otimista.
- **Passo 10 ✅ — Checkpoint de saída da Fase 1.** Validado manualmente com duas contas Google reais em dois navegadores: convite por link, itens e partes sincronizando entre as duas sessões sem recarregar (tanto o lado de quem edita — update otimista — quanto o lado de quem só observa — eco do Realtime), resumo batendo, e fechamento de conta travando edição corretamente. Confirmado pelo usuário em 2026-10-20, sem bugs encontrados. **Fecha a Fase 1 — núcleo colaborativo completo.**

### Pós-Fase 1 — Ajustes de uso real (antes da Fase 2)

Lote de ajustes levantados usando o app de verdade, antes de entrar na Fase 2 (IA de cupom): convite com menos fricção, taxa de serviço editável, modelo de participante sem conta (reabre uma decisão fechada da Fase 0), tela de divisão orientada por participante, e paleta de dark mode. Plano completo: `curried-wibbling-cherny.md`'s sucessor, `unified-jumping-hennessy.md` (`~/.claude/plans/`).

- **Bloco 1.1 ✅** — Convite deixa de exigir um clique extra: o link já vem gerado quando o dono abre a tela de compartilhamento.
- **Bloco 1.2 ✅** — Taxa de serviço passa a ser editável a qualquer momento (antes só era definida na criação da conta), seguindo a mesma regra colaborativa já usada em itens/partes — qualquer participante edita, não só o dono.
- **Bloco A, parte 1/3 ✅** — Schema preparado pra participantes sem conta: `bill_participants.profile_id` fica opcional (ver "Decisões técnicas notáveis") e `item_shares` passa a vincular ao participante da conta em vez do perfil direto. Telas existentes (itens, divisão, resumo) adaptadas pro novo vínculo — ainda sem UI pra cadastrar convidado nem pra reivindicar, isso vem nas próximas partes.
- **Bloco A, parte 2/3 ✅** — Nova tela de participantes: o dono cadastra convidados só com nome (sem conta), vê todo mundo com um badge "convidado"/"ativo", e remove qualquer participante enquanto a conta está aberta. Ainda falta o lado de quem recebe o convite poder "reivindicar" um desses convidados — próxima parte.
- **Bloco A, correção ✅** — Removido o buraco de o dono conseguir apagar a própria linha de participante (o que o trancaria fora da própria conta, já que itens/partes/resumo dependem de `is_bill_participant`, não de `owner_id`). Bloqueado nos dois níveis: RLS (quem tenta de verdade, não só a UI) e o botão de remover escondido pra essa linha.
- **Bloco A, parte 3/3 ✅ — fecha o Bloco A.** Fluxo de reivindicação: ao abrir o link de convite e logar, quem recebeu o convite vê os convidados ainda sem conta daquela conta e escolhe "sou um deles" ou "sou novo". A mesma trava que já existia (um perfil só pode aparecer uma vez por conta) também protege esse fluxo sem precisar de verificação extra no código.
- **Bloco B ✅ — fecha o Bloco B.** A conta ganhou navegação por abas (Itens / Participantes / Dividir / Resumo, sempre visíveis, sem precisar voltar pra uma tela "hub" pra trocar de seção). "Dividir" passou a ser uma aba própria — como era no v1 — em vez de uma rota por item: os participantes ficam sempre visíveis e trocar de item é só um seletor, sem navegar de página. O botão "dividir" de cada item na aba Itens leva direto pra lá já com aquele item selecionado. O botão "Compartilhar" (convite) deixou de morar numa tela própria e passou a aparecer no topo de qualquer aba, pra quem é dono. (Duas tentativas anteriores foram descartadas depois do teste manual: colar a divisão dentro da tela de itens obrigava rolar a lista inteira pra chegar nela; e uma aba "Visão geral" só com o botão de convite não justificava existir como tela própria.)
- **Bloco C, parte 1 (ajustes de UX/fluxo) ✅** — rodada de polimento sem tocar na paleta: padronizou confirmação de ações destrutivas, hierarquia visual dos botões, cor dos avisos, badges e copy divergente, além de ligar feedback de erro/sucesso (toasts) que já estava instalado mas não usado. Motivado por um levantamento de inconsistências feito em revisão de código (2026-11-13), resolvido antes de entrar na parte de direção visual do bloco (ainda em definição com o usuário).
- **Bloco C, parte 2 (direção visual), início ⬜** — adotada a skill Impeccable como fluxo de trabalho pra essa rodada de redesign. Primeiro passo (`impeccable init`) gera `PRODUCT.md`: um registro de contexto de produto (usuários, posicionamento, restrições) separado do `CLAUDE.md`, pensado pra a skill de design consultar sem precisar reconstruir esse contexto a cada sessão — e sem invenção: perguntas estruturadas confirmaram pontos que não tinham evidência forte no repo (cenário de uso é na mesa/celular; diferencial de posicionamento é a leitura de cupom por IA; o nome "Splitdummy" ficou marcado como em aberto). A direção estética escolhida pra essa rodada — papel, tipografia retrô, preenchimento com aparência manuscrita, inspirada numa nota de pedido ("guest check") de bar/restaurante — entrou como referência vinculante no `PRODUCT.md`, mas o desenvolvimento dela (paleta, tipografia, componentes) fica pro próximo passo (`new-work`), não pro `init`.
- **Bloco C, parte 2, piloto na tela de Itens ⬜** — `shape` fechou a direção (sem rodar o sorteio normal de conceitos do Impeccable: como a referência do usuário já vinha com imagem + descrição textual vinculante, ela contou como "direção pinada", pulando direto pra confirmação) e gravou um *direction contract* num surface brief (`.impeccable/surfaces/`). Construído só na tela de Itens, como piloto antes de decidir estender pro resto do app: paleta papel (creme) + tinta azul-marinho + vermelho reservado pra sinal (ecoando o número vermelho da referência), duas vozes tipográficas fixas — impressa/mono pra estrutura e números, manuscrita (Caveat) só pro que o usuário digitou (nome do item) — e a lista de itens deixou de ser cards empilhados pra virar linhas separadas por régua fina, como as linhas de uma nota de pedido de verdade. O tema é escopado só nessa rota (ver "Decisões técnicas notáveis" sobre o gotcha de Dialog/Portal), sem mexer no restante do app nem no dark mode existente. Validação manual do usuário no navegador ainda pendente (dependia de login Google real, fora do alcance de automação de browser desta sessão); `DESIGN.md` só é gerado depois dela.
- **Bloco C, parte 2, extensão pras 4 abas da conta ⬜** — o piloto só na tela de Itens não dava pra avaliar de verdade: navegar entre abas trocava de volta pro tema antigo a cada clique. O escopo de tema (`.paper-check`, fontes) e o cabeçalho/`BillTabs` subiram de `items/layout.tsx` pra um layout novo em `bills/[billId]/layout.tsx`, compartilhado pelas 4 abas (Itens/Participantes/Dividir/Resumo) — como bônus, isso também eliminou uma duplicação que já existia: cada uma das 4 páginas buscava a conta e montava o mesmo cabeçalho separadamente, e cada uma chamava `getOrCreateActiveInvite` por conta própria (até 4x navegando pela conta). A tela de Participantes recebeu o mesmo tratamento estrutural de Itens (linhas com régua em vez de cards, nome em voz manuscrita); Dividir e Resumo ficaram com a estrutura atual, mas herdam a paleta/tipografia automaticamente porque os componentes shadcn usados neles já consomem os mesmos tokens de cor. Dashboard (histórico de contas) e telas de login seguem fora do escopo.
- **Bloco C, parte 2, barra superior entra no escopo ⬜** — primeira rodada ainda deixava a barra superior (logo + "Sair") e a moldura ao redor do conteúdo no tema antigo, criando a sensação de um cartão flutuando num app diferente. Corrigido migrando as rotas de conta pra um Route Group próprio do Next.js (`app/(bill)/bills/[billId]`, antes dentro de `app/(dashboard)/bills/[billId]`) — ver "Decisões técnicas notáveis" pro porquê (CSS custom property não alcança um ancestral compartilhado). Esse grupo de rota ganhou chrome e auth-gate próprios; a tela inteira (barra superior inclusa) fica no mundo "guest check" ao entrar numa conta, sem precisar tocar no dashboard.
- **Bloco C, parte 2, correção de "só recoloriu" ⬜** — feedback do usuário depois de ver as duas rodadas anteriores: a mudança até aqui tinha sido só cor + fonte em alguns pontos, não redesign de verdade — a fonte antiga ainda vazava em boa parte da UI (ver "Decisões técnicas notáveis" pro porquê técnico) e os botões continuavam com a mesma forma do shadcn padrão. Três correções: (1) fonte-base do escopo inteiro trocada de verdade, incluindo diálogos; (2) paleta saiu de um creme mais claro/pastel pra um tom de papel mais neutro e fosco, com uma textura de grão sutil (ruído gerado via filtro SVG `feTurbulence`, sem precisar de asset de imagem) aplicada no fundo; (3) botões ganharam tratamento próprio dentro do escopo — borda mais grossa nos secundários (ecoando as caixas do cabeçalho do guest check), cantos mais retos, sem alterar o componente `Button` compartilhado (a redecoração é via seletor de atributo `[data-slot="button"]` escopado em `.paper-check`, preservando shadcn como camada estrutural).
- **Bloco C, parte 2, passo "base visual" ⬜** — primeiro dos 4 passos combinados pra fechar a direção visual da conta. Fonte-base do escopo trocou de verdade pra JetBrains Mono (efeito de "comanda impressa"), com a serifada retrô (Bitter) reservada só pro nome da conta no cabeçalho — mesmo mecanismo de `font-family` escopado já registrado nas "Decisões técnicas notáveis". Voz manuscrita (Caveat) ficou restrita à descrição do item; o nome do participante, que tinha ficado em aberto na rodada anterior, passou por duas decisões no mesmo dia — primeiro manuscrito, depois revertido pra mono (igual ao resto da estrutura) — aplicado nas telas de Participantes, Dividir e Resumo. A lista de itens ganhou régua de tabela real — linhas e colunas (quantidade / descrição / valor) separadas por traço, não só a linha fina de antes — pra parecer mais com a nota de pedido impressa de referência. Botões e badges (participante "dono"/"ativo"/"convidado") ganharam cantos totalmente retos (raio zero com `!important`, pra garantir que vença qualquer utilitário do shadcn/Tailwind que ainda tentasse arredondar — o `badge` nem tinha sido tocado na primeira rodada e ainda usava o formato de pílula padrão).
