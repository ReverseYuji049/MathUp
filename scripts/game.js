// Lógica principal do jogo extraída de game.html

// Cenas: name = nome exibido no footer, label = texto do header, cls = classe, question/answer usados na question-box
const scenes = [
  { name: 'Início', label: 'Lvl 1/4', cls: 'scene-0', question: 'Quanto é 5 + 3?', answer: 8 },
  { name: 'Zona Rochosa', label: 'Lvl 2/4', cls: 'scene-1', question: 'Quanto é 6 + 6?', answer: 12 },
  { name: 'Neve', label: 'Lvl 3/4', cls: 'scene-2', question: 'Quanto é 3 + 4?', answer: 7 },
  { name: 'Topo', label: 'Lvl 4/4', cls: 'scene-3', question: '', answer: 0 }
];

const world = document.getElementById('world');
const phaseLabel = document.getElementById('phaseLabel');
const phaseName = document.getElementById('phaseName');
const character = document.getElementById('character');
const feedback = document.getElementById('feedback');
// Audio effects: background music is handled by parent (play.html). Keep local SFX for clicks and phase pass.
// Background music (re-added)
const bgMusic = new Audio('songs/MusicaOpcao1.mp3');
bgMusic.loop = true; bgMusic.preload = 'auto'; bgMusic.volume = 0.35;
let bgMusicStarted = false;
const musicToggleBtn = document.getElementById('musicToggle');
// Try to autoplay on load; if blocked, show button
function tryStartMusic() {
  if (bgMusicStarted) return;
  bgMusic.play().then(() => {
    bgMusicStarted = true;
    if (musicToggleBtn) musicToggleBtn.classList.add('hidden');
  }).catch(() => {
    // Autoplay blocked, show button
    if (musicToggleBtn) musicToggleBtn.classList.remove('hidden');
  });
}
// Attach button handler
if (musicToggleBtn) {
  musicToggleBtn.addEventListener('click', () => {
    bgMusic.play().then(() => {
      bgMusicStarted = true;
      musicToggleBtn.classList.add('hidden');
    }).catch(() => {});
  });
}
// Attempt autoplay on DOMContentLoaded
document.addEventListener('DOMContentLoaded', tryStartMusic);
// Also try on first user gesture
window.addEventListener('click', tryStartMusic, { once: true });
// Local SFX
const clickSfx = new Audio('soundeffects/Click.wav'); clickSfx.preload = 'auto'; clickSfx.volume = 0.9;
const passSfx = new Audio('soundeffects/PassardeFase.wav'); passSfx.preload = 'auto'; passSfx.volume = 0.9;
function playPass(){ try{ passSfx.currentTime = 0; passSfx.play().catch(()=>{}); } catch(e){} }
// global handler: play click SFX for any button press (delegation)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  // play click sound
  try { clickSfx.currentTime = 0; clickSfx.play().catch(()=>{}); } catch (err) {}
});

