let quizMode = false;
let quizCountries = [];
let quizIndex = 0;
let quizScore = 0;
let currentAnswerId = null;

document.getElementById("quiz-start-btn").addEventListener("click", startQuiz);
document.getElementById('quiz-giveup-btn').addEventListener('click', giveUpQuestion);
document.getElementById('quiz-quit-btn').addEventListener('click', quitQuiz);

function startQuiz() {
    document.getElementById("quiz-bar").style.display = "flex";

    const allFeatures = map.querySourceFeatures("my-countries"); // 読み込み済みの全国データ取得
    // NAME_JAが無い/小さすぎる地物を除外(お好みで調整)
    quizCountries = allFeatures
        .filter((f) => f.properties.NAME_JA)
        .sort(() => Math.random() - 0.5); // シャッフル

    quizIndex = 0;
    quizScore = 0;
    quizMode = true;
    document.getElementById("quiz-total").textContent =
        quizCountries.length;
    document.getElementById("quiz-start-btn").style.display = "none";
    showNextQuestion();

    document.getElementById('layer-panel-toggle').style.display = 'none';
    document.getElementById('layer-panel').style.display = 'none'; // 開いてたら閉じる

}

function showNextQuestion() {
    if (quizIndex >= quizCountries.length) {
        document.getElementById('quiz-country-name').textContent = '終了!お疲れさま';
        quizMode = false;
        document.getElementById('layer-panel-toggle').style.display = 'block'; // ここにも追加
        return;
    }
    
    if (quizIndex >= quizCountries.length) {
        document.getElementById("quiz-country-name").textContent =
            "終了!お疲れさま";
        quizMode = false;
        return;
    }
    const feature = quizCountries[quizIndex];
    currentAnswerId = feature.properties.ADM0_A3;
    document.getElementById("quiz-country-name").textContent =
        feature.properties.NAME_JA;
    document.getElementById("quiz-score").textContent = quizScore;
}

function showFeedback(isCorrect, correctName, isGiveup = false) {
    const el = document.getElementById('quiz-feedback');
    if (isGiveup) {
        el.className = 'quiz-feedback wrong';
        el.textContent = `正解: ${correctName}`;
    } else {
        el.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
        el.textContent = isCorrect ? '正解!' : `不正解(正解: ${correctName})`;
    }
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 1200);
}

function highlightAnswer(clickedId, correctId, isCorrect) {
    if (clickedId && !isCorrect) {
        map.setFeatureState({ source: 'my-countries', id: clickedId }, { quizWrong: true });
    }
    map.setFeatureState({ source: 'my-countries', id: correctId }, { quizCorrect: true });

    setTimeout(() => {
        if (clickedId) {
            map.setFeatureState({ source: 'my-countries', id: clickedId }, { quizWrong: false });
        }
        map.setFeatureState({ source: 'my-countries', id: correctId }, { quizCorrect: false });
    }, 1300);
}

function giveUpQuestion() {
    if (!quizMode) return;

    const correctName = quizCountries[quizIndex].properties.NAME_JA;
    showFeedback(false, correctName, true); // 第3引数: 降参フラグ
    highlightAnswer(null, currentAnswerId, false); // クリックした国が無いのでnull

    quizIndex++;
    setTimeout(showNextQuestion, 1300);
}

function quitQuiz() {
    quizMode = false;
    document.getElementById('quiz-bar').style.display = 'none';
    document.getElementById('layer-panel-toggle').style.display = 'block';
    document.getElementById('main-menu-toggle').style.display = 'block';
}
