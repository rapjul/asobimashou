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

/* Persistent settings — saved to localStorage */
const SETTINGS_DEFAULT = {
  type: "game-hiragana",
  theme: "system",
  font: "inherit",
  dakuten: true,
  card: "Random",
  kanji: false,
};

/* One-time migration from old "GAME" key */
if (localStorage.getItem("GAME") && !localStorage.getItem("SETTINGS")) {
  const old = JSON.parse(localStorage.getItem("GAME"));
  const migrated = {};
  for (const key of Object.keys(SETTINGS_DEFAULT)) {
    if (old[key] !== undefined) migrated[key] = old[key];
  }
  localStorage.setItem("SETTINGS", JSON.stringify(migrated));
  localStorage.removeItem("GAME");
}

const SETTINGS_SAVED = JSON.parse(localStorage.getItem("SETTINGS")) || {};
const SETTINGS = Object.assign({}, SETTINGS_DEFAULT, SETTINGS_SAVED);

/* Runtime state — never persisted, always fresh */
const GAME = {
  total: 0,
  timer: 0,
  answered: 0,
  skipped: 0,
};
let started = false;

/* Apply saved game settings */
if (SETTINGS.font !== SETTINGS_DEFAULT.font) changeFont();

/** MediaQueryList for the OS dark-mode preference. */
const systemDarkMQ = window.matchMedia("(prefers-color-scheme: dark)");

/**
 * Apply dark or light Bootstrap classes to all themed elements.
 * Uses absolute assignment (not toggle) so the state never drifts.
 * @param {boolean} isDark - True to enable dark mode, false for light.
 */
function applyTheme(isDark) {
  document.querySelectorAll("body, #menu, #result").forEach((el) => {
    el.classList.toggle("bg-dark", isDark);
    el.classList.toggle("text-white", isDark);
  });
  $("#answer").classList.toggle("text-white", isDark);
  $$("kbd").forEach((el) => {
    // Keyboard keys (kbd) should have inverted themes:
    // Dark mode -> White background, dark text
    // Light mode -> Dark background, white text
    el.classList.toggle("bg-white", isDark);
    el.classList.toggle("text-dark", isDark);
    el.classList.toggle("bg-dark", !isDark);
    el.classList.toggle("text-white", !isDark);
  });
  $$(".table").forEach((el) => {
    el.classList.toggle("table-hover", !isDark);
    el.classList.toggle("text-white", isDark);
  });
  $$(".btn").forEach((el) => {
    // Buttons use outline variants so the Bootstrap .active class renders as a
    // visually distinct filled state (solid bg + contrasting text).
    // Light mode -> dark outline (active = filled dark)
    // Dark mode  -> light outline (active = filled light/white)
    // Strip all four possible Bootstrap button-variant classes first so they
    // never accumulate and create conflicts across multiple applyTheme calls.
    el.classList.remove("btn-dark", "btn-light", "btn-outline-dark", "btn-outline-light");
    el.classList.toggle("btn-outline-dark", !isDark);
    el.classList.toggle("btn-outline-light", isDark);
  });
}

/**
 * Resolve whether dark mode should be active for a given theme value.
 * @param {"system"|"light"|"dark"} theme - The selected theme.
 * @returns {boolean} True if dark mode should be applied.
 */
function resolveIsDark(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemDarkMQ.matches; // "system"
}

/* Apply theme on load */
applyTheme(resolveIsDark(SETTINGS.theme));

/* Keep active button in sync with the loaded setting */
$$(".game-theme").forEach((btn) => {
  btn.classList.toggle("active", btn.value === SETTINGS.theme);
});

/* React to OS-level theme changes when in "system" mode */
systemDarkMQ.addEventListener("change", () => {
  if (SETTINGS.theme === "system") applyTheme(systemDarkMQ.matches);
});

$(`#${SETTINGS.type}`).classList.add("active");
$("#game-dakuten").classList.toggle("active", SETTINGS.dakuten);
document.querySelector("#game-dakuten > span").classList.toggle("text-decoration-line-through", !SETTINGS.dakuten);

/* Set the active card button based on the saved setting. */
$$(".game-card").forEach((el) => {
  el.classList.toggle("active", el.value === SETTINGS.card);
});

const kanjiBtn = $("#game-kanji");
kanjiBtn.classList.toggle("active", SETTINGS.kanji);
kanjiBtn.classList.toggle("text-decoration-line-through", !SETTINGS.kanji);

/* Game setting functions */
function changeFont() {
  $("#game-font").value = SETTINGS.font;
  $$(".game-font-change").forEach((el) => (el.style.fontFamily = SETTINGS.font));
}

