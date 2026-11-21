---
name: Divide/ai
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
    padding: "0.375rem 0.75rem"
  status-badge-fechada:
    backgroundColor: "{colors.vermelho-carimbo}"
    textColor: "{colors.papel-cru}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.75rem"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.none}"
    padding: "0"
---

# Design System: Divide/ai

## Overview

**Creative North Star: "Da Comanda ao Cupom"**

O uso de verdade acontece na comanda: papel cru, tinta azul royal, preenchimento manuscrito, aberta a maior parte do tempo que o grupo está sentado à mesa dividindo a conta. Mas todo o sistema é desenhado em função de um destino — o momento em que a conta fecha e a comanda se transforma literalmente num cupom fiscal, com sua própria voz tipográfica (Courier Prime + DotGothic16 nos números), como se tivesse saído de uma impressora térmica de restaurante de verdade. Essa transição de registro — de rascunho manuscrito pra documento impresso definitivo — é a cerimônia central do produto, não um simples flip de status. O histórico de contas (dashboard) mostra esse ciclo inteiro de uma vez: é um balcão royal escuro onde as contas abertas aparecem como comandas em miniatura e as pagas como cupons térmicos curtos com o carimbo PAGO.

**A casa é o Divide/ai.** O que vem impresso em toda comanda é o nome da casa, "Divide/ai" (Bitter); o nome da conta é um campo que alguém preencheu à mão (Kalam). O balcão e a conta seguem esse conceito. Dentro da conta, o masthead só traz o impresso ("← Divide/ai Nº 007" e Compartilhar, com régua embaixo); o nome da conta é o primeiro campo da comanda, uma linha inteira "CONTA" no topo da grade de Itens, colado em Dono/Participantes — o nome pertence à comanda, não ao cabeçalho do app.

O sistema nunca mistura as duas vozes no mesmo **objeto** (o mesmo papel): a comanda (Itens, Participantes, cabeçalho, comandas do balcão) é estrutural e condensada; o cupom (Resumo, cupons pagos do balcão) é datilografado e só usa a voz pixelada pra números. Na mesma tela os dois podem conviver, como no balcão, desde que cada papel fale uma voz só. Fora dessa combinação, a direção rejeita explicitamente a estética de dashboard SaaS genérico — nada de cards cinza chapados, badge em pílula ou dark mode zinc+azul, a aparência que qualquer concorrente de divisão de conta teria sem pensar.

**Key Characteristics:**
- Duas vozes tipográficas paralelas (comanda vs. cupom), nunca combinadas no mesmo papel.
- Papel + tinta, não vidro: textura de grão real, bordas retas, zero sombra decorativa.
- Vermelho é raro e sempre um sinal — fechamento ou risco — nunca uma segunda cor de marca.
- O que se escreve num campo é manuscrito, número incluído; o que a comanda calcula ou conta é impresso.
- Estrutura pré-impressa (grade, rótulos, botões) contrasta com o conteúdo preenchido à mão (descrição do item, campos do cabeçalho).

## Colors

Papel neutro como base, azul royal vívido como tinta estrutural de tudo, vermelho reservado estritamente como cor de sinal.

### Primary
- **Azul Royal** (`oklch(0.42 0.19 262)`): a tinta estrutural de toda a comanda. É `--foreground`/`--primary` dentro do escopo `.paper-check` — texto geral, bordas de grade e de botão `outline`, preenchimento de botões/badges padrão, selo "aberta". Uma única cor cobre praticamente toda a UI estrutural, por design.

### Secondary
- **Papel Sombreado** (`oklch(0.935 0.009 80)`): superfícies secundárias e muted — fundo de hover sutil, badges secundários. Nunca carrega texto por conta própria; é sempre fundo.

### Neutral
- **Papel Cru** (`oklch(0.97 0.01 80)`): fundo base de toda a comanda — cards, diálogos e popovers herdam a mesma textura de grão (`--paper-grain`, ruído SVG `feTurbulence`) sobre essa cor.
- **Tinta Manuscrita** (`oklch(0.22 0.05 262)`): cor exclusiva da voz manuscrita (Kalam) — descrição do item, valores preenchidos no cabeçalho (nome do dono, contagem de participantes), campos dos diálogos de item e de conta (descrição, preço, quantidade, nome) e nome da conta nas comandas do balcão. Deliberadamente mais escura e menos saturada que o azul royal, pra nunca competir com a tinta estrutural pela atenção.

