// Lógica principal do jogo extraída de game.html

// Cenas configuradas com 7 fases, perguntas geradas dinamicamente por categoria
const scenes = [
  { name: 'Início', label: 'Lvl 1/7', cls: 'scene-0' },
  { name: 'Transição', label: 'Lvl 2/7', cls: 'scene-1' },
  { name: 'Zona Rochosa', label: 'Lvl 3/7', cls: 'scene-2' },
  { name: 'Transição 2', label: 'Lvl 4/7', cls: 'scene-3' },
  { name: 'Gelo', label: 'Lvl 5/7', cls: 'scene-4' },
  { name: 'Transição 3', label: 'Lvl 6/7', cls: 'scene-5' },
  { name: 'Topo', label: 'Lvl 7/7', cls: 'scene-6' }
];

// Perguntas carregadas do gerador
const allPhaseQuestions = (window.Questions && typeof window.Questions.generateAllPhases === 'function')
  ? window.Questions.generateAllPhases()
  : [];
const PHASE_QUESTION_COUNT = (window.Questions && window.Questions.QUESTIONS_PER_PHASE) || 5;
let currentQuestionIdx = 0;
let currentQuestion = null;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildFallbackOptions(correct) {
  const opts = new Set([correct]);
  const base = Math.abs(correct) || 1;
  let guard = 0;
  while (opts.size < 4 && guard < 40) {
    guard += 1;
    const delta = Math.max(1, Math.round(base * 0.2));
    const candidate = correct + randInt(-delta - 3, delta + 3);
    if (candidate !== correct) opts.add(candidate);
  }
  return shuffleArray(Array.from(opts));
}

function ensurePhaseData(index) {
  if (allPhaseQuestions[index] && Array.isArray(allPhaseQuestions[index].questions) && allPhaseQuestions[index].questions.length) {
    return allPhaseQuestions[index];
  }
  const fallbackQuestions = [];
  for (let i = 0; i < PHASE_QUESTION_COUNT; i++) {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    const text = `Quanto é ${a} + ${b}?`;
    const answer = a + b;
    fallbackQuestions.push({
      id: `fallback-${index}-${i}`,
      text,
      answer,
      options: buildFallbackOptions(answer)
    });
  }
  const fallbackPhase = { phase: index + 1, questions: fallbackQuestions };
  allPhaseQuestions[index] = fallbackPhase;
  console.warn(`Fase ${index + 1} sem perguntas do gerador. Aplicando fallback simples.`);
  return fallbackPhase;
}

const world = document.getElementById('world');
const phaseLabel = document.getElementById('phaseLabel');
const phaseName = document.getElementById('phaseName');
const character = document.getElementById('character');
const feedback = document.getElementById('feedback');
const scoreBoard = document.getElementById('scoreBoard');
let score = 0;
let highScore = 0;
// Audio effects: background music is handled by parent (play.html). Keep local SFX for clicks and phase pass.
// Background music (re-added)
const bgMusic = new Audio('songs/MusicaOpcao1.mp3');
bgMusic.loop = true; bgMusic.preload = 'auto'; bgMusic.volume = 0.245;
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
const clickSfx = new Audio('soundeffects/Click.wav'); clickSfx.preload = 'auto'; clickSfx.volume = 0.63;
const passSfx = new Audio('soundeffects/PassardeFase.wav'); passSfx.preload = 'auto'; passSfx.volume = 0.63;
const fallSfx = new Audio('soundeffects/Hit.wav'); fallSfx.preload = 'auto'; fallSfx.volume = 0.63;
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
}

// Avança para a próxima fase (chama animação de transição)
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
        // reset question index para a nova fase e renderiza pergunta
        currentQuestionIdx = 0;
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

const DEFAULT_TIMER_SECONDS = 10;
let timerId = null;
let timeLeft = DEFAULT_TIMER_SECONDS;

function resetTimerBar(){
  const fill = document.getElementById('timerFill');
  const timerText = document.getElementById('timerText');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth;
  }
  if (timerText) timerText.textContent = `${DEFAULT_TIMER_SECONDS}s`;
}

function stopAndResetTimer(){
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  resetTimerBar();
}

function startTimer(){
  const timerText = document.getElementById('timerText');
  const fill = document.getElementById('timerFill');
  timeLeft = DEFAULT_TIMER_SECONDS;
  if (timerText) timerText.textContent = `${timeLeft}s`;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth;
    fill.style.transition = `width ${DEFAULT_TIMER_SECONDS}s linear`;
    requestAnimationFrame(() => { fill.style.width = '0%'; });
  }
  timerId = setInterval(() => {
    timeLeft -= 1;
    if (timerText) timerText.textContent = `${Math.max(0, timeLeft)}s`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      timerId = null;
      questionActive = false;
      disableOptions();
      if (fill) fill.style.width = '0%';
      showFeedback('Tempo esgotado!', true);
      triggerFallAndLose();
    }
  }, 1000);
}

