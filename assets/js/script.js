/* Offline support */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./serviceWorker.js")
    .then(() => console.log("Ready for offline use."))
    .catch((error) => console.error("Error while preparing: ", error));
}

/* DOM helpers */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* Game initialization */
const DEFAULT = {
  total: 0,
  timer: 0,
  answered: 0,
  skipped: 0,
  type: "game-hiragana",
  theme: "light",
  font: "inherit",
  dakuten: true,
  card: "Random",
  kanji: false,
};
const LOCAL = JSON.parse(localStorage.getItem("GAME")) || {};
const GAME = Object.assign({}, DEFAULT, LOCAL);
let started = false;

/* Apply saved game settings */
if (GAME.font !== DEFAULT.font) changeFont();
if (GAME.theme !== DEFAULT.theme) {
  $$(".game-theme").forEach((el) => el.classList.toggle("active"));
  toggleTheme();
}

$(`#${GAME.type}`).classList.add("active");
$("#game-dakuten").classList.toggle("active", GAME.dakuten);
document.querySelector("#game-dakuten > span").classList.toggle("text-decoration-line-through", !GAME.dakuten);

if (GAME.card !== DEFAULT.card) {
  $$(".game-card").forEach((el) => el.classList.toggle("active"));
}

const kanjiBtn = $("#game-kanji");
kanjiBtn.classList.toggle("active", GAME.kanji);
kanjiBtn.classList.toggle("text-decoration-line-through", !GAME.kanji);

/* Game setting functions */
function changeFont() {
  $("#game-font").value = GAME.font;
  $$(".game-font-change").forEach((el) => (el.style.fontFamily = GAME.font));
}

function toggleTheme() {
  document.querySelectorAll("body, #menu, #result").forEach((el) => {
    el.classList.toggle("bg-dark");
    el.classList.toggle("text-white");
  });
  $("#answer").classList.toggle("text-white");
  $$("kbd").forEach((el) => {
    el.classList.toggle("bg-light");
    el.classList.toggle("text-black");
  });
  $$(".table").forEach((el) => {
    el.classList.toggle("table-hover");
    el.classList.toggle("text-white");
  });
  $$(".btn").forEach((el) => {
    el.classList.toggle("btn-outline-dark");
    el.classList.toggle("btn-outline-light");
  });
}

/* Game functions */
function nextQuestion() {
  const dakuten = [
    "ば",
    "ぶ",
    "び",
    "べ",
    "ぼ",
    "が",
    "ぎ",
    "ぐ",
    "げ",
    "ご",
    "ざ",
    "じ",
    "ず",
    "ぜ",
    "ぞ",
    "だ",
    "ぢ",
    "づ",
    "で",
    "ど",
    "ぱ",
    "ぴ",
    "ぷ",
    "ぺ",
    "ぽ",
  ];
  let id = Math.floor(Math.random() * cards[GAME.card].length);

  if (!GAME.dakuten) {
    do {
      id = Math.floor(Math.random() * cards[GAME.card].length);
    } while (dakuten.some((e) => cards[GAME.card][id].hiragana.includes(e)));
  }

  const card = cards[GAME.card][id];
  const hiragana =
    card.hiragana.constructor === Array
      ? card.hiragana[Math.floor(Math.random() * card.hiragana.length)]
      : card.hiragana;
  const katakana = wanakana.toKatakana(hiragana);
  let kanji = card.kanji;
  let question = hiragana;

  if (GAME.type === "game-mixed") {
    const random = Math.random() < 0.5;
    question = random ? hiragana : wanakana.toKatakana(question);
    kanji = random ? kanji : wanakana.toKatakana(kanji);
  } else if (GAME.type === "game-katakana") {
    question = katakana;
    kanji = wanakana.toKatakana(kanji);
  }

  $("#question").innerHTML = `${question}<rt>${GAME.kanji ? kanji : ""}</rt>`;
  $("#question-id").value = id;
  $("#answer").value = "";
  $("#score").innerHTML = '<i class="bi-check-circle"></i> ' + `${GAME.answered}/${GAME.answered + GAME.skipped}`;
}

/* Game settings */
document.querySelectorAll("#option-wrapper button, #game-font").forEach((el) => {
  el.addEventListener("click", () => {
    setTimeout(() => {
      localStorage.setItem("GAME", JSON.stringify(GAME));
    }, 100);
  });
});

$("#game-font").addEventListener("change", () => {
  GAME.font = $("#game-font").value;
  changeFont();
});

$$(".game-theme").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-theme").forEach((btn) => btn.classList.toggle("active"));
    GAME.theme = evt.currentTarget.value;
    toggleTheme();
  });
});

$("#game-kanji").addEventListener("click", () => {
  GAME.kanji = !GAME.kanji;
  const btn = $("#game-kanji");
  btn.classList.toggle("active", GAME.kanji);
  btn.classList.toggle("text-decoration-line-through", !GAME.kanji);
});

$$(".game-type").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-type").forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
    GAME.type = evt.currentTarget.id;
  });
});

$("#game-dakuten").addEventListener("click", () => {
  $("#game-dakuten").classList.toggle("active");
  document.querySelector("#game-dakuten > span").classList.toggle("text-decoration-line-through");
  GAME.dakuten = !GAME.dakuten;
});

