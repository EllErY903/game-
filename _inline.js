
(() => {
  "use strict";

  /* =========================================================
     NASTAVITELNÉ KONSTANTY – NÁKLON A ČASOVÁNÍ
     Uprav dle reálného testování na telefonu (viz debug režim:
     dlouze podrž logo ČELOVKA na úvodní obrazovce).
  ========================================================= */
  const TILT_CORRECT_THRESHOLD = 35;   // stupně gamma (upravené dle orientace) -> SPRÁVNĚ
  const TILT_WRONG_THRESHOLD   = -35;  // stupně gamma -> ŠPATNĚ
  const TILT_NEUTRAL_RANGE     = 15;   // musí se vrátit sem, aby se telefon znovu "odjistil"
  const ANSWER_COOLDOWN_MS     = 1000; // minimální prodleva mezi dvěma odpověďmi
  const COUNTDOWN_SECONDS      = 3;
  const LOW_TIME_THRESHOLD     = 10;   // posledních X sekund = červená + pípání
  const FEEDBACK_DURATION_MS   = 800;
  const LONG_PRESS_MS          = 3000; // podržení loga pro debug režim

  /* ========================================================= */

  const $ = (id) => document.getElementById(id);

  const el = {
    screenStart: $("screen-start"),
    screenCountdown: $("screen-countdown"),
    screenGame: $("screen-game"),
    screenFeedback: $("screen-feedback"),
    screenEnd: $("screen-end"),
    orientationLock: $("orientation-lock"),
    logo: $("logo"),
    selectCategory: $("select-category"),
    selectLength: $("select-length"),
    btnPermission: $("btn-permission"),
    sensorStatus: $("sensor-status"),
    btnStart: $("btn-start"),
    countdownNumber: $("countdown-number"),
    gameTimer: $("game-timer"),
    gameScore: $("game-score"),
    gameWord: $("game-word"),
    touchZones: $("touch-zones"),
    feedbackText: $("feedback-text"),
    endScore: $("end-score"),
    endList: $("end-list"),
    btnReplay: $("btn-replay"),
    btnBack: $("btn-back"),
    debugOverlay: $("debug-overlay"),
    toast: $("toast"),
  };

  /* ---------------- Stav aplikace ---------------- */
  const state = {
    category: null,
    roundLength: 120,
    words: [],
    index: 0,
    score: 0,
    results: [],       // { word, correct }
    remaining: 120,
    timerId: null,
    controlMode: "sensor", // "sensor" | "touch"
    sensorPermission: "unknown", // unknown | granted | denied | unavailable
    currentScreen: "start",
    wakeLock: null,
    debugMode: false,
  };

  /* ---------------- Pomocné funkce ---------------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showScreen(name) {
    [el.screenStart, el.screenCountdown, el.screenGame, el.screenEnd].forEach((s) => s.classList.add("hidden"));
    const map = {
      start: el.screenStart,
      countdown: el.screenCountdown,
      game: el.screenGame,
      end: el.screenEnd,
    };
    if (map[name]) map[name].classList.remove("hidden");
    state.currentScreen = name;
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("visible"), 1800);
  }

  /* ---------------- Naplnění kategorií ---------------- */
  function populateCategories() {
    const names = Object.keys(WORD_CATEGORIES);
    el.selectCategory.innerHTML = names
      .map((n) => `<option value="${n}">${n}</option>`)
      .join("");
    state.category = names[0];
  }
  el.selectCategory.addEventListener("change", (e) => {
    state.category = e.target.value;
  });
  el.selectLength.addEventListener("change", (e) => {
    state.roundLength = parseInt(e.target.value, 10);
  });

  /* =========================================================
     ZVUK – Web Audio API (bez externích souborů)
  ========================================================= */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function beep(freq = 880, duration = 0.15, type = "sine", volume = 0.25) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /* =========================================================
     WAKE LOCK
  ========================================================= */
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        state.wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (err) {
      // Not supported / denied — hra funguje dál, jen se displej může vypnout.
      console.warn("Wake Lock nedostupný:", err);
    }
  }
  function releaseWakeLock() {
    if (state.wakeLock) {
      state.wakeLock.release().catch(() => {});
      state.wakeLock = null;
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.currentScreen === "game") {
      requestWakeLock();
    }
  });

  /* =========================================================
     DETEKCE NÁKLONU
  ========================================================= */
  let locked = false;        // true = čeká se na návrat do neutrální polohy
  let cooldownDone = true;   // true = cooldown uplynul
  let lastAlpha = null, lastBeta = null, lastGamma = null, lastTilt = null;
  let sensorDataFlowing = false;

  function getScreenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === "number") return screen.orientation.angle;
    if (typeof window.orientation === "number") return window.orientation;
    return 0;
  }

  function handleOrientation(e) {
    if (e.gamma === null || e.beta === null) return;
    sensorDataFlowing = true;
    const angle = getScreenAngle();
    let tilt = e.gamma;
    // Normalizace: v "landscape-secondary" (úhel -90/270) je gamma obrácená.
    if (angle === -90 || angle === 270) tilt = -tilt;

    lastAlpha = e.alpha;
    lastBeta = e.beta;
    lastGamma = e.gamma;
    lastTilt = tilt;
    updateDebugOverlay();

    if (state.currentScreen !== "game" || state.controlMode !== "sensor") return;

    if (locked) {
      if (cooldownDone && Math.abs(tilt) <= TILT_NEUTRAL_RANGE) {
        locked = false;
      }
      return;
    }

    if (tilt >= TILT_CORRECT_THRESHOLD) {
      triggerAnswer(true);
    } else if (tilt <= TILT_WRONG_THRESHOLD) {
      triggerAnswer(false);
    }
  }

  function updateDebugOverlay() {
    if (!state.debugMode) return;
    el.debugOverlay.textContent =
      `alpha: ${fmt(lastAlpha)}\n` +
      `beta:  ${fmt(lastBeta)}\n` +
      `gamma: ${fmt(lastGamma)}\n` +
      `tilt:  ${fmt(lastTilt)}\n` +
      `screen.angle: ${getScreenAngle()}\n` +
      `locked: ${locked}  cooldownDone: ${cooldownDone}\n` +
      `mode: ${state.controlMode} / ${state.sensorPermission}`;
  }
  function fmt(v) { return v === null || v === undefined ? "—" : v.toFixed(1); }

  /* --- Dlouhé podržení loga = přepnutí debug režimu --- */
  let pressTimer = null;
  function startPress() {
    pressTimer = setTimeout(() => {
      state.debugMode = !state.debugMode;
      el.debugOverlay.classList.toggle("hidden", !state.debugMode);
      showToast(state.debugMode ? "Debug režim zapnut" : "Debug režim vypnut");
      updateDebugOverlay();
    }, LONG_PRESS_MS);
  }
  function cancelPress() { clearTimeout(pressTimer); }
  el.logo.addEventListener("pointerdown", startPress);
  el.logo.addEventListener("pointerup", cancelPress);
  el.logo.addEventListener("pointerleave", cancelPress);
  el.logo.addEventListener("pointercancel", cancelPress);
  el.logo.addEventListener("contextmenu", (e) => e.preventDefault());

  /* --- Žádost o povolení senzorů --- */
  el.btnPermission.addEventListener("click", async () => {
    ensureAudio(); // odemkne Web Audio v rámci gesta uživatele i pro iOS
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) {
      state.sensorPermission = "unavailable";
      state.controlMode = "touch";
      setSensorStatus("Tento prohlížeč senzory nepodporuje. Hraje se dotykem (vlevo = špatně, vpravo = správně).", "warn");
      el.btnStart.disabled = false;
      return;
    }
    if (typeof DOE.requestPermission === "function") {
      // iOS 13+
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          state.sensorPermission = "granted";
          state.controlMode = "sensor";
          window.addEventListener("deviceorientation", handleOrientation);
          setSensorStatus("Senzory povoleny ✓ Ovládej náklonem telefonu.", "ok");
        } else {
          state.sensorPermission = "denied";
          state.controlMode = "touch";
          setSensorStatus("Senzory zamítnuty. Hraje se dotykem (vlevo = špatně, vpravo = správně).", "warn");
        }
      } catch (err) {
        state.sensorPermission = "denied";
        state.controlMode = "touch";
        setSensorStatus("Senzory se nepodařilo povolit. Hraje se dotykem (vlevo = špatně, vpravo = správně).", "err");
      }
      el.btnStart.disabled = false;
    } else {
      // Android a další — není potřeba explicitní povolení.
      state.sensorPermission = "granted";
      state.controlMode = "sensor";
      window.addEventListener("deviceorientation", handleOrientation);
      setSensorStatus("Senzory připraveny ✓ Ovládej náklonem telefonu.", "ok");
      el.btnStart.disabled = false;
      // Pojistka: pokud do 1.5 s nepřijdou žádná data, přepneme na dotyk.
      setTimeout(() => {
        if (!sensorDataFlowing) {
          state.controlMode = "touch";
          setSensorStatus("Ze senzorů nepřicházejí data. Hraje se dotykem (vlevo = špatně, vpravo = správně).", "warn");
        }
      }, 1500);
    }
  });

  function setSensorStatus(msg, cls) {
    el.sensorStatus.textContent = msg;
    el.sensorStatus.className = cls || "";
  }

  /* =========================================================
     DOTYKOVÉ OVLÁDÁNÍ (fallback)
  ========================================================= */
  el.screenGame.addEventListener("click", (e) => {
    if (state.controlMode !== "touch") return;
    if (state.currentScreen !== "game") return;
    if (locked) return;
    const w = window.innerWidth;
    const correct = e.clientX > w / 2;
    triggerAnswer(correct);
  });

  /* =========================================================
     HERNÍ LOGIKA
  ========================================================= */
  function triggerAnswer(correct) {
    if (locked) return;
    locked = true;
    cooldownDone = false;
    setTimeout(() => { cooldownDone = true; }, ANSWER_COOLDOWN_MS);
    recordAnswer(correct);
  }

  function recordAnswer(correct) {
    const word = state.words[state.index];
    state.results.push({ word, correct });
    if (correct) state.score++;
    el.gameScore.textContent = `Skóre: ${state.score}`;

    if (navigator.vibrate) {
      try { navigator.vibrate(correct ? 80 : [60, 40, 60]); } catch (e) {}
    }

    beep(correct ? 1046 : 220, correct ? 0.18 : 0.3, correct ? "sine" : "sawtooth", 0.3);

    showFeedback(correct);
  }

  function showFeedback(correct) {
    el.screenFeedback.classList.remove("hidden");
    el.screenFeedback.className = "screen " + (correct ? "correct" : "wrong");
    el.feedbackText.textContent = correct ? "SPRÁVNĚ" : "ŠPATNĚ";
    setTimeout(() => {
      el.screenFeedback.classList.add("hidden");
      nextWordOrEnd();
    }, FEEDBACK_DURATION_MS);
  }

  function nextWordOrEnd() {
    if (state.remaining <= 0) {
      endRound();
      return;
    }
    state.index++;
    if (state.index >= state.words.length) {
      // Došla slova dřív než čas — znovu zamícháme a jedeme dál (bez okamžitého opakování).
      const last = state.words[state.words.length - 1];
      let reshuffled = shuffle(WORD_CATEGORIES[state.category]);
      if (reshuffled[0] === last) {
        [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]];
      }
      state.words = state.words.concat(reshuffled);
    }
    showWord();
  }

  function showWord() {
    el.gameWord.textContent = state.words[state.index];
  }

  function startCountdown() {
    showScreen("countdown");
    let n = COUNTDOWN_SECONDS;
    el.countdownNumber.textContent = n;
    beep(660, 0.12);
    const iv = setInterval(() => {
      n--;
      if (n > 0) {
        el.countdownNumber.textContent = n;
        beep(660, 0.12);
      } else {
        clearInterval(iv);
        el.countdownNumber.textContent = "GO!";
        beep(990, 0.25, "sine", 0.35);
        setTimeout(startRound, 300);
      }
    }, 1000);
  }

  function startRound() {
    state.words = shuffle(WORD_CATEGORIES[state.category]);
    state.index = 0;
    state.score = 0;
    state.results = [];
    state.remaining = state.roundLength;
    locked = false;
    cooldownDone = true;

    el.gameScore.textContent = "Skóre: 0";
    el.gameTimer.textContent = formatTime(state.remaining);
    el.gameTimer.classList.remove("low-time");
    el.touchZones.classList.toggle("hidden", state.controlMode !== "touch");
    showWord();
    showScreen("game");
    requestWakeLock();

    clearInterval(state.timerId);
    state.timerId = setInterval(tick, 1000);
  }

  function formatTime(sec) {
    sec = Math.max(sec, 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function tick() {
    if (isPortrait()) return; // pauza, když je telefon na výšku
    state.remaining--;
    el.gameTimer.textContent = formatTime(state.remaining);
    if (state.remaining <= LOW_TIME_THRESHOLD && state.remaining >= 0) {
      el.gameTimer.classList.add("low-time");
      if (state.remaining > 0) beep(440, 0.1, "sine", 0.2);
    }
    if (state.remaining <= 0) {
      clearInterval(state.timerId);
      beep(180, 0.4, "sawtooth", 0.3);
      // Necháme doběhnout případný feedback overlay, pak konec.
      if (el.screenFeedback.classList.contains("hidden")) endRound();
    }
  }

  function endRound() {
    clearInterval(state.timerId);
    releaseWakeLock();
    el.endScore.textContent = `Skóre: ${state.score} / ${state.results.length}`;
    el.endList.innerHTML = state.results
      .map((r) => `<li class="${r.correct ? "ok" : "bad"}"><span>${escapeHtml(r.word)}</span><span class="mark">${r.correct ? "✓" : "✗"}</span></li>`)
      .join("");
    showScreen("end");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  el.btnStart.addEventListener("click", () => {
    ensureAudio();
    startCountdown();
  });
  el.btnReplay.addEventListener("click", () => {
    startCountdown();
  });
  el.btnBack.addEventListener("click", () => {
    showScreen("start");
  });

  /* =========================================================
     ORIENTACE OBRAZOVKY (portrét vs. landscape)
     screen.orientation.lock() na iOS Safari nefunguje, takže
     místo zamykání jen zobrazíme hlášku a pozastavíme časovač.
  ========================================================= */
  const portraitQuery = window.matchMedia("(orientation: portrait)");
  function isPortrait() {
    return portraitQuery.matches;
  }
  function updateOrientationOverlay() {
    el.orientationLock.classList.toggle("visible", isPortrait());
  }
  portraitQuery.addEventListener
    ? portraitQuery.addEventListener("change", updateOrientationOverlay)
    : window.addEventListener("resize", updateOrientationOverlay);
  window.addEventListener("orientationchange", updateOrientationOverlay);
  updateOrientationOverlay();

  /* =========================================================
     ZABRÁNIT GESTŮM (pinch-zoom, dvojklik-zoom, pull-to-refresh)
  ========================================================= */
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* =========================================================
     SERVICE WORKER (offline)
  ========================================================= */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registrace selhala:", err));
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  populateCategories();
})();
