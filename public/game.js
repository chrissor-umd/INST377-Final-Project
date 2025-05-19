const quoteURL = "https://api.breakingbadquotes.xyz/v1/quotes";
const dictionaryBaseURL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

var gameVariables = {
    health: 5,
    mistakes: 0,
    score: 0,
    difficulty: "easy",
}

const punctuations = ['.', ',', ';', ':', '!', '?', '"', '(', ')', '[', ']', '{', '}', '_'];

var currentQuote = {};

var quoteHistory = [];


async function initGame() {
        gameVariables = {
        health: 5,
        mistakes: 0,
        score: 0,
        difficulty: "easy",
    }
    var difficulty = sessionStorage.getItem("difficulty");
    if (!difficulty) {
        difficulty = "easy";
    }
    var health = sessionStorage.getItem("health");
    var mistakes = 0;
    var score = 0;
    if (!health) {
        health = difficultyLevel[difficulty]["health"];
        console.log("NO HEALTH");
        sessionStorage.setItem("health", health);
    }
    const mistakesDiv = document.getElementById("mistakes");
    while (mistakesDiv.firstChild) {
        mistakesDiv.removeChild(mistakesDiv.firstChild);
    }
    for (let i=0; i < health; i++) {
        const mistakeElem = document.createElement("img");
        mistakeElem.src = "images/mistake.png";
        mistakeElem.classList.add("mistake");
        mistakesDiv.appendChild(mistakeElem);
    }

    gameVariables.health = health;
    gameVariables.mistakes = mistakes;
    gameVariables.score = score;
    gameVariables.difficulty = difficulty;
    const quoteDiv = document.getElementById("quoteDiv");
    while (quoteDiv.firstChild) {
        quoteDiv.removeChild(quoteDiv.firstChild);
    }
    const quoteBox = document.createElement("blockquote");
    quoteBox.id = "quote";
    quoteDiv.appendChild(quoteBox);
    const gameButton = document.getElementById("gameButton");
    gameButton.disabled = false;
    generateQuoteChallenge();
    updateHealth();
}


async function getQuote() {
    var quoteObj;
    do {
        const data = await fetch(quoteURL).then((resp) => resp.json());
        const quote = data[0]["quote"].replace("’", "'");
        const author = data[0]["author"];
        quoteObj = {
            quote: quote,
            author: author
        };
    } while (quoteObj.quote.length < 1 || quoteObj.quote.split(" ").length < 3)
    return quoteObj;
}

async function generateQuoteChallenge() {
    var difficulty = gameVariables.difficulty;
    var quoteObj = {
        quote: "",
        author: ""
    }
    do {
        quoteObj = await getQuote();
    } while (quoteHistory.includes(quoteObj.quote))
    quoteHistory.unshift(quoteObj.quote);
    quoteHistory = quoteHistory.slice(0, 15);
    var quoteArray = quoteObj.quote.split(" ");
    var legalWordIndexes = getLegalWordIndexes(quoteArray);
    var numHiddenWords = Math.max(1, Math.floor(legalWordIndexes.length * difficultyLevel[difficulty]["numHiddenWordsModifier"]));
    randomShuffle(legalWordIndexes);
    var hiddenWordIndexes = legalWordIndexes.slice(0, numHiddenWords);
    currentQuote = {
        quoteArray: quoteArray,
        quoteString: '"',
        hiddenWords: {},
        fullQuote: quoteObj.quote,
        author: quoteObj.author
    }
    for (let i=0; i < hiddenWordIndexes.length; i++) {
        const index = hiddenWordIndexes[i];
        let word = quoteArray[index];
        const inputID = `input${String(hiddenWordIndexes[i])}`;
        let wordNoPunctuation = stripPunctuation(word);
        currentQuote.quoteArray[index] = word.replace(wordNoPunctuation, `<input id='${inputID}' name='${inputID}'></input>`);
        currentQuote.hiddenWords[inputID] = {
            inputWord: wordNoPunctuation,
            realWord: word
        }
    }
    for (let i=0; i < currentQuote.quoteArray.length-1; i++) {
        currentQuote.quoteString += String(currentQuote.quoteArray[i]).replace('"', "'") + " ";
    }
    currentQuote.quoteString += String(currentQuote.quoteArray[currentQuote.quoteArray.length-1].replace('"', "'")) + '"';
    const quoteElem = document.getElementById("quote");
    quoteElem.innerHTML = currentQuote.quoteString;
    const authorElem = document.createElement("p");
    authorElem.id = "author";
    authorElem.innerHTML = `--${quoteObj.author}`;
    quoteElem.appendChild(authorElem);
    swapButton("validate");
    console.log(currentQuote);
}

