# Tema Moderno — pacote de template

Só o template: layout, componentes, efeitos e a tela de carregamento. Sem dados de nenhum projeto — os textos e números que aparecem no kit e no modelo são exemplo. São quatro arquivos:

| Arquivo | Para que serve |
|---|---|
| `nova-moderno.css` | A folha do tema. Tokens claro/escuro, tipografia, controles, superfícies, efeitos e as classes de relatório. Sem dependências. |
| `NOVA-Moderno-Kit.html` | Referência visual viva. Abra no navegador e use o botão de aparência no topo: mostra tokens com o hex de cada tema, escala tipográfica, controles, os quatro efeitos, a janela, a tela de carregamento e os gráficos. |
| `modelo-relatorio-9x16.html` | Ponto de partida do card de celular (1080×1920). Os dados ficam num objeto `DADOS` no topo do script — troque os valores e está feito. |
| `nova-symbol.png` | O símbolo da marca. Vai no topo dos relatórios e na tela de carregamento. |

Abra o kit primeiro. Depois duplique o modelo e troque os dados.

---

## 1. Como o tema funciona

**Tema por atributo.** Tudo sai de variáveis CSS declaradas em `html`. O modo escuro é o mesmo conjunto de nomes com outros valores:

```html
<html>                    <!-- claro -->
<html data-theme="dark">  <!-- escuro -->
```

Nenhum componente sabe qual tema está ativo — ele só usa `var(--card-a)`, `var(--text)`, etc. Para trocar em tempo real, ligue `data-theme-anim` no `html` por 1s (a folha cuida da transição) e depois remova:

```js
html.setAttribute('data-theme-anim', '');
if (html.dataset.theme === 'dark') delete html.dataset.theme; else html.dataset.theme = 'dark';
setTimeout(() => html.removeAttribute('data-theme-anim'), 1050);
```

**Fonte.** A de produção é Google Sans, que não é distribuível; a folha cai para **DM Sans** (importada do Google Fonts), de desenho geométrico parecido. Peso **700 é o padrão do corpo**; textos de apoio caem para 400.

**Estrutura da página.** Uma pilha de faixas alternando fundo, conteúdo centralizado num contêiner de 1160px:

```html
<section class="nova-m-band"><div class="nova-m-wrap nova-m-center"> … </div></section>
<section class="nova-m-band nova-m-band--alt"><div class="nova-m-wrap nova-m-center"> … </div></section>
```

Cartões usam `--card-a` sobre `.nova-m-band` e `--card-b` sobre `.nova-m-band--alt` — a folha já troca sozinha. **Não use sombra** fora de janelas: a hierarquia vem do contraste entre fundo e cartão.

**Raios:** 14 campo · 18–26 linha de lista · 28–34 cartão, bloco e janela · 980 botão e pílula.

**Cor.** Acentos `--a-*` (azul, ciano, verde, âmbar, laranja, magenta, púrpura) para categorias. Duas regras fixas:

- **negativo, reprovado, erro → `--red`**
- **positivo, aprovado → `--a-blu`**

Um acento por cartão, aplicado numa barrinha de 4–5px. Nunca gradiente como fundo de bloco.

## 2. A marca e os efeitos

A marca é o símbolo + palavra + a assinatura, com a **palavra centralizada sobre a assinatura**:

```html
<div class="nova-m-mark nova-m-mark--row">
  <img src="nova-symbol.png" alt="" class="nova-m-mark__symbol nova-m-breathe">
  <div class="nova-m-mark__text">
    <p class="nova-m-mark__word nova-m-wave--brand">NOVA</p>
    <p class="nova-m-mark__signature">NÚCLEO OPERACIONAL <span>A</span> CREDIT</p>
  </div>
</div>
```

São quatro efeitos, e nenhum a mais:

1. **`.nova-m-wave--brand`** — o gradiente da marca (azul → ciano → verde → âmbar → laranja → magenta) atravessa o texto e volta à cor do tema. 6s, linear, infinito. Só na palavra da marca.
2. **`.nova-m-breathe`** — o símbolo sobe 4px e cresce 1,5% em 7s. Só no símbolo.
3. **`.nova-m-rise`** — entrada em cascata: sobe 16px com atraso de 90ms por item, via `style="--i:0"`, `--i:1`… **A animação nunca condiciona a visibilidade**: o elemento já está visível, só o deslocamento anima.
4. **Troca de tema** — 1s de transição em cor, fundo e borda, ligada só durante a troca.

