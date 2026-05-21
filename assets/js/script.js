/* Persistent settings — saved to localStorage */
const SETTINGS_DEFAULT = {
  type: "game-hiragana",
  theme: "system",
  font: "inherit",
  dakuten: true,
  card: "Random",
  kanji: false,
};

const SETTINGS_SAVED = JSON.parse(localStorage.getItem("SETTINGS")) || {};
const SETTINGS = Object.assign({}, SETTINGS_DEFAULT, SETTINGS_SAVED);

/** MediaQueryList for the OS dark-mode preference. */
const systemDarkMQ = window.matchMedia("(prefers-color-scheme: dark)");

/**
 * Apply dark or light Bootstrap classes to all themed elements.
 * Uses absolute assignment (not toggle) so the state never drifts.
 * @param {boolean} isDark - True to enable dark mode, false for light.
 */
function applyTheme(isDark) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", isDark ? "#212529" : "#F8F9FA");
  }

  document.querySelectorAll("body, #menu, #result").forEach((el) => {
    el.classList.toggle("bg-dark", isDark);
    el.classList.toggle("bg-light", !isDark);
    el.classList.toggle("text-white", isDark);
  });
  document.querySelector("#answer").classList.toggle("text-white", isDark);
  document.querySelectorAll("kbd").forEach((el) => {
    // Keyboard keys (kbd) should have inverted themes:
    // Dark mode -> White background, dark text
    // Light mode -> Dark background, white text
    el.classList.toggle("bg-white", isDark);
    el.classList.toggle("text-dark", isDark);
    el.classList.toggle("bg-dark", !isDark);
    el.classList.toggle("text-white", !isDark);
  });
  document.querySelectorAll(".table").forEach((el) => {
    el.classList.toggle("table-hover", !isDark);
    el.classList.toggle("text-white", isDark);
  });
  document.querySelectorAll(".btn").forEach((el) => {
    // Buttons use outline variants so the Bootstrap .active class renders as a
    // visually distinct filled state (solid bg + contrasting text).
    // Light mode -> dark outline (active = filled dark)
    // Dark mode  -> light outline (active = filled light/white)
    // Strip all four possible Bootstrap button-variant classes first so they
    // never accumulate and create conflicts across multiple applyTheme calls.
    el.classList.remove(
      "btn-dark",
      "btn-light",
      "btn-outline-dark",
      "btn-outline-light",
    );
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

/* Viewport height adjustment for mobile keyboards */
const updateViewportHeight = () => {
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const offsetTop = vv ? vv.offsetTop : 0;

  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${vh}px`,
  );
  document.documentElement.style.setProperty(
    "--visual-viewport-offset-y",
    `${offsetTop}px`,
  );

  // If visual viewport is significantly smaller than layout height, the keyboard is likely open.
  // We also check if the answer input is focused as a secondary hint.
  const isInputFocused =
    document.activeElement && document.activeElement.id === "answer";
  const isShort = vh < window.innerHeight * 0.85;

  const isKeyboardOpen = isShort || isInputFocused;

  document.body.classList.toggle("keyboard-open", isKeyboardOpen);
};

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateViewportHeight);
  window.visualViewport.addEventListener("scroll", updateViewportHeight);
}
window.addEventListener("resize", updateViewportHeight);

/*
 * Prevent the "blank space" scroll on iOS.
 * When the keyboard is open, we block touch-based scrolling on the body
 * unless the user is touching an element that actually needs to scroll
 * (like the result review table).
 */
document.body.addEventListener(
  "touchmove",
  (e) => {
    if (document.body.classList.contains("keyboard-open")) {
      // Allow scrolling only if the target is inside a scrollable container
      const isScrollable = e.target.closest("#review-wrapper");
      if (!isScrollable) {
        e.preventDefault();
      }
    }
  },
  { passive: false },
);

// Ensure the class updates immediately when focusing/blurring the input
document
  .querySelector("#answer")
  .addEventListener("focus", () => setTimeout(updateViewportHeight, 100));
document
  .querySelector("#answer")
  .addEventListener("blur", () => setTimeout(updateViewportHeight, 100));

updateViewportHeight();

/* Runtime state — never persisted, always fresh */
const GAME = {
  total: 0,
  timer: 0,
  answered: 0,
  skipped: 0,
};

/**
 * rAF handle for the game timer loop.
 * @type {number|null}
 */
let timerInterval = null;

/**
 * Monotonic timestamp (ms, via performance.now()) captured when the game starts.
 * Using performance.now() instead of Date.now() ensures the elapsed time is
 * unaffected by system-clock adjustments (NTP sync, DST, user changes).
 * @type {number|null}
 */
let gameStartTime = null;

/* Apply saved game settings */
if (SETTINGS.font !== SETTINGS_DEFAULT.font) changeFont();

window.addEventListener("load", () => {
  setTimeout(() => {
    document.body.classList.remove("preload");
  }, 100);
});

/* Keep active button in sync with the loaded setting */
document.querySelectorAll(".game-theme").forEach((btn) => {
  btn.classList.toggle("active", btn.value === SETTINGS.theme);
});

/* React to OS-level theme changes when in "system" mode */
systemDarkMQ.addEventListener("change", () => {
  if (SETTINGS.theme === "system") applyTheme(systemDarkMQ.matches);
});

document.querySelector(`#${SETTINGS.type}`).classList.add("active");
document
  .querySelector("#game-dakuten")
  .classList.toggle("active", SETTINGS.dakuten);
document
  .querySelector("#game-dakuten > span")
  .classList.toggle("text-decoration-line-through", !SETTINGS.dakuten);

/* Set the active card button based on the saved setting. */
document.querySelectorAll(".game-card").forEach((el) => {
  el.classList.toggle("active", el.value === SETTINGS.card);
});

const kanjiBtn = document.querySelector("#game-kanji");
kanjiBtn.classList.toggle("active", SETTINGS.kanji);
kanjiBtn.classList.toggle("text-decoration-line-through", !SETTINGS.kanji);

/* Game setting functions */
function changeFont() {
  document.querySelector("#game-font").value = SETTINGS.font;
  document
    .querySelectorAll(".game-font-change")
    .forEach((el) => (el.style.fontFamily = SETTINGS.font));
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

  document.querySelector("#question").innerHTML =
    `${question}<rt>${SETTINGS.kanji ? kanji : ""}</rt>`;
  document.querySelector("#question-id").value = id;
  document.querySelector("#answer").value = "";
  document.querySelector("#score").innerHTML =
    '<i class="bi-check-circle"></i> ' +
    `${GAME.answered}/${GAME.answered + GAME.skipped}`;
}

/* Game settings */
document
  .querySelectorAll("#option-wrapper button, #game-font")
  .forEach((el) => {
    el.addEventListener("click", () => {
      setTimeout(() => {
        localStorage.setItem("SETTINGS", JSON.stringify(SETTINGS));
      }, 100);
    });
  });

document.querySelector("#game-font").addEventListener("change", () => {
  SETTINGS.font = document.querySelector("#game-font").value;
  changeFont();
});

document.querySelectorAll(".game-theme").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    document
      .querySelectorAll(".game-theme")
      .forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
    SETTINGS.theme = evt.currentTarget.value;
    applyTheme(resolveIsDark(SETTINGS.theme));
  });
});