async function validateAnswer() {
    const inputs = currentQuote.hiddenWords;
    var mistakeFound = false;
    for (const [id, hiddenWordObj] of Object.entries(inputs)) {
        let word = hiddenWordObj.inputWord;
        let realWord = hiddenWordObj.realWord;
        let answerRaw = stripPunctuation(word).toLowerCase();
        let inputRaw = stripPunctuation(document.getElementById(id).value).toLowerCase();
        let answer = answerRaw.replace("’", "").replace("'", "").replace("'", "").replace("-", "");
        let input = inputRaw.replace("’", "").replace("'", "").replace("'", "").replace("-", "");
        var correct;
        var synonymFound = false;
        var color = "green";
        if (answer == input) {
            correct = true;
            gameVariables.score += 1;
        } else {
            
            try {
                const synonyms = await fetch(dictionaryBaseURL + answerRaw)
                    .then((resp) => resp.json())
                    .then((data) => {
                        var synonymArray = [];
                        for (let i=0; i < data.length; i++) {
                            const meanings = data[i]["meanings"];
                            for (let j=0; j < meanings.length; j++) {
                                synonymArray = synonymArray.concat(meanings[j]["synonyms"]);
                                const definitions = meanings[j]["definitions"];
                                for (let k=0; k < definitions.length; k++) {
                                    //console.log(definitions[k]);
                                    synonymArray = synonymArray.concat(definitions[k]["synonyms"]);
                                }
                            }
                        }
                        return synonymArray
                });
                for (let i=0; i < synonyms.length; i++) {
                    var synonym = synonyms[i].toLowerCase().replace("'", "").replace("’", "").replace("-", "");
                    if (input == synonym) {
                        synonymFound = true;
                        break;
                    }
                }
            } catch(error) {
                console.log(error);
                synonymFound = false;
            }
            correct = false;
            if (synonymFound == false) {
                mistakeFound = true;
            }
            if (correct == false) {
                if (synonymFound == true) {
                    color = "blue";
                } else {
                    color = "red";
                }
            }
        }
        const inputID = parseInt(id.slice(5));
        console.log(inputID);
        currentQuote.quoteArray[inputID] = `<span style='color: ${color};'><b>${realWord}</b></span>`;
        console.log(realWord);
        console.log(currentQuote.quoteArray);
        
    }
    if (mistakeFound) {
        gameVariables.mistakes += 1;
    }
    console.log(currentQuote);
    currentQuote.quoteString = '"';
    for (let i=0; i < currentQuote.quoteArray.length-1; i++) {
        currentQuote.quoteString += String(currentQuote.quoteArray[i]).replace('"', "'") + " ";
    }
    currentQuote.quoteString += String(currentQuote.quoteArray[currentQuote.quoteArray.length-1].replace('"', "'")) + '"';
    const quoteElem = document.getElementById("quote");
    quoteElem.innerHTML = currentQuote.quoteString;
    const authorElem = document.createElement("p");
    authorElem.id = "author";
    authorElem.innerHTML = `--${currentQuote.author}`;
    quoteElem.appendChild(authorElem);
    swapButton("next");
    updateHealth();
}

function getLegalWordIndexes(stringArray) {
    var legalWords = [];
    for (let i=0; i < stringArray.length; i++) {
        var word = stringArray[i];
        if (word.length > 3) {
            legalWords.push(i);
        }
    }
    return legalWords;
}

function randomShuffle(array) {
    for (let i=array.length-1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function stripPunctuation(word) {
    var stripped = "";
    for (let i = 0; i < word.length; i++) {
        if (!punctuations.includes(String(word[i]))) {
            stripped += word[i];
        }
    }
    return stripped;
}

function updateHealth() {
    const mistakesDiv = document.getElementById("mistakes");
    var health = gameVariables.health;
    var mistakes = gameVariables.mistakes;
    var i = 0;
    for (const child of mistakesDiv.children) {
        if (i >= mistakes) {
            child.classList.add("gray");
        }
        else {
            child.className = "mistake";
        }
        i += 1;
    }
    const scoreElem = document.getElementById("score");
    scoreElem.innerHTML = gameVariables.score;
    if (mistakes >= health) {
        gameOver();
    }
    
    console.log(mistakes);
    console.log(health);

}

function gameOver() {
    const gameButton = document.getElementById("gameButton");
    gameButton.disabled = true;
    const quoteDiv = document.getElementById("quoteDiv");
    while (quoteDiv.firstChild) {
        quoteDiv.removeChild(quoteDiv.firstChild);
    }
    const gameOver = document.createElement("h2");
    gameOver.innerHTML = "Game Over!";
    quoteDiv.appendChild(gameOver);
    const loserGif = document.createElement("img");
    loserGif.src = "images/loser.gif";
    loserGif.style = "height: 500px;";
    quoteDiv.appendChild(loserGif);
}

function swapButton(buttonType = "validate") {
    const buttonElem = document.getElementById("gameButton");
    switch(buttonType) {
        case "validate":
            buttonElem.innerHTML = "Check Answers";
            buttonElem.onclick = function () {validateAnswer()};
            break;
        case "next":
            buttonElem.innerHTML = "Next Quote";
            buttonElem.onclick = function () {generateQuoteChallenge()};
            break;
    }
}

function showDebug() {
    console.log(currentQuote);
    console.log(currentQuote.fullQuote);
}

function toggleAudio() {
    const audio = document.getElementById("audio");
    audio.muted = !audio.muted;
    const audioImage = document.getElementById("audioImage");
    if (audio.muted) {
        audioImage.opacity = .6;
    } else {
        audioImage.opacity = 1;
    }
}