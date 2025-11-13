// Som de clique para todos os botões e links com pequena espera antes de navegar
const clickSfx = new Audio('soundeffects/Click.wav');
clickSfx.preload = 'auto';
clickSfx.volume = 0.9;

function playClickSound() {
  try {
    clickSfx.currentTime = 0;
    // play returns a promise; ignore rejection silently (e.g., autoplay policy)
    clickSfx.play().catch(()=>{});
  } catch (err) {}
}

// Intercepta cliques em links para garantir que o som toque antes de sair da página
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[data-nav], button[data-nav]');
  if (!anchor) {
    // outros botões (sem navegação) ainda tocam som normalmente
    const generic = e.target.closest('a, button, .botao-start, .botao-info, .botoes');
    if (generic) playClickSound();
    return;
  }
  // Verifica se é clique principal sem modificadores (para não interferir em abrir nova aba)
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    // deixa navegação especial acontecer; ainda tenta tocar som
    playClickSound();
    return;
  }
  e.preventDefault();
  const href = anchor.getAttribute('href');
  playClickSound();
  // Delay curto para o som iniciar antes da troca de página
  setTimeout(() => { window.location.href = href; }, 120);
});

// Acessibilidade: tecla Enter/Espaço em foco de link ou botão
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.matches('a[data-nav], button[data-nav]')) {
    e.preventDefault();
    const href = document.activeElement.getAttribute('href');
    playClickSound();
    setTimeout(() => { window.location.href = href; }, 120);
  }
});

