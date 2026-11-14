# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grupos de amigos ou colegas dividindo uma conta de bar/restaurante — tipicamente ainda sentados à mesa, usando o celular, logo após (ou durante) o fechamento da conta. Um participante é o "dono": cria a conta, convida o resto por link/QR code, e é quem fecha a conta no final. Qualquer participante pode editar itens e partes de qualquer pessoa (totalmente colaborativo); só o dono convida/remove e fecha a conta. Participante pode existir sem conta própria (cadastrado só com nome pelo dono) — pra quem só quer ver quanto deve, sem fricção de login.

## Product Purpose

Dividir contas de bar/restaurante de forma colaborativa e em tempo real, eliminando tanto o cálculo manual quanto a exigência de todo mundo ter conta. Sucessor do [splitdummy v1](https://github.com/B0RGESdaniel/splitdummy) (SPA mono-usuário, estado 100% em `localStorage`, sem backend, sem colaboração).

## Positioning

Diferencial central planejado (Fase 2, ainda não implementada): leitura de cupom fiscal por foto via IA, que pré-popula os itens automaticamente (com revisão humana obrigatória antes de gravar) — elimina a digitação manual de item por item, que é o atrito central em apps concorrentes como Splitwise. Colaboração em tempo real sem exigir conta de todo participante já está implementada e reforça esse diferencial, mas o cupom por IA é o mecanismo escolhido como principal.

## Operating Context

Uso principal acontece na mesa, no celular, com o grupo ainda reunido — mobile-first não é só preferência de layout, é a cena real de uso (possivelmente barulho, pouca luz, pressa pra fechar a conta e ir embora). Entrada em uma conta é só por link/QR code (sem e-mail). Uma conta fechada é imutável — ninguém edita depois, nem o dono.

## Capabilities and Constraints

- Divisão por partes (implementado), porcentagem ou valor fixo (planejado, Fase 3).
- Participante sem conta: pode ter itens/partes atribuídos, aparece com badge de "convidado", pode depois "reivindicar" esse registro ao logar pelo link de convite.
- Autorização inteira via RLS do Postgres (Supabase) — não há camada de autorização na aplicação.
- Arredondamento por método do maior resto: a soma dos valores por participante sempre reconcilia exatamente com o total (item dividido e taxa de serviço).
- Histórico de contas (já implementado) e grupos recorrentes simples — lista privada de participantes pra agilizar convite (planejado, Fase 3, ainda não é entidade complexa).
- Página pública de compartilhamento (planejada, Fase 3): só resumo final + itens, apenas de contas já fechadas.
- Stack e decisões de arquitetura fechadas (Next.js 16 App Router, Supabase, TanStack Query + Realtime, etc.) estão documentadas em `CLAUDE.md` e `TCC.md` — fonte de verdade operacional pra esse nível de detalhe.

## Brand Commitments

Nenhuma identidade visual existe ainda (sem logo/ícone). O nome "Splitdummy" está em aberto — pode mudar como parte dessa nova direção visual, não é compromisso fixo.

Referência visual vinculante dada pelo usuário pra essa rodada de redesign: estética de "guest check" (nota de pedido de bar/restaurante) — fundo de papel, letras retrô, texto de preenchimento com aparência manuscrita. Imagem de referência: `/Users/danielborges/Downloads/conta_4.jpeg`. Desenvolvimento dessa direção (paleta, tipografia, componentes) é trabalho de `new-work`, não deste arquivo.

## Evidence on Hand

Sem testemunhos, clientes, cases ou dados de marketing reais — este é primariamente um projeto pessoal e estudo de caso do TCC do usuário (Sistemas de Informação), não um produto com tração de mercado. Validado manualmente com duas contas Google reais em dois navegadores (Fase 1, 2026-10-20), sem usuários externos até o momento. Trabalho futuro não deve inventar testemunhos, clientes ou métricas de uso.

## Product Principles

- Colaboração sem fricção: qualquer participante edita qualquer item/parte; participante pode existir sem conta.
- Autorização nunca confia no cliente — tudo é RLS no Postgres.
- Divisão exata: o método de arredondamento nunca deixa sobra ou falta de centavos.
- Dado extraído por IA (cupom) sempre passa por revisão humana antes de gravar — nunca grava direto.
- Mobile-first: a cena de uso real é na mesa, no celular, não a mesa de trabalho.