document.querySelector("#game-kanji").addEventListener("click", () => {
  SETTINGS.kanji = !SETTINGS.kanji;
  const btn = document.querySelector("#game-kanji");
  btn.classList.toggle("active", SETTINGS.kanji);
  btn.classList.toggle("text-decoration-line-through", !SETTINGS.kanji);
});

document.querySelectorAll(".game-type").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    document
      .querySelectorAll(".game-type")
      .forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
    SETTINGS.type = evt.currentTarget.id;
  });
});

document.querySelector("#game-dakuten").addEventListener("click", () => {
  document.querySelector("#game-dakuten").classList.toggle("active");
  document
    .querySelector("#game-dakuten > span")
    .classList.toggle("text-decoration-line-through");
  SETTINGS.dakuten = !SETTINGS.dakuten;
});

document.querySelectorAll(".game-card").forEach((el) => {
  el.addEventListener("click", (evt) => {
    if (evt.currentTarget.matches(".active")) return;
    document
      .querySelectorAll(".game-card")
      .forEach((btn) => btn.classList.toggle("active"));
    SETTINGS.card = evt.currentTarget.value;
  });
});

/* Buttons event listener */
document.querySelector("#option").addEventListener("click", () => {
  document.querySelector("#option").classList.toggle("active");
  document.querySelector("#option-wrapper").classList.toggle("collapsed");
  document.querySelector("#option-wrapper").classList.toggle("p-3");
});

/**
 * Click handler for the start button. Initializes a new game session and starts the timer.
 * @type {EventListener}
 * @returns {void}
 */