$$(".game-card").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-card").forEach((btn) => btn.classList.toggle("active"));
    GAME.card = evt.currentTarget.value;
  });
});

/* Buttons event listener */
$("#option").addEventListener("click", () => {
  $("#option").classList.toggle("active");
  $("#option-wrapper").classList.toggle("collapsed");
  $("#option-wrapper").classList.toggle("p-3");
});

$("#start").addEventListener("click", () => {
  const timeEl = $("#time");
  const interval = setInterval(() => {
    if (!started) return clearInterval(interval);
    timeEl.innerHTML = `${++GAME.timer} <i class="bi-clock"></i>`;
  }, 1000);

  $("#review-table").innerHTML = "";
  $("#start").disabled = true;
  $("#game").classList.remove("d-none");
  $("#menu").classList.add("slide-up");
  $("#answer").focus();
  started = true;
  nextQuestion();
});

$("#review").addEventListener("click", () => {
  $("#result").classList.remove("d-none");
  $("#result").classList.add("slide-in");
});

$("#stop").addEventListener("click", () => {
  const average = GAME.timer / (GAME.answered + GAME.skipped);

  $("#result").classList.remove("d-none");
  $("#result").classList.add("slide-in");
  $("#stats-answered").textContent = GAME.answered;
  $("#stats-skipped").textContent = GAME.skipped;
  $("#stats-timer").textContent = GAME.timer + "s";
  $("#stats-average").textContent = average.toFixed(2) + "s";
  $("#review").disabled = false;
  $("#restart").focus();
  started = false;

  if (!GAME.answered && !GAME.skipped) {
    $("#review-wrapper").insertAdjacentHTML("afterbegin", "<b>Be serious.</b>");
  } else if (!GAME.answered && GAME.skipped) {
    $("#review-wrapper").insertAdjacentHTML("afterbegin", "<b>Practice more!</b>");
  }
});

$("#restart").addEventListener("click", () => {
  $("#menu").classList.remove("slide-up");
  const result = $("#result");
  result.classList.remove("slide-in");
  result.addEventListener(
    "transitionend",
    () => {
      result.classList.add("d-none");
      $("#game").classList.add("d-none");
      $("#time").innerHTML = '0 <i class="bi-clock"></i>';
      $("#score").innerHTML = '<i class="bi-check-circle"></i> 0';
      const bold = document.querySelector("#review-wrapper b");
      if (bold) bold.remove();
      $("#copy").innerHTML = '<i class="bi-table"></i> Copy Table';
      $("#share").innerHTML = '<i class="bi-share"></i> Share';
      $("#start").disabled = false;
      $("#start").focus();
    },
    { once: true },
  );

  GAME.timer = DEFAULT.timer;
  GAME.answered = DEFAULT.answered;
  GAME.skipped = DEFAULT.skipped;
});

$("#copy").addEventListener("click", async () => {
  const text =
    $("#review-table").textContent.replaceAll("‎‎", "\n").replaceAll("‎", " ー ").trim() || "Why did I copy this?";
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    $("#result").appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  $("#copy").innerHTML = '<i class="bi-table"></i> Copied!';
});

$("#share").addEventListener("click", async () => {
  const average = GAME.timer / (GAME.answered + GAME.skipped);
  const activeType = $(".game-type.active");
  const type = activeType ? activeType.textContent.trim() : "";
  const text =
    "Asobimashou! 遊びましょう！\n" +
    `${location.href}\n` +
    `Card: ${GAME.card} | Type: ${type} | Dakuten: ${GAME.dakuten}\n` +
    `Answered: ${GAME.answered} | Skipped: ${GAME.skipped}\n` +
    `Time: ${GAME.timer}s | Average: ${average.toFixed(2)}s`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    $("#result").appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  $("#share").innerHTML = '<i class="bi-share"></i> Copied!';
});

/* Answer input handling */
$("#answer").addEventListener("keyup", () => {
  const id = $("#question-id").value;
  const card = cards[GAME.card][id];
  const jisho = "https://jisho.org/word/" + card.kanji;
  const means = card.meaning.split(", ")[0].trim();
  const meaning = means.match(/\(((?!\)).)*$/) ? means + ")" : means;
  const question = $("#question").childNodes[0].nodeValue.trim();
  const romaji = wanakana.toRomaji(question);
  const options = { customKanaMapping: { dzu: "づ" } };
  const q = wanakana.toHiragana(question, options);
  const answer = $("#answer").value;
  const a = wanakana.toHiragana(answer, options);

  if (answer.indexOf(" ") > -1) {
    $("#review-table").insertAdjacentHTML(
      "beforeend",
      `<tr><th><i class="d-none">❌（${card.kanji}）</i>` +
        `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
        `<td class="text-danger">${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
    );
    GAME.skipped++;
    return nextQuestion();
  }

  if (q !== a) return;

  $("#review-table").insertAdjacentHTML(
    "beforeend",
    `<tr><th><i class="d-none">（${card.kanji}）</i>` +
      `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
      `<td>${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
  );
  GAME.answered++;
  nextQuestion();
});

$("#answer").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    $("#stop").click();
  }
});
