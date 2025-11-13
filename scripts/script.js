// script.js - validação da resposta do usuário na página Base.html

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('resposta-usuario');
  const btn = document.getElementById('verificar-btn');
  const caixaResposta = document.getElementById('caixa-resposta');

  // Resposta correta para a pergunta atual (Quanto é 5 + 3?)
  const correctAnswer = 8;

  // Função para mostrar feedback abaixo do input
  function showFeedback(message, isError = false) {
    if (!caixaResposta) return;
    let feedback = document.getElementById('feedback-msg');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.id = 'feedback-msg';
      feedback.style.marginTop = '8px';
      feedback.style.fontWeight = '600';
      caixaResposta.appendChild(feedback);
    }
    feedback.textContent = message;
    feedback.style.color = isError ? '#c0392b' : '#27ae60';
  }

  function validateAndProceed() {
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) {
      showFeedback('Por favor insira uma resposta.', true);
      return;
    }

    // Aceita vírgula ou ponto como separador decimal
    const normalized = raw.replace(',', '.');
    const value = Number(normalized);

    if (Number.isNaN(value)) {
      showFeedback('Resposta inválida. Insira um número.', true);
      return;
    }

    // Comparação numérica com pequena tolerância
    if (Math.abs(value - correctAnswer) < 1e-9) {
      // Resposta correta: redireciona
      window.location.href = '../fases/fase2/Rochas.html';
    } else {
      showFeedback('Resposta incorreta. Tente novamente.', true);
    }
  }

  if (btn) btn.addEventListener('click', validateAndProceed);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateAndProceed();
      }
    });
  }
});