document.querySelector("#start").addEventListener("click", () => {
  const timeEl = document.querySelector("#time");

  if (timerInterval) {
    cancelAnimationFrame(timerInterval);
    timerInterval = null;
  }

  gameStartTime = performance.now();
  GAME.timer = 0;

  /* rAF loop: fires every display frame (~60 fps) but only updates the
   * DOM and GAME.timer when a full second has elapsed. Using Date.now()
   * means the displayed time is always correct even when the browser
   * delays or skips frames (Safari setInterval throttling, etc.). */
  (function tickLoop() {
    var elapsed = Math.floor((performance.now() - gameStartTime) / 1000);
    if (elapsed !== GAME.timer) {
      GAME.timer = elapsed;
      timeEl.innerHTML = GAME.timer + ' <i class="bi-clock"></i>';
    }
    timerInterval = requestAnimationFrame(tickLoop);
  })();

  document.querySelector("#review-table").innerHTML = "";
  document.querySelector("#start").disabled = true;
  document.querySelector("#game").classList.remove("d-none");
  document.querySelector("#menu").classList.add("slide-up");
  document.querySelector("#answer").focus();
  nextQuestion();
});

/**
 * Click handler for the review button. Shows the results screen with transition.
 * @type {EventListener}
 * @param {MouseEvent} event - The click event object.
 * @returns {void}
 */
document.querySelector("#review").addEventListener("click", (event) => {
  const result = document.querySelector("#result");
  result.classList.remove("d-none");
  void result.offsetHeight; // Force browser reflow to trigger slide-in transition
  result.classList.add("slide-in");
});

/**
 * Click handler for the stop button. Ends the game, calculates averages, and displays results screen with transition.
 * @type {EventListener}
 * @param {MouseEvent} event - The click event object.
 * @returns {void}
 */
document.querySelector("#stop").addEventListener("click", (event) => {
  const average = GAME.timer / (GAME.answered + GAME.skipped);
  const result = document.querySelector("#result");

  result.classList.remove("d-none");
  void result.offsetHeight; // Force browser reflow to trigger slide-in transition
  result.classList.add("slide-in");
  document.querySelector("#game").classList.add("d-none");
  document.querySelector("#stats-answered").textContent = GAME.answered;
  document.querySelector("#stats-skipped").textContent = GAME.skipped;
  document.querySelector("#stats-timer").textContent = GAME.timer + " s";
  document.querySelector("#stats-average").textContent =
    GAME.answered + GAME.skipped > 0 ? average.toFixed(2) + " s/card" : "N/A";
  document.querySelector("#review").disabled = false;
  document.querySelector("#restart").focus();
  if (timerInterval) {
    cancelAnimationFrame(timerInterval);
    timerInterval = null;
  }

  if (!GAME.answered && !GAME.skipped) {
    document
      .querySelector("#review-wrapper")
      .insertAdjacentHTML("afterbegin", "<b>Be serious.</b>");
  } else if (!GAME.answered && GAME.skipped) {
    document
      .querySelector("#review-wrapper")
      .insertAdjacentHTML("afterbegin", "<b>Practice more!</b>");
  }
});

/**
 * Click handler for the restart (home) button. Resets game stats and returns to the main menu.
 * @type {EventListener}
 * @returns {void}
 */
document.querySelector("#restart").addEventListener("click", () => {
  document.querySelector("#menu").classList.remove("slide-up");
  const result = document.querySelector("#result");
  result.classList.remove("slide-in");
  result.addEventListener(
    "transitionend",
    () => {
      result.classList.add("d-none");
      document.querySelector("#game").classList.add("d-none");
      document.querySelector("#time").innerHTML = '0 <i class="bi-clock"></i>';
      document.querySelector("#score").innerHTML =
        '<i class="bi-check-circle"></i> 0';
      const bold = document.querySelector("#review-wrapper b");
      if (bold) bold.remove();
      document.querySelector("#copy").innerHTML =
        '<i class="bi-table"></i> Copy Table';
      document.querySelector("#share").innerHTML =
        '<i class="bi-share"></i> Share';
      document.querySelector("#start").disabled = false;
    },
    { once: true },
  );

  GAME.timer = 0;
  GAME.answered = 0;
  GAME.skipped = 0;
  gameStartTime = null;
  if (timerInterval) {
    cancelAnimationFrame(timerInterval);
    timerInterval = null;
  }
});

document.querySelector("#copy").addEventListener("click", async () => {
  const text =
    document
      .querySelector("#review-table")
      .textContent.replaceAll("‎‎", "\n")
      .replaceAll("‎", " ー ")
      .trim() || "Why did I copy this?";
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.querySelector("#result").appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  // Change the button text to "Copied!" for 1.5 seconds
  document.querySelector("#copy").innerHTML =
    '<i class="bi-table"></i> Copied!';

  // Reset the button text after 1.5 seconds
  setTimeout(() => {
    document.querySelector("#copy").innerHTML =
      '<i class="bi-table"></i> Copy Table';
  }, 1_500);
});

