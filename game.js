(() => {
  const GAME_DURATION_MS = 60_000;
  const BEST_SCORE_KEY = 'catMouseBestScore';
  const BEST_STREAK_KEY = 'catMouseBestStreak';
  const HISTORY_KEY = 'catMouseHistoryV1';
  const HISTORY_LIMIT = 50;
  const HITBOX_SIZE_PX = 80;
  const HALF_HITBOX = HITBOX_SIZE_PX / 2;
  const MOUSE_SHOW_MS = 1500;

  const $score = document.getElementById('score');
  const $timeLeft = document.getElementById('timeLeft');
  const $bestScore = document.getElementById('bestScore');
  const $streak = document.getElementById('streak');
  const $bestStreak = document.getElementById('bestStreak');

  const $gameField = document.getElementById('gameField');
  const $mouse = document.getElementById('mouse');
  const $cat = document.getElementById('cat');

  const $startOverlay = document.getElementById('startOverlay');
  const $endOverlay = document.getElementById('endOverlay');
  const $rotateOverlay = document.getElementById('rotateOverlay');

  const $startBtn = document.getElementById('startBtn');
  const $restartBtn = document.getElementById('restartBtn');

  const $finalScore = document.getElementById('finalScore');
  const $finalBest = document.getElementById('finalBest');
  const $finalBestStreak = document.getElementById('finalBestStreak');
  const $resultsCell = document.getElementById('resultsCell');
  const $resultsBtn = document.getElementById('resultsBtn');
  const $resultsOverlay = document.getElementById('resultsOverlay');
  const $resultsCloseBtn = document.getElementById('resultsCloseBtn');
  const $resultsList = document.getElementById('resultsList');

  /** @type {'idle'|'running'|'paused'|'ended'} */
  let status = 'idle';

  let score = 0;
  let bestScore = 0;
  let bestScoreAtRoundStart = 0;
  let streak = 0;
  let bestStreakThisRun = 0;
  let bestStreak = 0;
  let bestStreakAtRoundStart = 0;
  /** @type {Array<{ts:number, score:number, bestStreak:number, isBestScore:boolean, isBestStreak:boolean}>} */
  let history = [];

  let endAtMs = 0;
  let pausedRemainingMs = 0;

  let mouseVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let mousePos = null;

  /** @type {number | null} */
  let mouseHideTimerId = null;
  /** @type {number | null} */
  let nextSpawnTimerId = null;
  /** @type {number | null} */
  let tickTimerId = null;
  let catCatchToken = 0;
  let audioCtx = null;
  const hitAudio = new Audio('./assets/sounds/hit.mp3');
  const missAudio = new Audio('./assets/sounds/miss.mp3');
  hitAudio.preload = 'auto';
  missAudio.preload = 'auto';
  hitAudio.volume = 0.7;
  missAudio.volume = 0.6;

  function ensureAudioCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function playTone({ freqHz, durationMs, type = 'sine', gain = 0.04 }) {
    const ctx = ensureAudioCtx();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freqHz;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    const dur = durationMs / 1000;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAt(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function tryPlayAudio(audioEl) {
    try {
      audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  function playHitSound() {
    const ok = tryPlayAudio(hitAudio);
    if (!ok) playTone({ freqHz: 880, durationMs: 90, type: 'triangle', gain: 0.04 });
  }

  function playMissSound() {
    const ok = tryPlayAudio(missAudio);
    if (!ok) playTone({ freqHz: 220, durationMs: 110, type: 'sawtooth', gain: 0.03 });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clearTimer(id) {
    if (id != null) window.clearTimeout(id);
  }

  function clearIntervalTimer(id) {
    if (id != null) window.clearInterval(id);
  }

  function clearAllTimers() {
    clearTimer(mouseHideTimerId);
    clearTimer(nextSpawnTimerId);
    clearIntervalTimer(tickTimerId);
    mouseHideTimerId = null;
    nextSpawnTimerId = null;
    tickTimerId = null;
  }

  function loadBestScore() {
    try {
      const raw = window.localStorage.getItem(BEST_SCORE_KEY);
      const n = Number(raw);
      bestScore = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      bestScore = 0;
    }
  }

  function loadBestStreak() {
    try {
      const raw = window.localStorage.getItem(BEST_STREAK_KEY);
      const n = Number(raw);
      bestStreak = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      bestStreak = 0;
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // ignore
    }
  }

  function loadHistory() {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      const arr = JSON.parse(raw || '[]');
      history = Array.isArray(arr) ? arr.slice(0, HISTORY_LIMIT) : [];
    } catch {
      history = [];
    }
  }

  function saveHistory() {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
    } catch {
      // ignore
    }
  }

  function updateResultsCellAvailability() {
    if (!$resultsBtn || !$resultsCell) return;

    const showResults = status === 'idle' || status === 'ended';
    const showStop = status === 'running' || status === 'paused';

    $resultsCell.classList.toggle('hudResultsActive', showResults);
    $resultsCell.classList.toggle('hudResultsStop', showStop);

    $resultsBtn.disabled = !(showResults || showStop);
    $resultsBtn.textContent = showStop ? 'Стоп' : 'Результаты';
    $resultsBtn.classList.toggle('resultsStop', showStop);
  }

  function formatTs(ts) {
    try {
      const d = new Date(ts);
      // Формат: "ДД месяц ГГГГ" (например: "13 декабря 2025")
      return d
        .toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
        .replace(/\s?г\.?$/, '');
    } catch {
      return '';
    }
  }

  function renderResults() {
    if (!$resultsList) return;
    if (!history.length) {
      $resultsList.innerHTML = '<div class="resultsRow"><div class="resultsMain"><div class="resultsLine1">Пока нет игр</div><div class="resultsLine2">Сыграй хотя бы один раунд</div></div></div>';
      return;
    }

    $resultsList.innerHTML = history
      .map((h) => {
        const badges = [
          h.isBestScore ? '<span class="badge">Рекорд счёта</span>' : '',
          h.isBestStreak ? '<span class="badge">Рекорд серии</span>' : '',
        ].join('');

        return `
          <div class="resultsRow">
            <div class="resultsMain">
              <div class="resultsLine1">Очки: ${h.score} · Лучшая серия: ${h.bestStreak}</div>
              <div class="resultsLine2">${formatTs(h.ts)}</div>
            </div>
            ${h.isBestScore ? '<span class="badge">Рекорд счёта</span>' : '<span></span>'}
            ${h.isBestStreak ? '<span class="badge">Рекорд серии</span>' : '<span></span>'}
          </div>
        `;
      })
      .join('');
  }

  function openResults() {
    if (!(status === 'idle' || status === 'ended')) return;
    renderResults();
    setOverlay($resultsOverlay, true);
  }

  function closeResults() {
    setOverlay($resultsOverlay, false);
  }

  function onCenterHudButtonClick() {
    if (status === 'idle' || status === 'ended') {
      openResults();
      return;
    }

    if (status === 'running' || status === 'paused') {
      // Досрочное завершение раунда.
      endGame();
    }
  }

  function saveBestStreak() {
    try {
      window.localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
    } catch {
      // ignore
    }
  }

  function resetStreak() {
    streak = 0;
  }

  function setOverlay($el, isVisible) {
    $el.classList.toggle('hidden', !isVisible);
  }

  function setMouseVisible(isVisible) {
    mouseVisible = isVisible;
    $mouse.style.display = isVisible ? 'block' : 'none';
    if (!isVisible) $mouse.classList.remove('mouseTaunt');
    if (!isVisible) mousePos = null;
  }

  function playMouseTaunt() {
    if (!mouseVisible) return;
    $mouse.classList.remove('mouseTaunt');
    // Перезапуск CSS-анимации.
    void $mouse.offsetWidth;
    $mouse.classList.add('mouseTaunt');
    $mouse.addEventListener(
      'animationend',
      () => {
        $mouse.classList.remove('mouseTaunt');
      },
      { once: true }
    );
  }

  function setCatVisibleAt(xPx, yPx) {
    // Любой тап должен сразу показать “обычного” кота и отменить прошлую анимацию поимки.
    catCatchToken += 1;
    $cat.classList.remove('catCatch');
    $cat.style.left = `${xPx}px`;
    $cat.style.top = `${yPx}px`;
    $cat.style.display = 'block';
  }

  function hideCat() {
    catCatchToken += 1;
    $cat.classList.remove('catCatch');
    $cat.style.display = 'none';
  }

  function playCatCatchAt(xPx, yPx) {
    catCatchToken += 1;
    const token = catCatchToken;

    // Кот должен “поймать” мышь в её точке.
    $cat.classList.remove('catCatch');
    $cat.style.left = `${xPx}px`;
    $cat.style.top = `${yPx}px`;
    $cat.style.display = 'block';

    // Перезапуск CSS-анимации.
    void $cat.offsetWidth;
    $cat.classList.add('catCatch');

    const cleanupKeepVisible = () => {
      if (catCatchToken !== token) return;
      $cat.classList.remove('catCatch');
      $cat.style.display = 'block';
    };

    $cat.addEventListener('animationend', cleanupKeepVisible, { once: true });
    window.setTimeout(cleanupKeepVisible, 800);
  }

  function clearEffects() {
    $gameField.querySelectorAll('.effect').forEach((el) => el.remove());
  }

  function spawnEffectPuff(xPx, yPx) {
    const el = document.createElement('div');
    el.className = 'effect effectPuff';
    el.textContent = '💥';
    el.style.left = `${xPx}px`;
    el.style.top = `${yPx}px`;
    $gameField.appendChild(el);

    const cleanup = () => el.remove();
    el.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 800);
  }

  function spawnEffectScore(xPx, yPx, text) {
    const el = document.createElement('div');
    el.className = 'effect effectScore';
    el.textContent = text;
    el.style.left = `${xPx}px`;
    el.style.top = `${yPx}px`;
    $gameField.appendChild(el);

    const cleanup = () => el.remove();
    el.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 1200);
  }

  function updateHud() {
    $score.textContent = String(score);
    $bestScore.textContent = String(bestScore);
    if ($streak) $streak.textContent = String(streak);
    if ($bestStreak) $bestStreak.textContent = String(bestStreak);

    let secondsLeft = status === 'idle' ? 60 : 0;
    if (status === 'running') {
      secondsLeft = Math.ceil(Math.max(0, endAtMs - Date.now()) / 1000);
    } else if (status === 'paused') {
      secondsLeft = Math.ceil(Math.max(0, pausedRemainingMs) / 1000);
    }
    $timeLeft.textContent = String(clamp(secondsLeft, 0, 60));
    updateResultsCellAvailability();
  }

  function isPhoneLike() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
  }

  function isOrientationAllowed() {
    if (!isPhoneLike()) return true;
    return !isLandscape();
  }

  function pauseGameForOrientation() {
    if (status !== 'running') return;
    pausedRemainingMs = Math.max(0, endAtMs - Date.now());
    clearAllTimers();
    setMouseVisible(false);
    status = 'paused';
    updateHud();
  }

  function resumeGameAfterOrientation() {
    if (status !== 'paused') return;
    if (!isOrientationAllowed()) return;

    endAtMs = Date.now() + pausedRemainingMs;
    pausedRemainingMs = 0;
    status = 'running';
    startTick();
    scheduleNextMouse();
    updateHud();
  }

  function updateOrientationOverlay() {
    const blocked = !isOrientationAllowed();
    setOverlay($rotateOverlay, blocked);

    if (blocked) {
      pauseGameForOrientation();
    } else {
      resumeGameAfterOrientation();
    }
  }

  function startTick() {
    clearIntervalTimer(tickTimerId);
    tickTimerId = window.setInterval(() => {
      if (status !== 'running') return;

      const msLeft = endAtMs - Date.now();
      if (msLeft <= 0) {
        endGame();
        return;
      }
      updateHud();
    }, 125);
  }

  function scheduleNextMouse() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;
    if (Date.now() >= endAtMs) return;

    const waitMs = randomIntInclusive(0, 3000);
    clearTimer(nextSpawnTimerId);
    nextSpawnTimerId = window.setTimeout(() => {
      showMouse();
    }, waitMs);
  }

  function pickRandomMousePosition() {
    const rect = $gameField.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Если поле ещё не проложилось — безопасно не спавним.
    if (!w || !h) return null;

    const padding = 4;
    const minX = padding + HALF_HITBOX;
    const maxX = Math.max(minX, w - padding - HALF_HITBOX);
    const minY = padding + HALF_HITBOX;
    const maxY = Math.max(minY, h - padding - HALF_HITBOX);

    return {
      xPx: randomIntInclusive(Math.floor(minX), Math.floor(maxX)),
      yPx: randomIntInclusive(Math.floor(minY), Math.floor(maxY)),
    };
  }

  function showMouse() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;
    if (Date.now() >= endAtMs) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      scheduleNextMouse();
      return;
    }

    mousePos = pos;
    $mouse.style.left = `${pos.xPx}px`;
    $mouse.style.top = `${pos.yPx}px`;
    setMouseVisible(true);

    clearTimer(mouseHideTimerId);
    mouseHideTimerId = window.setTimeout(() => {
      hideMouseAndReschedule();
    }, MOUSE_SHOW_MS);
  }

  function hideMouseAndReschedule() {
    if (status !== 'running') {
      setMouseVisible(false);
      return;
    }

    // Мышь исчезла по таймауту — это ошибка для серии.
    if (mouseVisible) resetStreak();
    setMouseVisible(false);
    scheduleNextMouse();
  }

  function startGame() {
    updateOrientationOverlay();
    if (!isOrientationAllowed()) return;

    clearAllTimers();
    clearEffects();
    hideCat();

    score = 0;
    bestScoreAtRoundStart = bestScore;
    streak = 0;
    bestStreakThisRun = 0;
    bestStreakAtRoundStart = bestStreak;
    status = 'running';
    endAtMs = Date.now() + GAME_DURATION_MS;
    pausedRemainingMs = 0;

    setMouseVisible(false);

    setOverlay($startOverlay, false);
    setOverlay($endOverlay, false);
    closeResults();

    updateHud();
    startTick();
    scheduleNextMouse();
  }

  function endGame() {
    if (status === 'ended' || status === 'idle') return;

    clearAllTimers();
    setMouseVisible(false);
    clearEffects();

    status = 'ended';

    const isBestScore = score > bestScoreAtRoundStart;
    const isBestStreak = bestStreakThisRun > bestStreakAtRoundStart;

    // Рекорд может обновляться “на лету” для HUD — гарантируем сохранение по окончании раунда.
    if (bestScore > bestScoreAtRoundStart) saveBestScore();
    if (bestStreak > bestStreakAtRoundStart) saveBestStreak();

    history.unshift({
      ts: Date.now(),
      score,
      bestStreak: bestStreakThisRun,
      isBestScore,
      isBestStreak,
    });
    history = history.slice(0, HISTORY_LIMIT);
    saveHistory();

    $finalScore.textContent = String(score);
    $finalBest.textContent = String(bestScore);
    if ($finalBestStreak) $finalBestStreak.textContent = String(bestStreak);

    updateHud();
    setOverlay($endOverlay, true);
  }

  function resetToIdle() {
    clearAllTimers();
    setMouseVisible(false);
    clearEffects();
    hideCat();

    status = 'idle';
    score = 0;
    streak = 0;
    bestStreakThisRun = 0;
    pausedRemainingMs = 0;

    setOverlay($endOverlay, false);
    setOverlay($startOverlay, true);
    updateHud();
  }

  function pointInMouseHitbox(xPx, yPx) {
    if (!mouseVisible || !mousePos) return false;
    return (
      Math.abs(xPx - mousePos.xPx) <= HALF_HITBOX &&
      Math.abs(yPx - mousePos.yPx) <= HALF_HITBOX
    );
  }

  function onPointerDown(ev) {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const rect = $gameField.getBoundingClientRect();
    const xPx = ev.clientX - rect.left;
    const yPx = ev.clientY - rect.top;

    // Кот всегда один: просто переносим в последнюю точку.
    setCatVisibleAt(xPx, yPx);

    const didHit = pointInMouseHitbox(xPx, yPx);
    if (!didHit && mouseVisible) {
      playMissSound();
      playMouseTaunt();
      resetStreak();
    }

    if (didHit) {
      const hitPos = mousePos ? { ...mousePos } : { xPx, yPx };
      playHitSound();
      score += 1;
      streak += 1;
      if (streak > bestStreakThisRun) bestStreakThisRun = streak;
      if (bestStreakThisRun > bestStreak) bestStreak = bestStreakThisRun;
      if (score > bestScore) {
        // Можно обновлять рекорд сразу, но сохраняем только в конце раунда.
        bestScore = score;
      }
      updateHud();

      // Эффект поимки: “пух” + “+1”
      spawnEffectPuff(hitPos.xPx, hitPos.yPx);
      spawnEffectScore(hitPos.xPx, hitPos.yPx - 36, '+1');
      playCatCatchAt(hitPos.xPx, hitPos.yPx);

      // Мышь поймана: прячем немедленно и запускаем следующий цикл.
      clearTimer(mouseHideTimerId);
      mouseHideTimerId = null;
      setMouseVisible(false);
      scheduleNextMouse();
    }

    ev.preventDefault?.();
  }

  function bindEvents() {
    $startBtn.addEventListener('click', () => startGame());
    $restartBtn.addEventListener('click', () => {
      resetToIdle();
      startGame();
    });

    if ($resultsBtn) $resultsBtn.addEventListener('click', () => onCenterHudButtonClick());
    if ($resultsCloseBtn) $resultsCloseBtn.addEventListener('click', () => closeResults());
    if ($resultsOverlay) {
      $resultsOverlay.addEventListener('click', (ev) => {
        if (ev.target === $resultsOverlay) closeResults();
      });
    }

    // Pointer Events (предпочтительно)
    $gameField.addEventListener('pointerdown', onPointerDown, { passive: false });

    window.addEventListener('resize', () => {
      updateOrientationOverlay();

      // При ресайзе безопасно скрыть мышь и продолжить цикл.
      if (status === 'running') {
        setMouseVisible(false);
        clearTimer(mouseHideTimerId);
        mouseHideTimerId = null;
        clearTimer(nextSpawnTimerId);
        nextSpawnTimerId = null;
        scheduleNextMouse();
      }
    });

    window.addEventListener('orientationchange', () => {
      updateOrientationOverlay();
    });
  }

  function init() {
    loadBestScore();
    loadBestStreak();
    loadHistory();
    updateHud();
    bindEvents();
    updateOrientationOverlay();

    // Если вкладка скрыта — поставим игру на паузу (без усложнения таймингов мыши).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        if (status === 'running') {
          pausedRemainingMs = Math.max(0, endAtMs - Date.now());
          clearAllTimers();
          setMouseVisible(false);
          status = 'paused';
          updateHud();
        }
        return;
      }

      // Возврат: возобновим, только если ориентация разрешена.
      if (status === 'paused') {
        resumeGameAfterOrientation();
      }
    });
  }

  init();
})();