// sprite sheet do personagem (colocado em assets/esboco.png)
const SPRITE_SRC = 'assets/esboco.png';
const GIF_FALLBACK = 'assets/esboco.gif';
let spriteFrames = 1;
let spriteIntervalId = null;
let currentSpriteFrame = 0;
let spriteOrientation = 'horizontal'; // 'horizontal' or 'vertical'
let spriteImgW = 0;
let spriteImgH = 0;
let frameW = 0;
let frameH = 0;
// controla quantos passos de subida o personagem já fez
let climbCount = 0;
// estado da pergunta atual - impede cliques após resposta/timeout
let questionActive = false;
// display size per frame (in pixels) — how big each frame should appear inside the character element
let displayFrameW = 0;
let displayFrameH = 0;
// define o background imediatamente (mostra quadro idle) e pré-carrega sprite sheet
try {
  character.style.backgroundImage = `url('${SPRITE_SRC}')`;
  character.style.backgroundSize = `100% 100%`;
  character.style.backgroundPosition = `0% 0%`;
} catch (e) {}
const _sprite_img = new Image();
_sprite_img.onload = () => {
  try {
    spriteImgW = _sprite_img.width;
    spriteImgH = _sprite_img.height;
    if (spriteImgW >= spriteImgH) {
      // horizontal strip: frames laid out left-to-right
      spriteOrientation = 'horizontal';
      spriteFrames = Math.max(1, Math.round(spriteImgW / spriteImgH));
      frameW = Math.round(spriteImgW / spriteFrames);
      frameH = spriteImgH;
    } else {
      // vertical strip: frames top-to-bottom
      spriteOrientation = 'vertical';
      spriteFrames = Math.max(1, Math.round(spriteImgH / spriteImgW));
      frameH = Math.round(spriteImgH / spriteFrames);
      frameW = spriteImgW;
    }
    // set background to use the real image pixels — then scale so each frame maps to the character element size
    character.style.backgroundImage = `url('${SPRITE_SRC}')`;
    // if we already computed displayFrameW/H, apply scaling; otherwise compute now
    if (!displayFrameW || !displayFrameH) computeDisplayFrameSize();
    if (spriteOrientation === 'horizontal') {
      character.style.backgroundSize = `${spriteFrames * displayFrameW}px ${displayFrameH}px`;
    } else {
      character.style.backgroundSize = `${displayFrameW}px ${spriteFrames * displayFrameH}px`;
    }
    character.style.backgroundPosition = `0px 0px`;
  } catch (e) {
    spriteFrames = 1;
  }
};
_sprite_img.src = SPRITE_SRC;

// compute display frame size immediately so animation can start without waiting for sprite onload
function computeDisplayFrameSize() {
  const charW = character.clientWidth || parseInt(getComputedStyle(character).width) || frameW || 360;
  const charH = character.clientHeight || parseInt(getComputedStyle(character).height) || frameH || 360;
  displayFrameW = charW;
  displayFrameH = charH;
  // if sprite already loaded, update background-size to scale frames to display size
  if (spriteImgW && spriteImgH) {
    if (spriteOrientation === 'horizontal') {
      character.style.backgroundSize = `${spriteFrames * displayFrameW}px ${displayFrameH}px`;
    } else {
      character.style.backgroundSize = `${displayFrameW}px ${spriteFrames * displayFrameH}px`;
    }
  }
}

let current = 0;

function renderScenes(){
  world.innerHTML = '';
  // compute pixel offset: available viewport height between header and footer
  function getSceneOffset() {
    const root = getComputedStyle(document.documentElement);
    const headerH = parseInt(root.getPropertyValue('--header-h')) || 70;
    const footerH = parseInt(root.getPropertyValue('--footer-h')) || 50;
    return Math.max(0, window.innerHeight - headerH - footerH);
  }
  const offsetPx = getSceneOffset();
  scenes.forEach((s,i)=>{
    const div = document.createElement('div');
    div.className = 'scene ' + s.cls;
    div.dataset.index = i;
    // por padrão posicionamos todas abaixo da viewport (translateY(offsetPx))
    div.style.transform = `translateY(${offsetPx}px)`;
    // don't render center overlay (phase box) — keep scene empty
    div.innerHTML = '';
    world.appendChild(div);
  });
  // mostra a cena atual (inicial)
  const currentDiv = world.querySelector('.scene[data-index="' + current + '"]');
  if(currentDiv){ currentDiv.style.transition = 'none'; currentDiv.style.transform = 'translateY(0)'; }
  // keep scenes responsive on resize
  window.addEventListener('resize', () => {
    const newOffset = getSceneOffset();
    document.querySelectorAll('.scene').forEach(el => {
      const idx = Number(el.dataset.index);
      if (idx <= current) {
        el.style.transform = 'translateY(0)';
      } else {
        el.style.transform = `translateY(${newOffset}px)`;
      }
    });
    // recompute display frame size on resize so animation frames scale correctly
    computeDisplayFrameSize();
  });
  // debug button removed - no handler attached
}

function updateHeaderFooter(){
  phaseLabel.textContent = scenes[current].label;
  phaseName.textContent = scenes[current].name;
  // atualiza pergunta à direita
  const q = document.getElementById('questionText');
  if(q) q.textContent = scenes[current].question || '';
}