document.querySelector("#share").addEventListener("click", async () => {
  const average = GAME.timer / (GAME.answered + GAME.skipped);
  const activeType = document.querySelector(".game-type.active");
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
    document.querySelector("#result").appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  // Change the button text to "Copied!" for 1.5 seconds
  document.querySelector("#share").innerHTML =
    '<i class="bi-share"></i> Copied!';

  // Reset the button text after 1.5 seconds
  setTimeout(() => {
    document.querySelector("#share").innerHTML =
      '<i class="bi-share"></i> Share';
  }, 1_500);
});

/* Answer input handling */

/**
 * Record the current question as skipped, log it to the review table,
 * and advance to the next question.
 * Called by both the Space key handler and the #skip button.
 * @returns {void}
 */
function skipQuestion() {
  const id = document.querySelector("#question-id").value;
  const card = cards[SETTINGS.card][id];
  const jisho = "https://jisho.org/word/" + card.kanji;
  const means = card.meaning.split(", ")[0].trim();
  const meaning = means.match(/\(((?!\)).)*$/) ? means + ")" : means;
  const question = document
    .querySelector("#question")
    .childNodes[0].nodeValue.trim();
  const romaji = wanakana.toRomaji(question);

  document
    .querySelector("#review-table")
    .insertAdjacentHTML(
      "beforeend",
      `<tr><th><i class="d-none">❌（${card.kanji}）</i>` +
        `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
        `<td class="text-danger">${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
    );
  GAME.skipped++;
  document.querySelector("#answer").value = "";
  nextQuestion();
}

/**
 * Displays a temporary toast notification reminding the user to use an apostrophe
 * when transcribing Japanese words with 'n' followed by a vowel or 'y'.
 *
 * @param {string} romaji - The correct Romaji string with the required apostrophe (e.g., "ten'in").
 * @param {string} kana - The correct Kana representation of the word (e.g., "てんいん").
 * @returns {void}
 */
function showApostropheToast(romaji, kana) {
  const container = document.querySelector("#toast-container");
  if (!container) return;

  // Clear any existing toasts to avoid cluttering the viewport
  container.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.innerHTML = `
    <i class="bi-lightbulb-fill text-warning"></i>
    <span>Tip: Use an apostrophe (') for 'n' followed by a vowel/y (e.g., <strong>${romaji}</strong> &rarr; <strong>${kana}</strong>).</span>
  `;

  container.appendChild(toast);

  // Force reflow to ensure the transition is animated correctly
  void toast.offsetHeight;
  toast.classList.add("show");

  // Auto-fade and remove the toast after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    // Listen for transition completion to remove the element from DOM
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 4000);
}

/**
 * Event listener callback for the answer input keyup event.
 * Validates the user input.
 *
 * @param {KeyboardEvent} event - The keyboard event.
 * @returns {void}
 */
document.querySelector("#answer").addEventListener("keyup", (event) => {
  const id = document.querySelector("#question-id").value;
  const card = cards[SETTINGS.card][id];
  const options = { customKanaMapping: { dzu: "づ" } };
  const question = document
    .querySelector("#question")
    .childNodes[0].nodeValue.trim();
  const q = wanakana.toHiragana(question, options);
  const answer = document.querySelector("#answer").value;
  const a = wanakana.toHiragana(answer, options);

  /* Space key: skip the current question */
  if (answer.indexOf(" ") > -1) return skipQuestion();

  if (q !== a) {
    // Check if the user missed an apostrophe for 'n' followed by a vowel or 'y'
    const romajiCorrect = wanakana.toRomaji(q);
    if (romajiCorrect.includes("'")) {
      const normalizedAnswer = answer.toLowerCase().replace(/[’‘']/g, "");
      const normalizedCorrect = romajiCorrect
        .toLowerCase()
        .replace(/[’‘']/g, "");
      if (normalizedAnswer === normalizedCorrect) {
        showApostropheToast(romajiCorrect, q);
      } else {
        return;
      }
    } else {
      return;
    }
  }

  const jisho = "https://jisho.org/word/" + card.kanji;
  const means = card.meaning.split(", ")[0].trim();
  const meaning = means.match(/\(((?!\)).)*$/) ? means + ")" : means;
  const romaji = wanakana.toRomaji(question);

  document
    .querySelector("#review-table")
    .insertAdjacentHTML(
      "beforeend",
      `<tr><th><i class="d-none">（${card.kanji}）</i>` +
        `<a href="${jisho}" target="_blank">${question}</a>‎</th>` +
        `<td>${romaji}‎</td><td>${meaning}‎‎</td></tr>`,
    );
  GAME.answered++;
  nextQuestion();
});

/* Skip button: same action as pressing Space */
document.querySelector("#skip").addEventListener("click", () => {
  skipQuestion();
  document.querySelector("#answer").focus();
});

document.querySelector("#answer").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    document.querySelector("#stop").click();
  }
});