### Named Rules
**The Vermelho É Sinal Rule.** Vermelho Carimbo (`oklch(0.53 0.19 25)`) aparece só em dois lugares: o carimbo "PAGO" (conta paga) e ações destrutivas/alertas de risco (inclusive toast de erro e "Limpar partes", este só como texto vermelho, sem preenchimento). Nunca decoração, nunca uma segunda cor de marca ao lado do azul royal.

**The Uma Tinta Rule.** Fora do vermelho de sinal e da tinta manuscrita reservada, toda a estrutura visual — texto, borda, preenchimento — lê a mesma cor (azul royal). Não existe uma segunda cor de acento concorrendo por atenção.

## Typography

**Display Font:** Bitter (com Georgia como fallback serifado)
**Body Font (comanda):** Archivo Narrow, sempre em caixa alta
**Body Font (cupom fiscal):** Courier Prime
**Label/Mono Font (cupom, dígitos):** DotGothic16 — só números
**Handwritten voice:** Kalam

**Character:** a comanda pareia uma condensada impressa (Archivo Narrow, uppercase) com uma manuscrita real (Kalam) pro que a pessoa escreveu; o cupom troca de registro pra datilografado (Courier Prime) com dígitos literalmente pixelados (DotGothic16), como se tivesse saído de uma impressora térmica.

### Hierarchy
- **Display** (Bitter, tracking -0.01em): só a marca impressa "Divide/ai" (`BrandWordmark`) — "Divide" em 400 e "/ai" em 800, com a barra da própria fonte. O peso é o que separa as duas partes; barra desenhada à parte foi testada e descartada (desalinhava), assim como "/ai" em Courier Prime e em selo. 1.125rem/18px no masthead da conta e no topo das comandas do balcão, 1.25rem/20px no topo do balcão, 26px na folha de entrada (login, primeiro acesso, convite). No cupom a marca é só texto datilografado ("DIVIDE/AI"), sem pesos: impressora térmica não tem marca.
- **Ícone** ("/ai" sozinho, `app/icon.svg`): Bitter 800 em papel cru sobre quadrado royal cheio, sem raio, letras convertidas em contorno (o SVG não depende de fonte). É o único uso do "/ai" isolado; em todo papel vai o nome inteiro. O nome da conta nunca é Bitter: é campo manuscrito (Kalam, 1.25rem/20px na linha "Conta" da grade de Itens, até 2 linhas).
- **Title** (Archivo Narrow, 500, 0.6875rem/11px, tracking 0.05em, uppercase): rótulos estruturais fixos — "Dono", "Participantes", cabeçalhos de coluna da tabela de itens.
- **Body — comanda** (Archivo Narrow, 500, 0.875rem/14px, uppercase): texto estrutural padrão de Itens e Participantes.
- **Handwritten** (Kalam, 400, cor `tinta-manuscrita`): 1rem/16px na descrição do item (uma linha só, com "…": a lista de Itens nunca quebra o nome; 18px cortava demais num celular de 375px); 1.125rem/18px nos campos da grade (dono, contagem de participantes) e nos campos dos diálogos; 1.5rem/24px no nome da conta nas comandas do balcão; 1.5rem no título do diálogo de dividir (nome do item).
- **Body — cupom** (Courier Prime, 400, 0.875rem/14px): nomes, rótulos, "Subtotal + taxa" no Resumo.
- **Label — dígitos do cupom** (DotGothic16, 400, tamanho herdado do contexto): valores em R$, percentual da taxa, fração "minhas partes/partes totais" — nunca aplicada a palavras inteiras.