function renderOptions(){
   const optionsContainer = document.getElementById('options');
   optionsContainer.innerHTML = '';

   const phaseData = ensurePhaseData(current);
   if (currentQuestionIdx >= phaseData.questions.length) currentQuestionIdx = 0;
   currentQuestion = phaseData.questions[currentQuestionIdx];
   if (!currentQuestion) {
     optionsContainer.textContent = 'Sem perguntas disponíveis.';
     questionActive = false;
     return;
   }

  // Configura texto da pergunta
  const questionText = document.getElementById('questionText');
  if (questionText) questionText.textContent = currentQuestion.text;

  const optionList = Array.isArray(currentQuestion.options) && currentQuestion.options.length
    ? shuffleArray(currentQuestion.options.slice())
    : buildFallbackOptions(Number(currentQuestion.answer) || 0);

  optionList.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'botoes';
    btn.textContent = String(opt);
    btn.addEventListener('click', () => checkAnswer(opt));
    optionsContainer.appendChild(btn);
  });

  questionActive = true;
}

function loadScore(){
  try {
    const stored = localStorage.getItem('mathup_score');
    score = stored ? parseInt(stored, 10) || 0 : 0;
    const storedHigh = localStorage.getItem('mathup_highscore');
    highScore = storedHigh ? parseInt(storedHigh, 10) || 0 : 0;
  } catch (e) {
    score = 0;
    highScore = 0;
  }
  updateScoreBoard();
}

function saveScore(){
  try {
    localStorage.setItem('mathup_score', String(score));
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('mathup_highscore', String(highScore));
    }
  } catch (e) {}
}

function updateScoreBoard(){
  if (scoreBoard) scoreBoard.textContent = `Pontuação: ${score}`;
}

function checkAnswer(selectedOption){
  if (!questionActive) return;
  questionActive = false;
  stopAndResetTimer();
  disableOptions();

  const expected = currentQuestion ? currentQuestion.answer : null;
  const isCorrect = Number(selectedOption) === Number(expected);

  if (!isCorrect) {
    showFeedback('Incorreto. Tente novamente.', true);
    score = Math.max(0, score - 10);
    saveScore();
    updateScoreBoard();
    triggerFallAndLose();
    return;
  }

  showFeedback('Correto!', false);
  score += 50;
  saveScore();
  updateScoreBoard();
  currentQuestionIdx = 0;

  setTimeout(() => {
    if (current >= scenes.length - 1) {
      goToVictoryScreen();
    } else {
      advancePhase();
    }
  }, 600);
}

function renderQuestion(){
  renderOptions();
  startTimer();
}

// Eventos: typed-input removed; option buttons handle answers

// expose advancePhase for debugging in console
window.advancePhase = advancePhase;

// init
renderScenes();
updateHeaderFooter();
currentQuestionIdx = 0;
ensurePhaseData(current);
loadScore();
renderQuestion();

function triggerFallAndLose(){
  stopAndResetTimer();
  stopSpriteAnimation();
  score = 0;
  saveScore();
  updateScoreBoard();
  try {
    character.style.backgroundImage = "url('assets/PersonagemCaindo.png')";
    character.style.backgroundSize = 'contain';
    character.style.backgroundPosition = 'center';
  } catch (e) {}

  try {
    const rect = character.getBoundingClientRect();
    const reducedW = Math.max(48, Math.round(rect.width * 0.75));
    const reducedH = Math.max(48, Math.round(rect.height * 0.75));
    character.style.width = `${reducedW}px`;
    character.style.height = `${reducedH}px`;
  } catch (e) {}

  try { fallSfx.currentTime = 0; fallSfx.play().catch(() => {}); } catch (e) {}

  const FALL_DURATION_MS = 1100;
  character.classList.remove('animate');
  character.classList.remove('falling');

  const computedStyle = window.getComputedStyle(character);
  const currentTransform = computedStyle.transform || 'none';
  const currentOpacity = computedStyle.opacity || '1';

  function parseTranslateY(matrixString) {
    try {
      if (!matrixString || matrixString === 'none') return 0;
      const values = matrixString.match(/matrix.*\((.+)\)/)[1].split(',').map(v => parseFloat(v.trim()));
      if (matrixString.startsWith('matrix3d')) {
        return values[13] || 0;
      }
      return values[5] || 0;
    } catch (e) {
      return 0;
    }
  }

  const currentTy = parseTranslateY(currentTransform);
  character.style.transform = `translateX(-50%) translateY(${currentTy}px)`;
  character.style.opacity = currentOpacity;
  character.style.transition = `transform ${FALL_DURATION_MS}ms ease-in, opacity ${FALL_DURATION_MS}ms ease-in`;
  void character.offsetWidth;

  requestAnimationFrame(() => {
    character.style.transform = `translateX(-50%) translateY(200vh) rotate(25deg)`;
    character.style.opacity = '0';
    character.classList.add('falling');
  });

  const qb = document.getElementById('questionBox');
  if (qb) qb.style.pointerEvents = 'none';

  setTimeout(() => { window.location.href = 'derrota.html'; }, FALL_DURATION_MS + 100);
}

function goToVictoryScreen(){
  stopAndResetTimer();
  stopSpriteAnimation();
  score += 200;
  saveScore();
  updateScoreBoard();
  try { passSfx.currentTime = 0; passSfx.play().catch(()=>{}); } catch (e) {}
  window.location.href = 'topo.html';
}

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

// expose ScoreStorage API for high score access
(function exposeScoreAPI(){
  try {
    window.ScoreStorage = {
      getCurrent: () => {
        try { return parseInt(localStorage.getItem('mathup_score'), 10) || 0; } catch (e) { return 0; }
      },
      getHigh: () => {
        try { return parseInt(localStorage.getItem('mathup_highscore'), 10) || 0; } catch (e) { return 0; }
      }
    };
  } catch (e) {}
})();

