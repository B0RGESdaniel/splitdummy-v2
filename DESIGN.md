---
name: Splitdummy
description: Comanda de papel que vira cupom fiscal no momento de fechar a conta
colors:
  royal-ink: "oklch(0.42 0.19 262)"
  royal-ink-foreground: "oklch(0.96 0.014 78)"
  tinta-manuscrita: "oklch(0.22 0.05 262)"
  vermelho-carimbo: "oklch(0.53 0.19 25)"
  papel-cru: "oklch(0.97 0.01 80)"
  papel-sombreado: "oklch(0.935 0.009 80)"
  borda-royal: "oklch(0.42 0.19 262 / 28%)"
typography:
  display:
    fontFamily: "Bitter, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  comanda:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
  comanda-label:
    fontFamily: "Archivo Narrow, Arial Narrow, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.05em"
  manuscrita:
    fontFamily: "Kalam, cursive"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0em"
  cupom:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  cupom-digitos:
    fontFamily: "DotGothic16, monospace"
    fontSize: "1em"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0em"
rounded:
  none: "0px"
components:
  button-primary:
    backgroundColor: "{colors.royal-ink}"
    textColor: "{colors.royal-ink-foreground}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
  button-outline:
    backgroundColor: "{colors.papel-cru}"
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
  badge-dono:
    backgroundColor: "{colors.royal-ink}"
    textColor: "{colors.royal-ink-foreground}"
    rounded: "{rounded.none}"
    padding: "0.125rem 0.5rem"
  badge-convidado:
    backgroundColor: "{colors.papel-cru}"
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.none}"
    padding: "0.125rem 0.5rem"
  status-badge-aberta:
    backgroundColor: "{colors.royal-ink}"
    textColor: "{colors.papel-cru}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.5rem"
  status-badge-fechada:
    backgroundColor: "{colors.vermelho-carimbo}"
    textColor: "{colors.papel-cru}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.5rem"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.none}"
    padding: "0"
---

# Design System: Splitdummy

## Overview

**Creative North Star: "Da Comanda ao Cupom"**

O uso de verdade acontece na comanda: papel cru, tinta azul royal, preenchimento manuscrito, aberta a maior parte do tempo que o grupo está sentado à mesa dividindo a conta. Mas todo o sistema é desenhado em função de um destino — o momento em que a conta fecha e a comanda se transforma literalmente num cupom fiscal, com sua própria voz tipográfica (Courier Prime + DotGothic16 nos números), como se tivesse saído de uma impressora térmica de restaurante de verdade. Essa transição de registro — de rascunho manuscrito pra documento impresso definitivo — é a cerimônia central do produto, não um simples flip de status. Direção declarada pelo usuário (2026-11-17, ainda não implementada): o histórico de contas (dashboard) deve eventualmente herdar essa mesma linguagem de cupom fiscal pra visualizar contas antigas, em vez do tema genérico que usa hoje — tratar como intenção confirmada de produto, não como fato já construído.

O sistema nunca mistura as duas vozes na mesma tela: a comanda (Itens, Participantes, cabeçalho) é estrutural e condensada; o cupom (Resumo) é datilografado e só usa a voz pixelada pra números. Fora dessa combinação, a direção rejeita explicitamente a estética de dashboard SaaS genérico — nada de cards cinza chapados, badge em pílula ou dark mode zinc+azul, a aparência que qualquer concorrente de divisão de conta teria sem pensar.

**Key Characteristics:**
- Duas vozes tipográficas paralelas (comanda vs. cupom), nunca combinadas na mesma superfície.
- Papel + tinta, não vidro: textura de grão real, bordas retas, zero sombra decorativa.
- Vermelho é raro e sempre um sinal — fechamento ou risco — nunca uma segunda cor de marca.
- Números são sempre confiáveis: vivem na voz impressa, nunca na manuscrita.
- Estrutura pré-impressa (grade, rótulos, botões) contrasta com o conteúdo preenchido à mão (descrição do item, campos do cabeçalho).