Tamanhos fora da escala, decididos de propósito (o detector acusa; não "corrigir"):
- **Carimbo de papel na mesa** (Archivo Narrow 700, 10px, tracking 0.06em, uppercase): ORGANIZADOR / COLABORANDO / NA MESA sobre a base do avatar. É carimbo, não texto corrido.
- **Subtítulo do cupom** (Courier Prime, 13px): "DIVIDE/AI · CONTA #NNN" e linhas de apoio do cabeçalho do cupom; também o texto das comandas e cupons do balcão.
- **Ação em destaque** (Archivo Narrow, 15px): a ação principal de uma tela, maior que o botão comum. "Fecha para mim" (13px abaixo de 640px, o texto inteiro; o vocativo gira e o apelido mais longo fica no limite em 375px) e "Fotografar o cupom" na comanda em branco.
- **Cupom pago no balcão** (sobre a base de 13px acima): nome da conta em Courier Prime 700, 15px, uppercase; o valor de "você pagou" em DotGothic16, 22px — o número que a pessoa procura no histórico é o maior do papel.
- **Marca na folha de entrada** (Bitter, 26px): "Divide/ai" no cabeçalho impresso da folha de login, primeiro acesso e convite, onde a marca também faz papel de logo.
- **Botão de dividir** (Archivo Narrow 600): "/3" em 16px no dividido (barra e número no mesmo tamanho, lido como "dividido por 3"); "/" sozinha em 20px no pendente.

### Named Rules
**The Preenchido É Manuscrito Rule.** (Substitui a antiga "Números São Impressos", derrubada pelo uso real.) O que alguém escreveu num campo é manuscrito, número incluído: preço e quantidade no diálogo de item, contagem de participantes na grade, nome da conta. O que a comanda calcula, conta ou imprime é voz impressa: preço por unidade e total na linha do item, stepper de quantidade, contagem no botão de dividir, e tudo no cupom (DotGothic16 nos dígitos). A pergunta é "alguém escreveu isso?", não "isso é um número?".

**The DotGothic16 Só Dígito Rule.** Testado e confirmado: DotGothic16 em letras maiúsculas renderiza com altura desigual entre caracteres ("esquisito", feedback direto do usuário). Por isso a fonte é restrita à classe utilitária `.font-digits`, aplicada só a dígitos, "R$" e frações — nunca a uma palavra inteira.

## Layout

Mobile-first de verdade: contêiner único `max-w-md` centralizado, telado pra uso com uma mão, na mesa. A comanda usa grades estruturais em vez de listas soltas — tabela HTML real pra Itens (3 colunas: Descrição / Qtd / Div., `border-collapse` com borda sólida 1.5px em cada célula) e um CSS grid de 3 colunas pra mesa de Participantes (dono ocupando as 3 colunas no topo, participantes alternando esquerda/direita nas linhas seguintes). Densidade é alta e deliberada — células com `px-3 py-2`, sem respiro generoso — porque o modelo mental é uma nota de pedido impressa, não um app folgado.

## Elevation & Depth

Chapado por padrão — não existe sombra ambiente de UI em cards, botões ou diálogos. As ocorrências de profundidade são sempre uma metáfora física, nunca um efeito de affordance genérico: (1) a viga decorativa que liga as fileiras da mesa de Participantes, simulando o pé de uma mesa de madeira de verdade; (2) o anel interno (`inset`) do selo de status, lendo como uma caixa impressa relevada; (3) o papel apoiado no balcão do dashboard, a única sombra ambiente do app; (4) a etiqueta dos toasts, com sombra curta e dura de papel colado; e, sem ser sombra, o flash de mudança remota (`realtime-flash`) — um pulso rápido de cor de fundo sinalizando que outro participante editou aquela linha.

### Shadow Vocabulary
- **viga-da-mesa** (`box-shadow: 0 10px 18px -8px color-mix(in oklch, var(--foreground), transparent 55%), inset 0 1px 0 color-mix(in oklch, var(--background), transparent 15%), inset 0 -1px 0 color-mix(in oklch, var(--foreground), transparent 80%)`): a coluna central que conecta as fileiras de assentos na mesa de Participantes.
- **selo-relevado** (`box-shadow: inset 0 0 0 1.5px var(--background)`): anel interno do `BillStatusBadge`, lendo como caixa impressa. Leve rotação (`-2deg`) nos dois estados, aberta e paga — efeito carimbo; a cor (azul/vermelho) é o que distingue o estado.
- **papel-no-balcão** (`0 1px 0 oklch(0 0 0 / 30%), 0 10px 16px -8px oklch(0 0 0 / 65%)` na comanda; `drop-shadow(0 8px 8px oklch(0 0 0 / 50%))` no cupom, porque a serrilha é recorte e `box-shadow` ignoraria os dentes): só dentro de `.balcao` No toque (`:active`) o papel afunda 1px e a sombra encurta (`0 4px 8px -6px` na comanda, `drop-shadow(0 3px 4px)` no cupom): a folha apertada contra o balcão.
- **etiqueta-do-toast** (`3px 3px 0`, tinta a 22%; sinal a 25% no erro): o toast é uma etiqueta de papel colada sobre a tela.