function advancePhase(){
  if(current >= scenes.length -1) return;
  const currentDiv = world.querySelector('.scene[data-index="' + current + '"]');
  const nextIndex = current + 1;
  const nextDiv = world.querySelector('.scene[data-index="' + nextIndex + '"]');
  if(!currentDiv || !nextDiv) return;
  // prepara animação: position initial without transition
  currentDiv.style.transition = 'none';
  nextDiv.style.transition = 'none';
  // compute offset in pixels and position next above the viewport area
  const root = getComputedStyle(document.documentElement);
  const headerH = parseInt(root.getPropertyValue('--header-h')) || 70;
  const footerH = parseInt(root.getPropertyValue('--footer-h')) || 50;
  const offsetPx = Math.max(0, window.innerHeight - headerH - footerH);
  // garante estado inicial: current em 0, next acima (-offsetPx)
  currentDiv.style.transform = 'translateY(0)';
  nextDiv.style.transform = `translateY(-${offsetPx}px)`;
  // desabilita opções e timer durante a animação
  questionActive = false;
  disableOptions();
  stopAndResetTimer();
  // play pass-phase sound
  playPass();
  // inicia animação do sprite (ciclo de frames) — start sprite immediately
  computeDisplayFrameSize();
  startSpriteAnimation(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--transition-duration')) || 1600);
  // calcula o deslocamento vertical do personagem por passo (24% da área entre header/footer)
  const headerHVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
  const footerHVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--footer-h')) || 50;
  const playableH = Math.max(0, window.innerHeight - headerHVal - footerHVal);
  const climbStepPx = Math.round(playableH * 0.24);
  climbCount += 1;
  // cálculo do total desejado sem limite
  let totalClimb = climbCount * climbStepPx;
  // determina tamanho do personagem exibido (displayFrameH) como fallback usa altura do elemento
  const charDisplayH = displayFrameH || character.clientHeight || parseInt(getComputedStyle(character).height) || 360;
  // não queremos que o topo do personagem vá acima do header + 8px
  const minTop = headerHVal + 8; // px
  // posição inicial do centro do personagem (top) antes do translateY
  const initialCenterTop = headerHVal + (playableH * 0.5);
  // posição top final = initialCenterTop - totalClimb
  // exigimos finalTop >= minTop
  const maxAllowedClimb = Math.max(0, initialCenterTop - minTop);
  // mas também considere para que a imagem não suba tanto que sua parte inferior somme: garantir que finalTop + (charDisplayH/2) <= headerHVal + playableH
  const maxClimbByBottom = Math.max(0, (initialCenterTop + (charDisplayH/2)) - (headerHVal + playableH));
  // efetivo máximo de subida: initialCenterTop - minTop
  const effectiveMax = Math.max(0, maxAllowedClimb - maxClimbByBottom);
  // clamp totalClimb
  if (totalClimb > effectiveMax) totalClimb = effectiveMax;
  // aplica transformação imediatamente (vai animar por causa da transition no .character)
  character.style.transform = `translateX(-50%) translateY(-${totalClimb}px)`;

  // use double requestAnimationFrame to ensure initial styles are applied before starting transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const duration = getComputedStyle(document.documentElement).getPropertyValue('--transition-duration').trim() || '1600ms';
      const easing = 'cubic-bezier(.22,.9,.24,1)';
      // apply transitions inline
      currentDiv.style.transition = `transform ${duration} ${easing}`;
      nextDiv.style.transition = `transform ${duration} ${easing}`;
      // trigger transforms to animate
      currentDiv.getBoundingClientRect();
      nextDiv.getBoundingClientRect();
      currentDiv.style.transform = `translateY(${offsetPx}px)`;
      nextDiv.style.transform = 'translateY(0)';

      // fallback: se transitionend não disparar, garantimos onEnd após duration+200ms
      const durationMs = parseInt(duration, 10) || 1600;
      let fallbackFired = false;
      const fallbackTimeout = setTimeout(() => {
        if (fallbackFired) return;
        fallbackFired = true;
        console.warn('advancePhase: transitionend fallback triggered');
        onEndFallback();
      }, durationMs + 200);

      // ao terminar a transição atualizamos índices e header/footer
      const onEndHandler = (e) => {
        if (e && e.target !== nextDiv) return;
        if (fallbackFired) return;
        fallbackFired = true;
        clearTimeout(fallbackTimeout);
        finalizeTransition();
      };
      function onEndFallback() {
        nextDiv.removeEventListener('transitionend', onEndHandler);
        finalizeTransition();
      }
      function finalizeTransition() {
        current = nextIndex;
        updateHeaderFooter();
        // para animação do sprite e volta para quadro idle
        stopSpriteAnimation();
        character.classList.remove('animate');
        // renderiza a próxima pergunta (se houver) e reinicia o timer
        renderQuestion();
        nextDiv.removeEventListener('transitionend', onEndHandler);
      }
      nextDiv.addEventListener('transitionend', onEndHandler);
    });
  });
}

