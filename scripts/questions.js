const QUESTIONS_PER_PHASE = 5;

function pickInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1)) + min;
 }

function buildOptions(correct) {
   const options = new Set([correct]);
   let tries = 0;
  while (options.size < 4 && tries < 50) {
     tries += 1;
    const candidate = correct + pickInt(-4, 4);
     if (candidate !== correct && candidate >= -200 && candidate <= 999) {
       options.add(candidate);
     }
   }
   const arr = Array.from(options);
   for (let i = arr.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr;
}

function createQuestion(id, text, answer) {
  return { id, text, answer, options: buildOptions(answer) };
}

function genAddSubQuestions(phase, min, max) {
  const questions = [];
  for (let i = 0; i < QUESTIONS_PER_PHASE; i++) {
    const isAdd = Math.random() < 0.5;
    if (isAdd) {
      const a = pickInt(min, max);
      const b = pickInt(min, max);
      questions.push(createQuestion(`${phase}-${i+1}`, `Quanto é ${a} + ${b}?`, a + b));
    } else {
      const upper = Math.min(29, Math.max(min, Math.min(max, 29)));
      const lower = Math.max(1, Math.min(upper, min));
      const a = pickInt(lower, upper);
      const b = pickInt(lower, upper);
      const x = Math.max(a, b);
      const y = Math.min(a, b);
      questions.push(createQuestion(`${phase}-${i+1}`, `Quanto é ${x} - ${y}?`, x - y));
    }
  }
  return questions;
}

function genMultiplicationQuestions(phase, firstMin, firstMax, secondMin, secondMax) {
   const questions = [];
   for (let i = 0; i < QUESTIONS_PER_PHASE; i++) {
     const a = pickInt(firstMin, firstMax);
     const b = pickInt(secondMin, secondMax);
     questions.push(createQuestion(`${phase}-${i+1}`, `Quanto é ${a} × ${b}?`, a * b));
   }
   return questions;
}

function genDivisionExactQuestions(phase, dividendMin, dividendMax, divisorMin, divisorMax) {
   const questions = [];
   for (let i = 0; i < QUESTIONS_PER_PHASE; i++) {
     const divisor = pickInt(divisorMin, divisorMax);
     const quotient = pickInt(2, Math.max(2, Math.floor(dividendMax / divisor)));
     let dividend = divisor * quotient;
     if (dividend < dividendMin) {
       dividend = divisor * (quotient + 1);
     }
     questions.push(createQuestion(`${phase}-${i+1}`, `Quanto é ${dividend} ÷ ${divisor}?`, Math.floor(dividend / divisor)));
   }
   return questions;
}

function genPowerRootQuestions(phase) {
   const questions = [];
   for (let i = 0; i < QUESTIONS_PER_PHASE; i++) {
     if (i % 2 === 0) {
      const base = pickInt(2, 5);
      const exp = Math.random() < 0.7 ? 2 : 3;
       questions.push(createQuestion(`${phase}-${i+1}`, `Quanto é ${base}^${exp}?`, Math.pow(base, exp)));
     } else {
      const root = pickInt(2, 9);
       const square = root * root;
       questions.push(createQuestion(`${phase}-${i+1}`, `Qual é a raiz quadrada de ${square}?`, root));
     }
   }
   return questions;
}

function generatePhase(phaseNumber) {
   switch (phaseNumber) {
     case 1: return { phase: 1, questions: genAddSubQuestions(1, 1, 10) };
     case 2: return { phase: 2, questions: genAddSubQuestions(2, 5, 30) };
     case 3: return { phase: 3, questions: genMultiplicationQuestions(3, 2, 6, 2, 6) };
     case 4: return { phase: 4, questions: genMultiplicationQuestions(4, 6, 20, 2, 5) };
     case 5: return { phase: 5, questions: genDivisionExactQuestions(5, 10, 60, 2, 6) };
     case 6: return { phase: 6, questions: genDivisionExactQuestions(6, 20, 90, 2, 6) };
     case 7: return { phase: 7, questions: genPowerRootQuestions(7) };
     default: return { phase: phaseNumber, questions: genAddSubQuestions(phaseNumber, 1, 20) };
   }
}

function generateAllPhases() {
  const phases = [];
  for (let p = 1; p <= 7; p++) {
    phases.push(generatePhase(p));
  }
  return phases;
}

const api = { generatePhase, generateAllPhases, QUESTIONS_PER_PHASE };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.Questions = api;
}
