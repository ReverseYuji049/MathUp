# MathUp — Documentação do Projeto

Bem-vindo ao repositório do MathUp. Este documento explica a estrutura atual do projeto, o que cada arquivo faz, como rodar localmente, e como estender ou manter o jogo.

## Visão geral

MathUp é um jogo de matemática em que o jogador responde perguntas para “subir a montanha”. O gameplay foi consolidado em uma única página (`game.html`) com transição de cenas, personagem animado (sprite), perguntas de múltipla escolha e temporizador com barra. Há também uma tela inicial (`index.html`), uma página de instruções (`instrucoes.html`) e uma tela de derrota (`derrota.html`).

- Fonte: Google Fonts “Jersey 15” aplicada globalmente via `styles/style.css`.
- Tema: Barras pretas fixas no header e footer em todas as páginas.
- Áudio: Música tema e efeitos sonoros para clique e passagem de fase.

## Estrutura de pastas

```
MathUp/
├─ assets/                # Imagens e sprites (fundos, personagem, telas)
│  ├─ Ground.jpeg
│  ├─ Stone Tiles(1).png
│  ├─ esboco.gif
│  ├─ esboco.png          # Sprite sheet do personagem
│  └─ TelaDerrota.png     # Fundo da tela de derrota
├─ songs/                 # Trilhas sonoras (música tema, etc.)
│  ├─ MusicaOpcao1.mp3    # Música tema atual
│  ├─ MusicaOpcao2.mp3
│  └─ Música de Vitória.mp3
├─ soundeffects/          # Efeitos sonoros
│  ├─ Click.wav           # Clique de botões
│  ├─ PassardeFase.wav    # Passagem de fase
│  ├─ Hit.wav
│  └─ AcertarQuestão.wav
├─ styles/
│  └─ style.css           # Estilos globais: fonte, header/footer, botões
├─ scripts/
│  └─ script.js           # Script do index: som de clique + navegação com pequeno atraso
├─ index.html             # Tela inicial (Start + Como Jogar)
├─ instrucoes.html        # Página de instruções
├─ game.html              # Jogo principal (cenas, perguntas, timer, sprite)
└─ derrota.html           # Tela de derrota (botões de tentar novamente e voltar ao início)
```

Observação: Pastas antigas de fases e legado foram removidas (fases/, legacy/) em favor do fluxo consolidado em `game.html`.

## Páginas

### `index.html` (Tela Inicial)
- Exibe o título “MathUp” e dois botões:
  - Start: navega para `game.html`.
  - Como Jogar: navega para `instrucoes.html`.
- Inclui `scripts/script.js` para tocar o som de clique em botões/links. O script também adiciona um pequeno atraso antes de navegar para garantir que o áudio seja percebido ao clicar.

### `instrucoes.html` (Como Jogar)
- Descreve o objetivo e a mecânica básica de jogo.
- Adiciona som de clique nos botões/links (script inline nesta página).

### `game.html` (Jogo)
Principais seções e responsabilidades:
- Header e Footer fixos (barras pretas) — labels de fase e nome da área.
- Viewport/World/Scenes — estrutura de camadas para simular a subida da montanha:
  - `.scene-0`: Ground.jpeg (início)
  - `.scene-1`: Stone Tiles(1).png (rochas)
  - `.scene-2`: gradiente (neve)
  - `.scene-3`: gradiente (topo)
  - As cenas são posicionadas e animadas via transform/transition para dar impressão de “a tela sobe”.
- Personagem (sprite sheet em `assets/esboco.png`):
  - Centralizado horizontalmente, posição vertical calculada entre header/footer.
  - Animação de sprite durante a transição de fase, quadro parado quando o jogo não está animando.
- Caixa de Perguntas (question-box):
  - Pergunta em destaque (à esquerda, dourado).
  - Opções de múltipla escolha (4 botões), apenas uma correta.
  - Timer de 10s com barra de progresso e contagem numérica.
- Áudio no jogo:
  - Botão “Ativar Música” no canto superior direito (aparece somente se o navegador bloquear autoplay). Ao clicar, inicia a música `songs/MusicaOpcao1.mp3` e o botão desaparece.
  - Efeitos: clique em botões e “Passar de Fase”.
- Lógica de avanço e derrota:
  - Resposta correta dispara a animação de transição (tela sobe) e toca o som de passagem.
  - Resposta incorreta ou tempo esgotado levam à página `derrota.html` após um pequeno atraso para feedback.

## Fluxo do jogo (resumo técnico)
1. `game.html` inicializa cenas e posiciona cada `.scene` fora da viewport, deixando a atual em 0.
2. Exibe pergunta e opções na `question-box`; inicia o timer (10s + barra).
3. Ao clicar em uma opção:
   - Correto: mostra “Correto!”, toca som de passagem, anima a próxima cena subindo e re-renderiza a pergunta.
   - Incorreto: mostra feedback e redireciona para `derrota.html` após breve atraso.
4. Ao esgotar o tempo: feedback “Tempo esgotado!” e redireciona para `derrota.html`.
5. O personagem anima via sprite durante a transição; parado no restante do tempo.
