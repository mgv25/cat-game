(() => {
  const GAME_DURATION_MS = 60_000;
  const BEST_SCORE_KEY = 'catMouseBestScore';
  const HITBOX_SIZE_PX = 80;
  const HALF_HITBOX = HITBOX_SIZE_PX / 2;

  const $score = document.getElementById('score');
  const $timeLeft = document.getElementById('timeLeft');
  const $bestScore = document.getElementById('bestScore');

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

  /** @type {'idle'|'running'|'paused'|'ended'} */
  let status = 'idle';

  let score = 0;
  let bestScore = 0;
  let bestScoreAtRoundStart = 0;

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

  function saveBestScore() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // ignore
    }
  }

  function setOverlay($el, isVisible) {
    $el.classList.toggle('hidden', !isVisible);
  }

  function setMouseVisible(isVisible) {
    mouseVisible = isVisible;
    $mouse.style.display = isVisible ? 'block' : 'none';
    if (!isVisible) mousePos = null;
  }

  function setCatVisibleAt(xPx, yPx) {
    $cat.style.left = `${xPx}px`;
    $cat.style.top = `${yPx}px`;
    $cat.style.display = 'block';
  }

  function hideCat() {
    $cat.style.display = 'none';
  }

  function updateHud() {
    $score.textContent = String(score);
    $bestScore.textContent = String(bestScore);

    let secondsLeft = 60;
    if (status === 'running') {
      secondsLeft = Math.ceil(Math.max(0, endAtMs - Date.now()) / 1000);
    } else if (status === 'paused') {
      secondsLeft = Math.ceil(Math.max(0, pausedRemainingMs) / 1000);
    }
    $timeLeft.textContent = String(clamp(secondsLeft, 0, 60));
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

    const showMs = randomIntInclusive(1000, 2000);
    clearTimer(mouseHideTimerId);
    mouseHideTimerId = window.setTimeout(() => {
      hideMouseAndReschedule();
    }, showMs);
  }

  function hideMouseAndReschedule() {
    if (status !== 'running') {
      setMouseVisible(false);
      return;
    }

    setMouseVisible(false);
    scheduleNextMouse();
  }

  function startGame() {
    updateOrientationOverlay();
    if (!isOrientationAllowed()) return;

    clearAllTimers();
    hideCat();

    score = 0;
    bestScoreAtRoundStart = bestScore;
    status = 'running';
    endAtMs = Date.now() + GAME_DURATION_MS;
    pausedRemainingMs = 0;

    setMouseVisible(false);

    setOverlay($startOverlay, false);
    setOverlay($endOverlay, false);

    updateHud();
    startTick();
    scheduleNextMouse();
  }

  function endGame() {
    if (status === 'ended' || status === 'idle') return;

    clearAllTimers();
    setMouseVisible(false);

    status = 'ended';

    // Рекорд может обновляться “на лету” для HUD — гарантируем сохранение по окончании раунда.
    if (bestScore > bestScoreAtRoundStart) saveBestScore();

    $finalScore.textContent = String(score);
    $finalBest.textContent = String(bestScore);

    updateHud();
    setOverlay($endOverlay, true);
  }

  function resetToIdle() {
    clearAllTimers();
    setMouseVisible(false);
    hideCat();

    status = 'idle';
    score = 0;
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

    if (pointInMouseHitbox(xPx, yPx)) {
      score += 1;
      if (score > bestScore) {
        // Можно обновлять рекорд сразу, но сохраняем только в конце раунда.
        bestScore = score;
      }
      updateHud();

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