/* Game functions */
/**
 * Generate the next question by selecting a random card from the selected deck.
 * The question will be displayed in either Hiragana or Katakana depending on the selected type.
 * @returns {void}
 */
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
  let id = Math.floor(Math.random() * cards[SETTINGS.card].length);

  if (!SETTINGS.dakuten) {
    do {
      id = Math.floor(Math.random() * cards[SETTINGS.card].length);
    } while (
      dakuten.some((e) => {
        const h = cards[SETTINGS.card][id].hiragana;
        return (Array.isArray(h) ? h.join("") : h).includes(e);
      })
    );
  }

  const card = cards[SETTINGS.card][id];
  const hiragana =
    card.hiragana.constructor === Array
      ? card.hiragana[Math.floor(Math.random() * card.hiragana.length)]
      : card.hiragana;
  const katakana = wanakana.toKatakana(hiragana);
  let kanji = card.kanji;
  let question = hiragana;

  if (SETTINGS.type === "game-mixed") {
    const random = Math.random() < 0.5;
    question = random ? hiragana : wanakana.toKatakana(question);
    kanji = random ? kanji : wanakana.toKatakana(kanji);
  } else if (SETTINGS.type === "game-katakana") {
    question = katakana;
    kanji = wanakana.toKatakana(kanji);
  }

  $("#question").innerHTML = `${question}<rt>${SETTINGS.kanji ? kanji : ""}</rt>`;
  $("#question-id").value = id;
  $("#answer").value = "";
  $("#score").innerHTML = '<i class="bi-check-circle"></i> ' + `${GAME.answered}/${GAME.answered + GAME.skipped}`;
}

/* Game settings */
document.querySelectorAll("#option-wrapper button, #game-font").forEach((el) => {
  el.addEventListener("click", () => {
    setTimeout(() => {
      localStorage.setItem("SETTINGS", JSON.stringify(SETTINGS));
    }, 100);
  });
});

$("#game-font").addEventListener("change", () => {
  SETTINGS.font = $("#game-font").value;
  changeFont();
});

$$(".game-theme").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-theme").forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
    SETTINGS.theme = evt.currentTarget.value;
    applyTheme(resolveIsDark(SETTINGS.theme));
  });
});

$("#game-kanji").addEventListener("click", () => {
  SETTINGS.kanji = !SETTINGS.kanji;
  const btn = $("#game-kanji");
  btn.classList.toggle("active", SETTINGS.kanji);
  btn.classList.toggle("text-decoration-line-through", !SETTINGS.kanji);
});

$$(".game-type").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-type").forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
    SETTINGS.type = evt.currentTarget.id;
  });
});

$("#game-dakuten").addEventListener("click", () => {
  $("#game-dakuten").classList.toggle("active");
  document.querySelector("#game-dakuten > span").classList.toggle("text-decoration-line-through");
  SETTINGS.dakuten = !SETTINGS.dakuten;
});

$$(".game-card").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    $$(".game-card").forEach((btn) => btn.classList.toggle("active"));
    SETTINGS.card = evt.currentTarget.value;
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
  $("#game").classList.add("d-none");
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
    },
    { once: true },
  );

  GAME.timer = 0;
  GAME.answered = 0;
  GAME.skipped = 0;
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
  const text = `
Asobimashou! 遊びましょう！ (Let's Play!)
Card: ${SETTINGS.card} | Type: ${type} | Dakuten: ${SETTINGS.dakuten}
Answered: ${GAME.answered} | Skipped: ${GAME.skipped}
Time: ${GAME.timer}s | Average: ${average.toFixed(2)}s

Check it out at: ${location.href}
  `.trim();
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

/**
 * Record the current question as skipped, log it to the review table,
 * and advance to the next question.
 * Called by both the Space key handler and the #skip button.
 * @returns {void}
 */
function skipQuestion() {
  const id = $("#question-id").value;
  const card = cards[SETTINGS.card][id];
  const jisho = "https://jisho.org/word/" + card.kanji;
  const means = card.meaning.split(", ")[0].trim();
  const meaning = means.match(/\(((?!\)).)*$/) ? means + ")" : means;
  const question = $("#question").childNodes[0].nodeValue.trim();
  const romaji = wanakana.toRomaji(question);

  $("#review-table").insertAdjacentHTML(
    "beforeend",
    `<tr><th><i class="d-none">❌（${card.kanji}）</i>` +
      `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
      `<td class="text-danger">${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
  );
  GAME.skipped++;
  $("#answer").value = "";
  nextQuestion();
}

$("#answer").addEventListener("keyup", () => {
  const id = $("#question-id").value;
  const card = cards[SETTINGS.card][id];
  const options = { customKanaMapping: { dzu: "づ" } };
  const question = $("#question").childNodes[0].nodeValue.trim();
  const q = wanakana.toHiragana(question, options);
  const answer = $("#answer").value;
  const a = wanakana.toHiragana(answer, options);

  /* Space key: skip the current question */
  if (answer.indexOf(" ") > -1) return skipQuestion();

  if (q !== a) return;

  const jisho = "https://jisho.org/word/" + card.kanji;
  const means = card.meaning.split(", ")[0].trim();
  const meaning = means.match(/\(((?!\)).)*$/) ? means + ")" : means;
  const romaji = wanakana.toRomaji(question);

  $("#review-table").insertAdjacentHTML(
    "beforeend",
    `<tr><th><i class="d-none">（${card.kanji}）</i>` +
      `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
      `<td>${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
  );
  GAME.answered++;
  nextQuestion();
});

/* Skip button: same action as pressing Space */
$("#skip").addEventListener("click", () => {
  skipQuestion();
  $("#answer").focus();
});

$("#answer").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    $("#stop").click();
  }
});