### Named Rules
**The Chapado-com-Propósito Rule.** Toda vez que o sistema usa algo parecido com profundidade, é pra simular um objeto físico real (viga, carimbo, selo) — nunca um efeito de elevação de UI genérico.

## Shapes

Raio zero em praticamente tudo dentro de `.paper-check` — botões, badges, cards, diálogos, popovers e inputs, forçado via `border-radius: 0 !important` escopado por `[data-slot]`. O token ambiente `--radius` ainda existe (`0.2rem`, herdado do shadcn) mas é sistematicamente sobrescrito; na prática, raio zero é a regra, não a excepção. Borda é o dispositivo de forma dominante: 1.5px sólida na tinta royal pra grades e botões `outline`; tracejada pra estados provisórios.

### Named Rules
**The Tracejado-é-Provisório Rule.** Borda tracejada sinaliza "ainda não existe" — vaga vazia na mesa, "próxima folha" do bloco no balcão (abrir nova comanda), moldura "Comanda em branco" da conta vazia, avisos (`Alert variant="warning"`, ex.: itens sem dono no cupom). Preenchimento sólido sinaliza autoridade ou a próxima ação — carimbo "organizador", selo "aberta"/"paga", botão de ação principal.

**The Pendente-É-Cheio Rule.** Na coluna Div. de Itens os pesos são invertidos: o item ainda sem ninguém é o bloco cheio royal (é o trabalho que falta e o que trava o "Marcar como paga"); o já dividido é contorno, com "/n" (n = pessoas, "/3"). O glifo é a barra da marca Divide/ai, não um ícone: "/" sozinha no bloco cheio é a divisão ainda em aberto. Os dois têm a mesma largura (42px). Tracejado foi tentado pra esse estado e descartado por falta de destaque; o ícone ÷ saiu com a marca nova.

## Components

### Buttons
- **Shape:** raio zero, sem excepção.
- **Primary:** preenchimento sólido Azul Royal, texto Papel Cru claro, peso 600, uppercase.
- **Outline:** fundo Papel Cru, borda 1.5px Azul Royal, texto Azul Royal.
- **Hover / Focus:** sem deslocamento de sombra; hover escurece levemente o preenchimento, foco adiciona anel de 3px na cor do botão.
- **Secondary / Ghost / Destructive:** herdam as variantes padrão do shadcn, sempre com o mesmo tratamento de raio zero e peso 600.

### Badges
- **Style:** raio zero sempre.
- **Papéis na mesa:** carimbo sobre a base do avatar (entre o avatar e o nome), levemente girado (-6°), sempre com fundo opaco e anel de papel em volta pra não se misturar com o desenho. O nome fica sozinho embaixo.
  - **Organizador:** azul royal cheio — mesmo vocabulário do selo "aberta"/"paga", sinalizando autoridade.
  - **Colaborando** (entrou com login e edita pelo próprio celular): papel sombreado (12% de tinta royal) com texto royal.
  - **Na mesa** (só o nome, adicionado pelo organizador, sem login): papel claro, texto e borda fina de 1px no tom secundário — o caso mais comum, então o mais leve.

### Cards / Containers
- **Corner Style:** raio zero.
- **Background:** Papel Cru com textura de grão repetida (SVG `feTurbulence`, não é asset de imagem).
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** nenhuma borda própria — confia no container pai pra separação visual.
- **Listas dentro de diálogos** (ex.: participantes no diálogo de dividir) não usam `Card`: são régua da comanda, borda 1.5px em volta e entre as linhas, como a tabela de Itens. A linha de quem está usando ganha uma moldura interna de 1.5px (`inset-ring`), sem mudar o fundo.

### Inputs / Fields
- **Style:** sem caixa — só uma linha inferior de 1.5px na tinta royal a 45% de opacidade, sem fundo, sem padding lateral. O modelo é "escrever em cima da linha", não preencher uma caixa.
- **Focus:** a linha inferior engrossa pra 2px e fecha pra tinta plena.
- **Error:** linha inferior vermelha (Vermelho Carimbo), sem mudança de fundo.

