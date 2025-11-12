let respostaCorreta;
let perguntasCorretas = 0;
let nivelAtual = 1;

function gerarPergunta(){
    num1 = Math.floor(Math.random() * 100) + 1;
    num2 = Math.floor(Math.random() * 100) + 1;
}

function aparecerPergunta() {
    gerarPergunta();
    const textoParaExibir = num1 + "+" + num2;
    const elementoDaPergunta = document.getElementById("aparecerPergunta")
    elementoDaPergunta.textContent = textoParaExibir
}

function pegarRespostaUsuario() {
    document.getElementById("perguntaTexto");
    verificarResposta();
}

function verificarResposta() {
    const respostaUsuario = parseInt(document.getElementById("respostaInput").value);
    const resultadoEsperado = num1 + num2;

    respostaCorreta = respostaUsuario == resultadoEsperado;

    if (respostaCorreta) {
        alert("Resposta Correta!");
        proximaPergunta();
    } else {
        alert("Resposta Errada, escorregando...!")
        redirecionarDerrota();
    }

    document.getElementById("respostaInput").value = "";
}

function proximaPergunta(){
    perguntasCorretas++;

    if (nivelAtual <= totalNiveis){
        gerarPergunta();
        
    } else {
        alert("Parabéns! Você passou de nível! Direcionando para a próxima área!")
        redirecionarProximoNivel();
    }

}
function redirecionarDerrota() {
    window.location.href = "derrota.html";
}
function redirecionarProximoNivel(){
    nivelAtual++;
    if (nivelAtual == 2) {
        window.location.href = "Rochas.html"
    } else if (nivelAtual == 3) {
        window.location.href = "Neve.html"
    } else if (nivelAtual == 4) {
        window.location.href = "Topo.html"
    } else if (nivelAtual == 5) {
        window.location.href = "vitoria.html"
    } 
}

window.onload = gerarPergunta;