## Colors

Papel neutro como base, azul royal vívido como tinta estrutural de tudo, vermelho reservado estritamente como cor de sinal.

### Primary
- **Azul Royal** (`oklch(0.42 0.19 262)`): a tinta estrutural de toda a comanda. É `--foreground`/`--primary` dentro do escopo `.paper-check` — texto geral, bordas de grade e de botão `outline`, preenchimento de botões/badges padrão, selo "aberta". Uma única cor cobre praticamente toda a UI estrutural, por design.

### Secondary
- **Papel Sombreado** (`oklch(0.935 0.009 80)`): superfícies secundárias e muted — fundo de hover sutil, badges secundários. Nunca carrega texto por conta própria; é sempre fundo.

### Neutral
- **Papel Cru** (`oklch(0.97 0.01 80)`): fundo base de toda a comanda — cards, diálogos e popovers herdam a mesma textura de grão (`--paper-grain`, ruído SVG `feTurbulence`) sobre essa cor.
- **Tinta Manuscrita** (`oklch(0.22 0.05 262)`): cor exclusiva da voz manuscrita (Kalam) — descrição do item, valores preenchidos no cabeçalho (nome do dono, contagem de participantes). Deliberadamente mais escura e menos saturada que o azul royal, pra nunca competir com a tinta estrutural pela atenção.

### Named Rules
**The Vermelho É Sinal Rule.** Vermelho Carimbo (`oklch(0.53 0.19 25)`) aparece só em dois lugares: o selo "fechada" e ações destrutivas/alertas de risco. Nunca decoração, nunca uma segunda cor de marca ao lado do azul royal.

**The Uma Tinta Rule.** Fora do vermelho de sinal e da tinta manuscrita reservada, toda a estrutura visual — texto, borda, preenchimento — lê a mesma cor (azul royal). Não existe uma segunda cor de acento concorrendo por atenção.

## Typography

**Display Font:** Bitter (com Georgia como fallback serifado)
**Body Font (comanda):** Archivo Narrow, sempre em caixa alta
**Body Font (cupom fiscal):** Courier Prime
**Label/Mono Font (cupom, dígitos):** DotGothic16 — só números
**Handwritten voice:** Kalam

**Character:** a comanda pareia uma condensada impressa (Archivo Narrow, uppercase) com uma manuscrita real (Kalam) pro que a pessoa escreveu; o cupom troca de registro pra datilografado (Courier Prime) com dígitos literalmente pixelados (DotGothic16), como se tivesse saído de uma impressora térmica.

### Hierarchy
- **Display** (700, 1.5rem, line-height 1.2, tracking -0.01em): nome da conta no cabeçalho — único lugar onde a Bitter aparece.
- **Title** (Archivo Narrow, 500, 0.6875rem/11px, tracking 0.05em, uppercase): rótulos estruturais fixos — "Dono", "Participantes", cabeçalhos de coluna da tabela de itens.
- **Body — comanda** (Archivo Narrow, 500, 0.875rem/14px, uppercase): texto estrutural padrão de Itens e Participantes.
- **Handwritten** (Kalam, 400, 1.25rem/20px, cor `tinta-manuscrita`): descrição do item e valores preenchidos pelo usuário no cabeçalho (nome do dono, contagem de participantes).
- **Body — cupom** (Courier Prime, 400, 0.875rem/14px): nomes, rótulos, "Subtotal + taxa" no Resumo.
- **Label — dígitos do cupom** (DotGothic16, 400, tamanho herdado do contexto): valores em R$, percentual da taxa, fração "minhas partes/partes totais" — nunca aplicada a palavras inteiras.

### Named Rules
**The Números São Impressos Rule.** Nenhum valor numérico (preço, quantidade, fração de partes, percentual de taxa) usa a voz manuscrita em lugar nenhum do app — números sempre na voz impressa (Archivo Narrow na comanda, DotGothic16 no cupom), pra manter a confiança no valor a qualquer momento.