function showFeedback(msg, isError){
  feedback.textContent = msg;
  feedback.style.color = isError ? '#c0392b' : '#27ae60';
  setTimeout(()=>{ if(feedback.textContent === msg) feedback.textContent = ''; }, 2000);
}

function disableOptions(){
  const opts = document.querySelectorAll('#options button');
  opts.forEach(b => b.disabled = true);
}

function checkAnswer(selectedOption){
  // ignore if question not active
  if(!questionActive) return;
  questionActive = false;
  // stop timer
  stopAndResetTimer();
  // disable further clicks
  disableOptions();
  // se já estamos na última fase, ignora cliques
  if(current >= scenes.length -1) return;
  // verifica opção
  if(selectedOption !== scenes[current].answer){
    showFeedback('Incorreto. Tente novamente.', true);
    // redireciona para a tela de derrota após um pequeno delay para permitir o som de clique/feedback
    setTimeout(() => { window.location.href = 'derrota.html'; }, 700);
    return;
  }
  showFeedback('Correto!', false);
  setTimeout(() => {
    advancePhase();
  }, 600);
}

function renderOptions(){
  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = ''; // limpa opções anteriores
  const correctAnswer = scenes[current].answer;
  const usedIndexes = new Set(); // para garantir que não repetimos opções

  // adiciona a resposta correta em uma posição aleatória
  const correctIndex = Math.floor(Math.random() * 4);
  for(let i = 0; i < 4; i++){
    if(i === correctIndex){
      const btn = document.createElement('button');
      btn.textContent = correctAnswer;
      btn.className = 'botoes';
      btn.style.backgroundColor = '#27ae60';
      btn.addEventListener('click', () => { checkAnswer(correctAnswer); });
      optionsContainer.appendChild(btn);
      usedIndexes.add(correctAnswer);
    } else {
      // gera uma opção aleatória que não seja igual à resposta correta nem a outras opções já usadas
      let randomOption;
      do {
        randomOption = Math.floor(Math.random() * 20); // opções de 0 a 19
      } while(usedIndexes.has(randomOption));
      const btn = document.createElement('button');
      btn.textContent = randomOption;
      btn.className = 'botoes';
      btn.style.backgroundColor = '#c0392b';
      btn.addEventListener('click', () => { checkAnswer(randomOption); });
      optionsContainer.appendChild(btn);
      usedIndexes.add(randomOption);
    }
  }

  // ensure buttons are enabled when rendered
  questionActive = true;
}

let timerId = null;
let timeLeft = 10;
const DEFAULT_TIMER_SECONDS = 10;

function resetTimerBar() {
  const fill = document.getElementById('timerFill');
  const timerText = document.getElementById('timerText');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '100%';
    // force reflow so next transition applies
    void fill.offsetWidth;
  }
  if (timerText) timerText.textContent = `${DEFAULT_TIMER_SECONDS}s`;
}