### Navigation
Não há navegação por abas simétrica — foi removida de propósito. Itens é a tela principal; Participantes e Resumo são destinos contextuais, alcançados tocando no número de participantes da grade do cabeçalho ou pelo botão "fecha para mim" no fim da lista de itens. Um único ← no masthead, contextual: de Mesa e Resumo volta pra Itens; de Itens (e de conta paga) volta pro histórico. Desconectar fica só no dashboard, nunca dentro da conta. Sem estado "ativo" de navegação, porque não existe navegação simétrica pra ter um.

### A Mesa (signature component)
Tela de Participantes representada como uma mesa vista de cima — referência direta ao dito "quem senta na ponta paga a conta". O dono ocupa a cabeceira (3 colunas no topo); cada participante que entra alterna lado esquerdo/direito, crescendo a mesa pra baixo em vez de reorganizar o layout. Uma coluna central decorativa (ver `viga-da-mesa` em Elevation) conecta visualmente as fileiras. Avatar é um de 4 ilustrados fixos (`avatar_key`); vaga vazia é um quadrado tracejado com "+".

### Cupom Fiscal (signature component)
Tela de Resumo: tira de papel térmico (`.cupom-fiscal`) com serrilha, saindo de uma boca de impressora fixa. Cabeçalho com nome da conta, "DIVIDE/AI · CONTA #NNN", data, pessoas e garçom; colunas NOME / VALOR; uma linha por pessoa (nome + total em negrito, "N itens · subtotal + taxa" embaixo) com os itens num disclosure próprio (`ReceiptDisclosure`: botão com `aria-expanded` + altura animada por `grid-template-rows`, 250ms; não `Accordion`, e não mais `<details>`, que só anima no Chromium). A seta ▾ de "ver itens" vira de cabeça pra baixo ao abrir e fica escondida do leitor de tela. Itens sem dono aparecem como aviso tracejado dentro do cupom. Conta aberta é prévia ao vivo, com impressão animada ao abrir; o carimbo PAGO só bate na transição aberta → paga. É a "cerimônia de fechamento" registrada no Overview.

### O Balcão (signature component)
Dashboard: fundo royal escuro chapado (`.balcao`, sem grão) com os papéis da pessoa em lista. Conta aberta = comanda em miniatura (marca "Divide/ai" impressa + Nº + selo ABERTA, nome da conta manuscrito sobre a linha, pessoas/abertura/dono, parcial). Conta paga = cupom térmico curto com carimbo PAGO, total e "você pagou" em destaque. Papéis retos (giro descartado). "Abrir nova comanda" é a próxima folha do bloco, tracejada.

## Do's and Don'ts

### Do:
- **Do** manter vermelho reservado só pro carimbo "PAGO" e pra ações destrutivas/alertas de risco.
- **Do** escrever em Kalam o que alguém preencheu num campo (número incluído) e manter na voz impressa o que a comanda calcula ou conta.
- **Do** usar borda tracejada só pra estados provisórios e preenchimento sólido só pra estados definitivos/de autoridade.
- **Do** dar textura de grão (`--paper-grain`) a toda superfície do tipo card/dialog/popover/header dentro de `.paper-check`.
- **Do** manter Courier Prime + DotGothic16 isolados ao cupom (Resumo e cupons pagos do balcão) — não deixar vazar pra comanda.

### Don't:
- **Don't** usar raio de borda maior que zero em botão, badge, card, diálogo ou popover dentro de `.paper-check`.
- **Don't** usar sombra ambiente de UI (elevação decorativa) em cards ou botões — profundidade só existe como metáfora física confirmada (viga, selo, papel no balcão, etiqueta do toast).
- **Don't** aplicar DotGothic16 a uma palavra inteira — só a dígitos, "R$" e frações (maiúsculas ficam com altura desigual, já testado).
- **Don't** aplicar a voz manuscrita (Kalam) a rótulos estruturais fixos, a valores calculados ou a qualquer coisa dentro do cupom.
- **Don't** misturar as vozes da comanda e do cupom no mesmo papel.
- **Don't** reintroduzir o visual de dashboard SaaS genérico (cards cinza chapados, badge em pílula, zinc+azul) dentro do escopo `.paper-check` — é o anti-referência confirmado da direção.