**The DotGothic16 Só Dígito Rule.** Testado e confirmado: DotGothic16 em letras maiúsculas renderiza com altura desigual entre caracteres ("esquisito", feedback direto do usuário). Por isso a fonte é restrita à classe utilitária `.font-digits`, aplicada só a dígitos, "R$" e frações — nunca a uma palavra inteira.

## Layout

Mobile-first de verdade: contêiner único `max-w-md` centralizado, telado pra uso com uma mão, na mesa. A comanda usa grades estruturais em vez de listas soltas — tabela HTML real pra Itens (3 colunas: Descrição / Qtd / Dividir, `border-collapse` com borda sólida 1.5px em cada célula) e um CSS grid de 3 colunas pra mesa de Participantes (dono ocupando as 3 colunas no topo, participantes alternando esquerda/direita nas linhas seguintes). Densidade é alta e deliberada — células com `px-3 py-2`, sem respiro generoso — porque o modelo mental é uma nota de pedido impressa, não um app folgado.

## Elevation & Depth

Chapado por padrão — não existe sombra ambiente de UI em cards, botões ou diálogos. As únicas três ocorrências de profundidade são sempre uma metáfora física, nunca um efeito de affordance genérico: (1) a viga decorativa que liga as fileiras da mesa de Participantes, simulando o pé de uma mesa de madeira de verdade; (2) o anel interno (`inset`) do selo de status, lendo como uma caixa impressa relevada; (3) o flash de mudança remota (`realtime-flash`) — um pulso rápido de cor de fundo, não uma sombra, sinalizando que outro participante editou aquela linha.

### Shadow Vocabulary
- **viga-da-mesa** (`box-shadow: 0 10px 18px -8px color-mix(in oklch, var(--foreground), transparent 55%), inset 0 1px 0 color-mix(in oklch, var(--background), transparent 15%), inset 0 -1px 0 color-mix(in oklch, var(--foreground), transparent 80%)`): a coluna central que conecta as fileiras de assentos na mesa de Participantes.
- **selo-relevado** (`box-shadow: inset 0 0 0 1.5px var(--background)`): anel interno do `BillStatusBadge`, lendo como caixa impressa.

### Named Rules
**The Chapado-com-Propósito Rule.** Toda vez que o sistema usa algo parecido com profundidade, é pra simular um objeto físico real (viga, carimbo, selo) — nunca um efeito de elevação de UI genérico.

## Shapes

Raio zero em praticamente tudo dentro de `.paper-check` — botões, badges, cards, diálogos, popovers e inputs, forçado via `border-radius: 0 !important` escopado por `[data-slot]`. O token ambiente `--radius` ainda existe (`0.2rem`, herdado do shadcn) mas é sistematicamente sobrescrito; na prática, raio zero é a regra, não a excepção. Borda é o dispositivo de forma dominante: 1.5px sólida na tinta royal pra grades e botões `outline`; tracejada pra estados provisórios.

### Named Rules
**The Tracejado-é-Provisório Rule.** Borda tracejada sinaliza "ainda não é definitivo" — vaga vazia na mesa de Participantes, badge "convidado", alerta de item ainda não dividido. Preenchimento sólido sinaliza autoridade/definitivo — badge "dono", selo "aberta"/"fechada", botão de ação principal.

## Components

### Buttons
- **Shape:** raio zero, sem excepção.
- **Primary:** preenchimento sólido Azul Royal, texto Papel Cru claro, peso 600, uppercase.
- **Outline:** fundo Papel Cru, borda 1.5px Azul Royal, texto Azul Royal.
- **Hover / Focus:** sem deslocamento de sombra; hover escurece levemente o preenchimento, foco adiciona anel de 3px na cor do botão.
- **Secondary / Ghost / Destructive:** herdam as variantes padrão do shadcn, sempre com o mesmo tratamento de raio zero e peso 600.

