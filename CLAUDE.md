# Divide/ai (ex-Splitdummy v2)

App **multi-usuário e colaborativo em tempo real** de divisão de contas de bar/restaurante, evolução do [splitdummy v1](https://github.com/B0RGESdaniel/splitdummy). É o **TCC** do usuário (Sistemas de Informação): priorizar stack coesa e fácil de justificar por escrito sobre otimização prematura.

Em produção: https://divideai.danielborges.me (push na `main` = deploy de produção na Vercel). **Tudo em São Paulo**: funções em `gru1` (`vercel.json`) e Supabase `divideai` (ref `dlqiryqzhajowpbkwebu`, `sa-east-1`), migrado em 2026-11-21. Banco e funções têm de ficar sempre na mesma região.

Onde está o resto:
- `TCC.md`: stack, regras de negócio, decisões técnicas notáveis e changelog (histórico de tudo que foi feito).
- `DESIGN.md` (+ `.impeccable/design.json`): sistema visual ("Da Comanda ao Cupom"). `PRODUCT.md`: contexto de produto.
- Plano original (contexto histórico, não reescrever): `/Users/danielborges/.claude/plans/curried-wibbling-cherny.md`. Se divergir deste arquivo, este vence.

## Regras de trabalho com o usuário

- **Nunca rodar `git add`/`git commit`** a menos que ele peça explicitamente. Ao terminar cada unidade do tamanho de um commit, parar, relatar o que mudou e pedir pra ele comitar antes de seguir. Não empacotar vários passos numa entrega.
- Só sugerir mensagem de commit quando ele pedir.
- Ele valida no navegador antes de avançar; quando possível, validar antes direto no banco (`psql`) pra pegar bug de RLS/lógica.
- Decisão de design/visual: depois de uma tentativa rejeitada ou ideia vaga, propor (canvas/artifact quando for visual) e esperar a escolha, não implementar a minha.
- **Manter o `TCC.md` atualizado antes de reportar a unidade como concluída**: entrada curta no changelog pra toda funcionalidade/ferramenta/decisão nova; decisões ou bugs interessantes pro artigo vão também em "Decisões técnicas notáveis".
  - Nível produto/arquitetura (o quê e por quê), não code review. Nome de arquivo/função só quando for parte do que vale explicar no artigo.
  - ❌ "`getOrCreateActiveInvite` (`bills/actions.ts`) busca o convite ativo ou já cria um, chamado direto na `BillPage`."
  - ✅ "Convite deixa de exigir um clique extra: o link já vem gerado quando o dono abre a tela de compartilhamento."
- Rodar typecheck (`npx tsc --noEmit`), lint e `npm test` depois de alterações relevantes.

## Produto (decisões fechadas — não reabrir)

- Contas compartilháveis por link + QR code (mesmo link, sem e-mail). Um convite ativo por conta; "regenerar" revoga e cria outro.
- **Participante pode existir sem conta** (o dono põe só nome + avatar); quem tem login reivindica o lugar pelo convite.
- Divisão **só por partes** (porcentagem e valor fixo descartados). Arredondamento por maior resto (`lib/split/calculate.ts`).
- Totalmente colaborativo: qualquer participante edita itens/partes; só o dono convida/remove; autorremoção sempre permitida.
- Leitura de cupom por foto via IA, com revisão humana obrigatória; a foto nunca é persistida.
- Grupos recorrentes descartados → **importar participantes de uma conta anterior** do próprio dono (entram como convidados).
- Conta paga é imutável, sem reabrir; abre direto no Resumo. Compartilhar = imagem do cupom gerada no servidor (sem página pública).
- Item exige preço > 0 (leitura que vem com R$ 0 chega na revisão como R$ 1).

**Vocabulário**: "fecha para mim" = pedir a conta (qualquer um, leva pro Resumo). Ato do organizador = **"Marcar como paga"**; estados aberta / **paga**; carimbo **PAGO**. Banco segue `status = 'closed'`. Logout = **"Desconectar"** (só no dashboard); "Sair desta conta" = sair da comanda. Na mesa: ORGANIZADOR / COLABORANDO (com login) / NA MESA (sem login). "Adicionar à mesa" (não "convidado").

**Nome e marca**: **Divide/ai**, sem acento (`divideai` onde "/" não cabe). Marca = `BrandWordmark` (Bitter, "Divide" 400 + "/ai" 800). "/ai" sozinho só como ícone. Trocadilho com IA fica só no nome — nada de "/ai" em botão/loading. Mantêm o nome antigo: migrations aplicadas, pasta/repo e o projeto Vercel `splitdummy-v2`.

## Arquitetura

| Camada | Escolha |
|---|---|
| App | Next.js 16 App Router, TS strict, Cache Components. **Ler o guia em `node_modules/next/dist/docs/` antes de usar API do Next** (ver `AGENTS.md`) |
| Backend | Supabase (Postgres + Auth + Realtime) via Vercel Marketplace (`vercel storage status` mostra a conexão) |
| Login | Google OAuth ou código por e-mail (8 dígitos + link via `/auth/confirm`). Perfil guarda só o primeiro nome; nome e avatar obrigatórios (`/welcome`, `redirectIfProfileIncomplete`) |
| Dados | `@supabase/supabase-js` direto, sem ORM. RLS faz toda a autorização; service-role só em convite, contagem de leituras e número da conta |
| IA do cupom | AI SDK 7 `generateText` + `Output.object` + Zod via AI Gateway, `google/gemini-2.5-flash-lite`. Teto: 5 leituras/conta, 20/usuário/24h |
| UI | Tailwind + shadcn/ui (base `radix`, preset `nova`), Motion (com `reducedMotion="user"`) |
| Estado | TanStack Query + Realtime (`postgres_changes`) em itens/partes; `bills`/`bill_participants`/`profiles` vêm de Server Components → evento faz `router.refresh()` (`components/bills/bill-realtime-refresh.tsx`) |
| PWA | Só instalável: `app/manifest.ts` + ícones. Sem service worker, sem convite de instalação próprio, barra do iPhone em `default` — decisões do usuário |

Modelo de dados: `profiles` · `bills` · `bill_participants` (`profile_id` nullable + `display_name`) · `bill_invites` · `items` · `item_shares` (só `parts`) · `receipts` (auditoria da IA, sem foto). Toda tabela por conta indexa `bill_id` (filtro de RLS e escopo do Realtime); `is_bill_participant(bill_id)` é o helper das políticas.

## Mapa do código

```
app/(auth)/login, (auth)/welcome, auth/callback (Google), auth/confirm (link do e-mail)
app/(dashboard)/page.tsx                 # "o balcão": histórico (comandas abertas + cupons pagos)
app/(dashboard)/bills/actions.ts         # createBill, convites, closeBill
app/(bill)/bills/[billId]/               # grupo de rota próprio (chrome e auth-gate independentes do dashboard)
  layout.tsx                             # masthead "← Divide/ai Nº 007" + Compartilhar (dono)
  items/                                 # tela principal: grade Conta/Dono/Participantes/Status + lista de itens + leitura de cupom
  participants/                          # "a mesa"
  summary/                               # Resumo em cupom térmico; "Marcar como paga"
app/(public)/join/[inviteToken]          # convite (resolve via service-role)
app/api/invites/accept, api/ai/extract-receipt, api/bills/[billId]/receipt-image
lib/split/                               # matemática da divisão (+ testes Vitest)
lib/receipt/                             # schema e normalização da leitura (+ testes)
lib/realtime/                            # useRealtimeTable, flash e anúncio de mudança remota
lib/bill/                                # totais, número da conta, apelidos de garçom, etc.
supabase/templates/                      # e-mails de login em pt-BR (colar no painel; o remoto não lê daqui)
```

## Gotchas (não repetir)

- **RLS + `INSERT ... RETURNING`**: o `RETURNING` passa pela política de **SELECT**, antes de qualquer trigger `AFTER INSERT`. Se o select depende de uma linha-filha criada depois, o insert falha com `new row violates row-level security policy`. Correção usada em `bills`: alargar o select (`owner_id = auth.uid() OR is_bill_participant(id)`).
- **Conexão `psql`**: o host direto `db.<ref>.supabase.co` é só IPv6 e não resolve na rede do usuário; usar `POSTGRES_URL_NON_POOLING` do `.env.local`, que é o pooler em modo sessão (`aws-1-sa-east-1.pooler.supabase.com:5432`, aceita DDL). `supabase db push --db-url` aplica migrations.
- **Depurar RLS**: `psql "$POSTGRES_URL_NON_POOLING"` com `set local role authenticated; set local "request.jwt.claims" to '{"sub":"<uuid>","role":"authenticated"}';`.
- **Realtime: nunca `replica identity full`** — aqui ele faz `realtime.apply_rls` descartar todo evento ("no primary key", silencioso). Com RLS, DELETE só traz a PK, então filtro por `bill_id` não casa: assinar DELETE sem filtro e reconhecer pelo `id`. Por isso "limpar partes" zera `parts` via UPDATE em vez de apagar.
- **Realtime: assinar o canal uma vez só** (ids lidos por `ref`, nunca nas deps do effect) — reassinar deixa o canal cego por segundos.
- **Testar realtime fora do navegador**: script Node com sessão real (`auth.admin.generateLink` → `verifyOtp` + `realtime.setAuth`) e gravar via `psql` ~10s depois de assinar. Service-role não serve (ignora RLS).
- Operações em lote que o Realtime vai ecoar (ex.: substituir itens do cupom) vão numa função Postgres numa transação só, senão os outros veem estados intermediários.
- **Toast sobre diálogo modal**: precisa de `pointer-events: auto` (`.comanda-toast`) + `onInteractOutside` ignorando `[data-sonner-toaster]`.
- **Dialog dentro do `.paper-check`**: portal não herda o tema; usar `ThemeScope`/`usePortalContainer`.
- **Dev server serve o `globals.css` uma edição atrasado**: conferir com `curl` no CSS servido; se faltar, fazer outra edição qualquer pra empurrar.
- E-mail de login sai por SMTP próprio (Gmail pessoal do usuário + senha de app), configurado no painel do Supabase.

## Não propor de novo (decidido pelo usuário)

- Parar/limitar a rotação do vocativo do "fecha para mim" (o `prefers-reduced-motion` já cobre).
- Ação de divisão em lote dos itens pendentes, ou item já nascendo dividido entre todos.
- Animação de saída das linhas de item (deu glitch); escrita à mão letra a letra na revisão do cupom.
- "Soma dos itens" na tela de Itens, ou a IA lendo o total impresso.
- Unificar as duas entradas de "Adicionar à mesa" (vaga "+" e botão do topo) — redundância intencional.
- Kalam em número preenchido não é desvio: vale "o que a pessoa preenche é manuscrito".
- Navegação em "vias" (pilha de folhas): não decidida; não retomar nem assumir arquitetura sem perguntar.

## Pendente / pra depois

- **Apagar o projeto Supabase antigo** `splitdummy` (`us-east-1`, ref `gbigcjzyoovheiwpagoc`) depois de uns dias estável; está desconectado da Vercel. Junto: tirar o callback antigo do cliente OAuth no Google Cloud e revogar a senha de app antiga do SMTP. Apagar `.env.local.us-east-1` e `.env.sa`.
- **Navegação instantânea** (em andamento): ✅ esqueletos "comanda em branco" (`comanda-blank.tsx`), ✅ conta com casca em streaming + `lib/auth/session.ts`/`lib/bill/bill-queries.ts` (`cache()`), ✅ dashboard: só o topo deixou de esperar — **a página do balcão segue `instant = false` de propósito** (o morph de volta precisa das comandas na tela; decisão do usuário). Falta: telas de entrada (login/welcome/join) e tirar Poppins/Geist Mono do layout raiz.

- **Avaliação do TCC** com usuários (ex.: teste de usabilidade, SUS), não só validação técnica.
- **LGPD**: exclusão de conta, política de dados, nome de convidados sem conta.
- Fase 4, só se der tempo: exportar PDF, notificações, polimento mobile/acessibilidade, Playwright.
- Sem cronograma por fase — escolha consciente do usuário.