function startTimer(){
  const duration = DEFAULT_TIMER_SECONDS;
  timeLeft = duration;
  const timerDisplay = document.getElementById('timerText');
  const fill = document.getElementById('timerFill');
  if (timerDisplay) timerDisplay.textContent = `${timeLeft}s`;
  // clear any previous timer
  if (timerId) { clearInterval(timerId); timerId = null; }
  // reset and start the bar transition
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '100%';
    // force reflow
    void fill.offsetWidth;
    // animate to 0 over duration seconds
    fill.style.transition = `width ${duration}s linear`;
    // small timeout to ensure transition is applied
    setTimeout(() => { fill.style.width = '0%'; }, 20);
  }
  // numeric countdown (keeps seconds display in sync)
  timerId = setInterval(() => {
    timeLeft -= 1;
    if (timerDisplay) timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;
    if(timeLeft <= 0){
       clearInterval(timerId);
       timerId = null;
       // tempo esgotado, desativa opções e avança
       questionActive = false;
       disableOptions();
       showFeedback('Tempo esgotado!', true);
       // ensure fill is empty
       const f = document.getElementById('timerFill'); if (f) f.style.width = '0%';
       // vai para a tela de derrota em vez de avançar de fase
       setTimeout(() => { window.location.href = 'derrota.html'; }, 800);
     }
  }, 1000);
}

function stopAndResetTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  resetTimerBar();
}

function renderQuestion(){
  const questionText = document.getElementById('questionText');
  const currentScene = scenes[current];
  questionText.textContent = currentScene.question || '';

  // renderiza as opções de resposta
  renderOptions();

  // reinicia o timer sempre que uma nova pergunta é exibida
  startTimer();
}

// Eventos: typed-input removed; option buttons handle answers

// expose advancePhase for debugging in console
window.advancePhase = advancePhase;

// init
renderScenes();
updateHeaderFooter();
// já mostramos cena atual via renderScenes
renderQuestion();

function startSpriteAnimation(durationMs) {
  if (spriteIntervalId) clearInterval(spriteIntervalId);
  if (spriteFrames <= 1 || !displayFrameW || !displayFrameH) {
    // fallback: if sprite sheet not suitable, use the gif fallback
    console.warn('sprite: insufficient frames or display size — falling back to GIF');
    try {
      character.style.backgroundImage = `url('${GIF_FALLBACK}')`;
      character.style.backgroundSize = 'contain';
      character.style.backgroundPosition = 'center';
    } catch (e) {}
    return;
  }
  // speed-up: use 30% of the transition duration for the sprite cycle (faster than scene)
  const effectiveDuration = Math.max(60, Math.floor((durationMs || 1600) * 0.3));
  const frameDuration = Math.max(16, Math.floor(effectiveDuration / spriteFrames));
  console.log('startSpriteAnimation', {durationMs, effectiveDuration, frameDuration, spriteFrames, displayFrameW, displayFrameH});
  currentSpriteFrame = 0;
  // immediate first frame (in px) using display frame size
  if (spriteOrientation === 'horizontal') {
    character.style.backgroundPosition = `${-currentSpriteFrame * displayFrameW}px 0px`;
  } else {
    character.style.backgroundPosition = `0px ${-currentSpriteFrame * displayFrameH}px`;
  }
  spriteIntervalId = setInterval(() => {
    currentSpriteFrame = (currentSpriteFrame + 1) % spriteFrames;
    if (spriteOrientation === 'horizontal') {
      character.style.backgroundPosition = `${-currentSpriteFrame * displayFrameW}px 0px`;
    } else {
      character.style.backgroundPosition = `0px ${-currentSpriteFrame * displayFrameH}px`;
    }
  }, frameDuration);
}

function stopSpriteAnimation() {
  if (spriteIntervalId) {
    clearInterval(spriteIntervalId);
    spriteIntervalId = null;
  }
  // volta ao quadro 0 (idle) em px
  currentSpriteFrame = 0;
  // restore sprite (in case fallback GIF was used earlier)
  try {
    character.style.backgroundImage = `url('${SPRITE_SRC}')`;
    // if we had displayFrame sizes, set backgroundSize accordingly
    if (displayFrameW && displayFrameH) {
      if (spriteOrientation === 'horizontal') {
        character.style.backgroundSize = `${spriteFrames * displayFrameW}px ${displayFrameH}px`;
      } else {
        character.style.backgroundSize = `${displayFrameW}px ${spriteFrames * displayFrameH}px`;
      }
    }
  } catch (e) {}
  character.style.backgroundPosition = `0px 0px`;
}