Fechando: a **faixa arco-íris** `.nova-m-signature` no fim da página, e o **acento do módulo** `.nova-m-module__mark` abrindo o topo. Nada disso no meio do conteúdo.

Todos os efeitos são desligados em `prefers-reduced-motion`.

## 3. Tela de carregamento

`.nova-m-loading` + `.nova-m-loader`: três anéis concêntricos respirando, a marca no centro, barra multicolor e o rótulo "PREPARANDO SUA EXPERIÊNCIA". Está montada no kit (botão "Ver tela de carregamento") — copie de lá. Estrutura:

```html
<div class="nova-m-loading" role="status" aria-live="polite" aria-label="Carregando">
  <div class="nova-m-loader">
    <div class="nova-m-loader__rings" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="nova-m-loader__core">
      <div class="nova-m-mark nova-m-mark--loader"> … a marca … </div>
      <div class="nova-m-loader__bar" aria-hidden="true"><span></span></div>
      <p class="nova-m-loader__label">Preparando sua experiência</p>
    </div>
  </div>
</div>
```

Mostre em toda troca de página; esconda quando o conteúdo estiver pronto.

## 4. Relatório desktop

Ordem das faixas: **capa** (acento do módulo + eyebrow + título + lead) → **cartões de total** → **gráficos** → **ranking** → **tabela detalhada** (atrás de um botão fantasma, para não pesar a página) → **rodapé com fonte e data de corte** → faixa arco-íris.

Classes prontas: `.nova-r-bloco` (bloco de gráfico), `.nova-r-barras` / `.nova-r-bar` (barras empilhadas), `.nova-r-line` (linha em SVG), `.nova-r-rank` (ranking com trilha), `.nova-r-tabela`.

Cabeçalho com o botão de aparência: copie a `.nova-m-topbar` do kit.

## 5. Card 9:16 para celular

`modelo-relatorio-9x16.html` já é isso. Três coisas a saber:

**Fecha exatamente 1920px.** O card é `1080×1920` com `overflow:hidden`. Meça e ajuste:

```js
document.getElementById('card').scrollHeight  // tem que dar 1920
```

Se sobrar ou faltar, mexa nos paddings de `.nova-r-shot__topo`, `.nova-r-shot__corpo` e `.nova-r-shot__rodape`, ou **tire um bloco**. Nunca encolha a tipografia para caber — o card é para ler no celular.

**Escala é o dobro do desktop:** título 96px · rótulo de cartão 24 · número 72 · nota 20 · título de bloco 39 · nome no ranking 29 · eixos de gráfico 22–26. A tabela detalhada não entra nessa versão.

**Um arquivo por tema.** Para a versão escura, duplique o arquivo e ponha `data-theme="dark"` no `<html>`. Exporte cada um como PNG capturando o elemento `.nova-r-shot` — **em 2×** (2160×3840), que aguenta a compressão do WhatsApp.

## 6. Gráficos, sem biblioteca

**Barras empilhadas** são divs com altura calculada a partir de uma escala declarada na legenda: `altura = valor / escala × altura_da_coluna`. Reprovado em cima (`--red`, cantos de cima arredondados), aprovado embaixo (`--a-blu`), total em cima da coluna.

**Linha** é um SVG com `viewBox` — coordenadas calculadas em JS, grade de 1,5px em `--hair`, ponto com miolo `--card-b`, rótulo de valor em cada ponto. O gráfico deve **ocupar a altura livre do bloco**: se sobrar espaço embaixo, aumente a altura do `viewBox`. Quando dois rótulos vizinhos colidem, marque um deles com `abaixo: true` (o modelo já faz isso no primeiro ponto).

Nada de Chart.js, D3 ou `<canvas>`: é tudo HTML/CSS/SVG, para o print sair nítido em qualquer escala.

## 7. Dados

Números vêm de quem pede o relatório, **sem reescrever**. Formatação pt-BR: vírgula decimal (`36,4%`), data `dd/mm`. O rodapé sempre diz a fonte e a data de corte. Se um número não existe, mostre `—` em vez de inventar. Os valores no kit e no modelo são só exemplo — substitua todos.

---

Dúvida de estilo: abra `NOVA-Moderno-Kit.html` e olhe como está lá.
