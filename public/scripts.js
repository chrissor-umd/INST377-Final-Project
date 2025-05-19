const difficultyLevel = {
    "easy": {
        numHiddenWordsModifier: .15,
        health: 5,
        },
    "medium": {
        numHiddenWordsModifier: .25,
        health: 4,
        },
    "hard": {
        numHiddenWordsModifier: .30,
        health: 3,
        }
};

function setupGame() {
    var difficulty = document.getElementById("difficultySelect").value;
    sessionStorage.setItem("difficulty", difficulty);
    sessionStorage.setItem("health", difficultyLevel[difficulty]["health"]);
    window.location.href = "game.html";
}