### Badges
- **Style:** raio zero sempre.
- **Dono:** preenchimento sólido Azul Royal — mesmo vocabulário do selo "aberta"/"fechada", sinalizando autoridade.
- **Convidado:** borda tracejada, fundo Papel Cru — reaproveita o vocabulário "tracejado é provisório".

### Cards / Containers
- **Corner Style:** raio zero.
- **Background:** Papel Cru com textura de grão repetida (SVG `feTurbulence`, não é asset de imagem).
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** nenhuma borda própria — confia no container pai pra separação visual.

### Inputs / Fields
- **Style:** sem caixa — só uma linha inferior de 1.5px na tinta royal a 45% de opacidade, sem fundo, sem padding lateral. O modelo é "escrever em cima da linha", não preencher uma caixa.
- **Focus:** a linha inferior engrossa pra 2px e fecha pra tinta plena.
- **Error:** linha inferior vermelha (Vermelho Carimbo), sem mudança de fundo.

### Navigation
Não há navegação por abas simétrica — foi removida de propósito. Itens é a tela principal; Participantes e Resumo são destinos contextuais, alcançados tocando no número de participantes da grade do cabeçalho ou pelo botão "fecha para mim" no fim da lista de itens. Participantes e Resumo levam um link "← Itens" no topo pra voltar. Sem estado "ativo" de navegação, porque não existe navegação simétrica pra ter um.

### A Mesa (signature component)
Tela de Participantes representada como uma mesa vista de cima — referência direta ao dito "quem senta na ponta paga a conta". O dono ocupa a cabeceira (3 colunas no topo); cada participante que entra alterna lado esquerdo/direito, crescendo a mesa pra baixo em vez de reorganizar o layout. Uma coluna central decorativa (ver `viga-da-mesa` em Elevation) conecta visualmente as fileiras. Avatar é um de 4 ilustrados fixos (`avatar_key`); vaga vazia é um quadrado tracejado com "+".

### Cupom Fiscal (signature component)
Tela de Resumo: um `Accordion` agrupado por pessoa, nome + subtotal na mesma linha do gatilho (pra ler mesmo fechado), itens consumidos + fração de partes só quando expandido. É o único lugar do app com a voz Courier Prime + DotGothic16 — a "cerimônia de fechamento" registrada no Overview. Direção declarada, ainda não implementada: o histórico de contas deve eventualmente adotar essa mesma linguagem pra visualizar contas fechadas antigas.

## Do's and Don'ts

### Do:
- **Do** manter vermelho reservado só pro selo "fechada" e pra ações destrutivas/alertas de risco.
- **Do** manter todo número (preço, quantidade, fração, percentual) na voz impressa — nunca manuscrita.
- **Do** usar borda tracejada só pra estados provisórios e preenchimento sólido só pra estados definitivos/de autoridade.
- **Do** dar textura de grão (`--paper-grain`) a toda superfície do tipo card/dialog/popover/header dentro de `.paper-check`.
- **Do** manter Courier Prime + DotGothic16 isolados ao Resumo — não deixar vazar pra Itens ou Participantes.

### Don't:
- **Don't** usar raio de borda maior que zero em botão, badge, card, diálogo ou popover dentro de `.paper-check`.
- **Don't** usar sombra ambiente de UI (elevação decorativa) em cards ou botões — profundidade só existe como metáfora física confirmada (viga, selo).
- **Don't** aplicar DotGothic16 a uma palavra inteira — só a dígitos, "R$" e frações (maiúsculas ficam com altura desigual, já testado).
- **Don't** aplicar a voz manuscrita (Kalam) a números ou a rótulos estruturais fixos.
- **Don't** reintroduzir o visual de dashboard SaaS genérico (cards cinza chapados, badge em pílula, zinc+azul) dentro do escopo `.paper-check` — é o anti-referência confirmado da direção.
