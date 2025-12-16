(() => {
  const MAX_LIVES = 5;
  const INITIAL_LIVES = 5;
  const BEST_SCORE_KEY = 'catMouseBestScore';
  const BEST_TIME_KEY = 'catMouseBestTime';
  const SAVED_LEVEL_KEY = 'catMouseSavedLevel';
  const HISTORY_KEY = 'catMouseHistoryV2';
  const LEVEL_MODE_KEY = 'catMouseLevelMode';
  const SOUND_ENABLED_KEY = 'catMouseSoundEnabled';
  const SPEED_DECREASE_KEY = 'catMouseSpeedDecrease';
  const HISTORY_LIMIT = 50;
  const HITBOX_SIZE_PX = 60; // Base hitbox size (reduced for difficulty)
  const HALF_HITBOX = HITBOX_SIZE_PX / 2;
  const BASE_MIN_SPAWN_MS = 800;
  const BASE_MAX_SPAWN_MS = 3000;
  const BASE_SHOW_DURATION_MS = 2000;
  const CHEESE_SPAWN_CHANCE = 0.15; // 15% chance to spawn cheese
  const HIT_SOUND_SRC = './assets/sounds/hit.mp3';
  const MISS_SOUND_SRC = './assets/sounds/miss.mp3';
  const CHEESE_SOUND_SRC = './assets/sounds/cheese.mp3';
  const RECORD_SOUND_SRC = './assets/sounds/record.mp3';
  const END_WITH_RECORD_SOUND_SRC = './assets/sounds/end_with_record.mp3';
  const LIZARD_SOUND_SRC = './assets/sounds/lizard.mp3';
  const BEE_SOUND_SRC = './assets/sounds/bee.mp3';
  const MOUSE_EMOJI = '🐁';
  const RAT_EMOJI = '🐀';
  const LIZARD_EMOJI = '🦎';
  const BEE_EMOJI = '🐝';
  const CAT_EMOJI = '🐈';
  const MOUSE_SPAWN_CHANCE = 0.60; // 60% chance to spawn mouse
  const RAT_SPAWN_CHANCE = 0.12; // 12% chance to spawn rat
  const LIZARD_SPAWN_CHANCE = 0.08; // 8% chance to spawn lizard
  const BEE_SPAWN_CHANCE = 0.05; // 5% chance to spawn bee

  const $score = document.getElementById('score');
  const $survivalTime = document.getElementById('survivalTime');
  const $level = document.getElementById('level');
  const $bestScoreHud = document.getElementById('bestScoreHud');
  const $savedLevelHud = document.getElementById('savedLevelHud');
  const $bestScoreCard = document.getElementById('bestScoreCard');
  const $savedLevelCard = document.getElementById('savedLevelCard');
  const $bestTimeHud = document.getElementById('bestTimeHud');
  const $timeCard = document.getElementById('timeCard');
  const $hud = document.getElementById('hud');

  const $gameField = document.getElementById('gameField');
  const $canvas = document.getElementById('gameCanvas');
  const ctx = $canvas.getContext('2d');

  const $startOverlay = document.getElementById('startOverlay');
  const $endOverlay = document.getElementById('endOverlay');
  const $rotateOverlay = document.getElementById('rotateOverlay');
  const $pauseOverlay = document.getElementById('pauseOverlay');

  const $startBtn = document.getElementById('startBtn');
  const $continueBtn = document.getElementById('continueBtn');
  const $restartBtn = document.getElementById('restartBtn');
  const $continueBtnEnd = document.getElementById('continueBtnEnd');

  const $savedLevelInfo = document.getElementById('savedLevelInfo');
  const $savedLevelDisplay = document.getElementById('savedLevelDisplay');
  const $continueLevelDisplay = document.getElementById('continueLevelDisplay');
  const $savedLevelInfoEnd = document.getElementById('savedLevelInfoEnd');
  const $savedLevelDisplayEnd = document.getElementById('savedLevelDisplayEnd');
  const $continueLevelDisplayEnd = document.getElementById('continueLevelDisplayEnd');
  const $historyBtnStart = document.getElementById('historyBtnStart');
  const $historyBtnEnd = document.getElementById('historyBtnEnd');
  const $historyOverlay = document.getElementById('historyOverlay');
  const $historyCloseBtn = document.getElementById('historyCloseBtn');
  const $historyResetRecordsBtn = document.getElementById('historyResetRecordsBtn');
  const $historyList = document.getElementById('historyList');

  const $finalTime = document.getElementById('finalTime');
  const $finalLevel = document.getElementById('finalLevel');
  const $finalScore = document.getElementById('finalScore');
  const $finalBest = document.getElementById('finalBest');
  const $finalBestTime = document.getElementById('finalBestTime');
  const $endTitle = document.getElementById('endTitle');
  const $confettiLayer = document.getElementById('confettiLayer');

  const $pauseBtn = document.getElementById('pauseBtn');
  const $resumeBtn = document.getElementById('resumeBtn');
  const $endGameBtn = document.getElementById('endGameBtn');
  const $settingsBtn = document.getElementById('settingsBtn');
  const $settingsOverlay = document.getElementById('settingsOverlay');
  const $settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const $resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const $speedDecreaseInput = document.getElementById('speedDecreaseInput');

  /** @type {'idle'|'running'|'paused'|'ended'} */
  let status = 'idle';
  let isUserPaused = false; // Track if pause is from user action vs orientation

  let score = 0;
  let bestScore = 0;
  let bestScoreAtRoundStart = 0;
  let recordScoreShown = false; // Track if score record was already shown this round
  let scoreRecordBeaten = false; // Track if score record was beaten in current game
  let bestTime = 0;
  let bestTimeAtRoundStart = 0;
  let recordTimeShown = false; // Track if time record was already shown this round
  let timeRecordBeaten = false; // Track if time record was beaten in current game

  let lives = INITIAL_LIVES;
  let currentLevel = 1;
  let savedLevel = 0;
  let savedLevelAtRoundStart = 0;
  let recordLevelShown = false; // Track if level record was already shown this round
  let levelRecordBeaten = false; // Track if level record was beaten in current game
  let levelMode = 'fixed'; // 'fibonacci' or 'fixed' (10 seconds per level) - default is 'fixed'
  let soundEnabled = true; // Sound enabled by default
  let speedDecreasePercent = 5; // Speed decrease percentage per level (default 5%)
  let gameStartMs = 0;
  let survivalTimeMs = 0;
  let pausedSurvivalMs = 0;

  let mouseVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let mousePos = null;
  let mouseEscaping = false;
  let mouseTargetPos = null; // Target position for escaping mouse
  let mouseControlPoint1 = null; // First bezier curve control point
  let mouseControlPoint2 = null; // Second bezier curve control point
  let mouseEscapeStartTime = 0;
  let mouseEscapeDuration = 0;
  let currentMouseHitbox = HALF_HITBOX; // Dynamic hitbox based on speed
  let mouseTargetCheeseIndex = -1; // Which life cheese the mouse is targeting
  let mouseHasGrabbedCheese = false; // Whether mouse has reached and grabbed the cheese
  
  let ratVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let ratPos = null;
  let ratEscaping = false;
  let ratTargetPos = null;
  let ratEscapeStartTime = 0;
  let ratEscapeDuration = 0;
  let currentRatHitbox = HALF_HITBOX;
  let ratTargetCheeseIndex = -1;
  let ratHasGrabbedCheese = false;
  
  let lizardVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let lizardPos = null;
  let lizardEscaping = false;
  let lizardTargetPos = null;
  let lizardEscapeStartTime = 0;
  let lizardEscapeDuration = 0;
  let currentLizardHitbox = HALF_HITBOX;
  
  let beeVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let beePos = null;
  let beeEscaping = false;
  let beeTargetPos = null;
  let beeEscapeStartTime = 0;
  let beeEscapeDuration = 0;
  let currentBeeHitbox = HALF_HITBOX;
  
  let cheeseVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let cheesePos = null;
  let catVisible = false;
  /** @type {{xPx:number, yPx:number} | null} */
  let catPos = null;

  // Transient hit effects (puff + floating score) rendered on canvas
  /** @type {Array<{type:'puff'|'score'|'record'|'penalty', xPx:number, yPx:number, text?:string, color?:string, startMs:number, durationMs:number}>} */
  let effects = [];

  // Canvas emoji sizes
  const MOUSE_SIZE = 32;
  const RAT_SIZE = 32;
  const LIZARD_SIZE = 32;
  const BEE_SIZE = 32;
  const CHEESE_SIZE = 52;
  const CHEESE_LIFE_SIZE = 40;
  const CAT_SIZE = 56;

  // Spawn line (mice and cheese spawn only above this)
  const SPAWN_LINE_MARGIN = 100; // Distance above cheese row

  // Life cheese positions on canvas (array of {xPx, yPx, alive})
  /** @type {Array<{xPx:number, yPx:number, alive:boolean}>} */
  let cheeseLifePositions = [];

  /** @type {number | null} */
  let cheeseHideTimerId = null;
  /** @type {number | null} */
  let nextSpawnTimerId = null;
  /** @type {number | null} */
  let tickTimerId = null;

  // Per-animal timers/tokens. Needed so that old timeouts (e.g. after resize/pause)
  // can't hide a newly spawned animal.
  /** @type {number | null} */
  let mouseEscapeTimerId = null;
  /** @type {number | null} */
  let mouseCheeseCheckIntervalId = null;
  let mouseRunToken = 0;

  /** @type {number | null} */
  let ratEscapeTimerId = null;
  /** @type {number | null} */
  let ratCheeseCheckIntervalId = null;
  let ratRunToken = 0;

  /** @type {number | null} */
  let lizardEscapeTimerId = null;
  let lizardRunToken = 0;

  /** @type {number | null} */
  let beeEscapeTimerId = null;
  let beeRunToken = 0;

  // Sound (best-effort; some browsers require user gesture to unlock audio)
  let audioCtx = null;
  let audioUnlocked = false;
  const hitAudio = new Audio(HIT_SOUND_SRC);
  const missAudio = new Audio(MISS_SOUND_SRC);
  const cheeseAudio = new Audio(CHEESE_SOUND_SRC);
  const recordAudio = new Audio(RECORD_SOUND_SRC);
  const endWithRecordAudio = new Audio(END_WITH_RECORD_SOUND_SRC);
  const lizardAudio = new Audio(LIZARD_SOUND_SRC);
  const beeAudio = new Audio(BEE_SOUND_SRC);
  hitAudio.preload = 'auto';
  missAudio.preload = 'auto';
  cheeseAudio.preload = 'auto';
  recordAudio.preload = 'auto';
  endWithRecordAudio.preload = 'auto';
  lizardAudio.preload = 'auto';
  beeAudio.preload = 'auto';
  hitAudio.volume = 0.7;
  missAudio.volume = 0.6;
  cheeseAudio.volume = 0.7;
  recordAudio.volume = 0.7;
  endWithRecordAudio.volume = 0.7;
  lizardAudio.volume = 0.7;
  beeAudio.volume = 0.7;

  function ensureAudioCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    const ctx = ensureAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Try to unlock HTMLAudio by a silent, gesture-initiated play.
    // Some browsers block audio until the first user interaction.
    try {
      const prevVolHit = hitAudio.volume;
      const prevVolMiss = missAudio.volume;
      const prevVolCheese = cheeseAudio.volume;
      const prevVolRecord = recordAudio.volume;
      const prevVolEndWithRecord = endWithRecordAudio.volume;
      const prevVolLizard = lizardAudio.volume;
      const prevVolBee = beeAudio.volume;
      hitAudio.volume = 0;
      missAudio.volume = 0;
      cheeseAudio.volume = 0;
      recordAudio.volume = 0;
      endWithRecordAudio.volume = 0;
      lizardAudio.volume = 0;
      beeAudio.volume = 0;
      hitAudio.currentTime = 0;
      missAudio.currentTime = 0;
      cheeseAudio.currentTime = 0;
      recordAudio.currentTime = 0;
      endWithRecordAudio.currentTime = 0;
      lizardAudio.currentTime = 0;
      beeAudio.currentTime = 0;
      const p1 = hitAudio.play();
      if (p1 && typeof p1.then === 'function') {
        p1.then(() => hitAudio.pause()).catch(() => {});
      } else {
        hitAudio.pause();
      }
      const p2 = missAudio.play();
      if (p2 && typeof p2.then === 'function') {
        p2.then(() => missAudio.pause()).catch(() => {});
      } else {
        missAudio.pause();
      }
      const p3 = cheeseAudio.play();
      if (p3 && typeof p3.then === 'function') {
        p3.then(() => cheeseAudio.pause()).catch(() => {});
      } else {
        cheeseAudio.pause();
      }
      const p4 = recordAudio.play();
      if (p4 && typeof p4.then === 'function') {
        p4.then(() => recordAudio.pause()).catch(() => {});
      } else {
        recordAudio.pause();
      }
      const p5 = endWithRecordAudio.play();
      if (p5 && typeof p5.then === 'function') {
        p5.then(() => endWithRecordAudio.pause()).catch(() => {});
      } else {
        endWithRecordAudio.pause();
      }
      const p6 = lizardAudio.play();
      if (p6 && typeof p6.then === 'function') {
        p6.then(() => lizardAudio.pause()).catch(() => {});
      } else {
        lizardAudio.pause();
      }
      const p7 = beeAudio.play();
      if (p7 && typeof p7.then === 'function') {
        p7.then(() => beeAudio.pause()).catch(() => {});
      } else {
        beeAudio.pause();
      }
      hitAudio.volume = prevVolHit;
      missAudio.volume = prevVolMiss;
      cheeseAudio.volume = prevVolCheese;
      recordAudio.volume = prevVolRecord;
      endWithRecordAudio.volume = prevVolEndWithRecord;
      lizardAudio.volume = prevVolLizard;
      beeAudio.volume = prevVolBee;
    } catch {
      // ignore
    }
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
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
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
    if (!soundEnabled) return;
    const ok = tryPlayAudio(hitAudio);
    if (!ok) playTone({ freqHz: 880, durationMs: 90, type: 'triangle', gain: 0.04 });
  }

  function playMissSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(missAudio);
    if (!ok) playTone({ freqHz: 220, durationMs: 110, type: 'sawtooth', gain: 0.03 });
  }

  function playCheeseSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(cheeseAudio);
    if (!ok) playTone({ freqHz: 660, durationMs: 90, type: 'square', gain: 0.03 });
  }

  function playRecordSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(recordAudio);
    if (!ok) playTone({ freqHz: 880, durationMs: 200, type: 'sine', gain: 0.05 });
  }

  function playEndWithRecordSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(endWithRecordAudio);
    if (!ok) playTone({ freqHz: 740, durationMs: 260, type: 'sine', gain: 0.05 });
  }

  let confettiCleanupTimerId = null;

  function clearConfetti() {
    clearTimer(confettiCleanupTimerId);
    confettiCleanupTimerId = null;
    if ($confettiLayer) $confettiLayer.replaceChildren();
  }

  function spawnEndConfetti() {
    if (!$confettiLayer) return;
    clearConfetti();

    const rect = $confettiLayer.getBoundingClientRect();
    const w = rect.width || window.innerWidth || 1;
    const count = Math.min(120, Math.max(70, Math.floor(w / 10))); // scales with width

    // Palette tuned to existing UI (warm yellow highlight + a bit of accent colors).
    const colors = [
      'rgba(255, 235, 150, 1)', // HUD highlight value
      'rgba(255, 220, 100, 0.98)', // record effect yellow
      'rgba(255, 200, 80, 0.96)',  // warm amber
      'rgba(150, 255, 180, 0.90)', // score green
      'rgba(160, 190, 255, 0.85)', // cool blue to match bg
      'rgba(220, 180, 255, 0.80)', // soft violet
    ];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confettiPiece';

      const xPx = Math.random() * w;
      const driftPx = (Math.random() - 0.5) * 160; // gentle sideways drift
      const rot = Math.floor(Math.random() * 360);
      const delayMs = Math.floor(Math.random() * 450);
      const durMs = Math.floor(1700 + Math.random() * 1300);
      const wPx = Math.floor(6 + Math.random() * 8);
      const hPx = Math.floor(10 + Math.random() * 14);
      const c = colors[Math.floor(Math.random() * colors.length)];

      el.style.setProperty('--x', `${xPx}px`);
      el.style.setProperty('--drift', `${driftPx}px`);
      el.style.setProperty('--rot', `${rot}deg`);
      el.style.setProperty('--delay', `${delayMs}ms`);
      el.style.setProperty('--dur', `${durMs}ms`);
      el.style.setProperty('--w', `${wPx}px`);
      el.style.setProperty('--h', `${hPx}px`);
      el.style.setProperty('--c', c);

      frag.appendChild(el);
    }

    $confettiLayer.appendChild(frag);
    confettiCleanupTimerId = window.setTimeout(() => clearConfetti(), 5200);
  }

  function playLizardSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(lizardAudio);
    if (!ok) playTone({ freqHz: 440, durationMs: 120, type: 'square', gain: 0.04 });
  }

  function playBeeSound() {
    if (!soundEnabled) return;
    const ok = tryPlayAudio(beeAudio);
    if (!ok) playTone({ freqHz: 500, durationMs: 100, type: 'sawtooth', gain: 0.04 });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** @type {Array<{ts:number, score:number, survivalSeconds:number, level:number, isBestScore:boolean, isBestLevel:boolean, isBestTime:boolean}>} */
  let history = [];

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

  function formatTs(ts) {
    try {
      const d = new Date(ts);
      return d
        .toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
        .replace(/\s?г\.?$/, '');
    } catch {
      return '';
    }
  }

  function renderHistory() {
    if (!$historyList) return;
    if (!history.length) {
      $historyList.innerHTML =
        '<div class="historyRow"><div class="historyMain"><div class="historyLine1">Пока нет игр</div><div class="historyLine2">Сыграй хотя бы один раунд</div></div></div>';
      return;
    }

    $historyList.innerHTML = history
      .map((h) => {
        const badges = [
          h.isBestScore ? '<span class="badge badgeScore">Рекорд очков</span>' : '',
          h.isBestLevel ? '<span class="badge badgeLevel">Рекорд уровня</span>' : '',
          h.isBestTime ? '<span class="badge badgeTime">Рекорд времени</span>' : '',
        ].filter(Boolean).join('');

        return `
          <div class="historyRow">
            <div class="historyMain">
              <div class="historyLine1">Очки: ${h.score} · Время: ${h.survivalSeconds}с · Уровень: ${h.level}</div>
              <div class="historyLine2">${formatTs(h.ts)}</div>
            </div>
            <div class="historyBadges">${badges}</div>
          </div>
        `;
      })
      .join('');
  }

  function openHistory() {
    if (!(status === 'idle' || status === 'ended')) return;
    renderHistory();
    setOverlay($historyOverlay, true);
  }

  function closeHistory() {
    setOverlay($historyOverlay, false);
  }

  function resetRecords() {
    // Reset best score
    bestScore = 0;
    saveBestScore();

    // Reset best time
    bestTime = 0;
    saveBestTime();
    
    // Reset saved level
    savedLevel = 0;
    saveLevelProgress(0);
    
    // Update HUD
    updateHud();
    
    // Re-render history to update badges
    renderHistory();
  }

  function openSettings() {
    if (!(status === 'idle' || status === 'ended')) return;
    // Update speed decrease input value when opening settings
    if ($speedDecreaseInput) {
      $speedDecreaseInput.value = String(speedDecreasePercent);
    }
    setOverlay($settingsOverlay, true);
  }

  function closeSettings() {
    setOverlay($settingsOverlay, false);
  }

  function resetSettings() {
    // Reset level mode to default
    levelMode = 'fixed';
    saveLevelMode('fixed');
    
    // Reset sound to default (enabled)
    soundEnabled = true;
    saveSoundEnabled(true);
    
    // Reset speed decrease to default (5%)
    speedDecreasePercent = 5;
    saveSpeedDecrease(5);
    
    // Update segmented control UI
    const segmentButtons = document.querySelectorAll('.segmentButton');
    segmentButtons.forEach(button => {
      const setting = button.getAttribute('data-setting');
      const value = button.getAttribute('data-value');
      
      if (setting === 'levelMode') {
        if (value === 'fixed') {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      } else if (setting === 'sound') {
        if (value === 'on') {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
    
    // Update speed decrease input
    if ($speedDecreaseInput) {
      $speedDecreaseInput.value = '5';
    }
  }

  function initSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.segmentButton');
    
    // Set initial state based on loaded settings
    segmentButtons.forEach(button => {
      const setting = button.getAttribute('data-setting');
      const value = button.getAttribute('data-value');
      
      if (setting === 'levelMode') {
        if (value === levelMode) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      } else if (setting === 'sound') {
        const shouldBeActive = (value === 'on' && soundEnabled) || (value === 'off' && !soundEnabled);
        if (shouldBeActive) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
    
    // Add click handlers
    segmentButtons.forEach(button => {
      button.addEventListener('click', () => {
        const setting = button.getAttribute('data-setting');
        const value = button.getAttribute('data-value');
        
        // Find all buttons in the same segmented control (same setting)
        const sameSettingButtons = Array.from(segmentButtons).filter(btn => 
          btn.getAttribute('data-setting') === setting
        );
        
        // Remove active class from all buttons in the same control
        sameSettingButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        // Save the selected setting
        if (setting === 'levelMode') {
          saveLevelMode(value);
        } else if (setting === 'sound') {
          saveSoundEnabled(value === 'on');
        }
      });
    });
  }

  function initSpeedDecreaseInput() {
    if (!$speedDecreaseInput) return;
    
    // Ensure speedDecreasePercent has a valid value (should be set by loadSpeedDecrease)
    if (speedDecreasePercent === undefined || speedDecreasePercent === null) {
      speedDecreasePercent = 5; // Default: 5%
    }
    
    // Set initial value from loaded settings
    $speedDecreaseInput.value = String(speedDecreasePercent);
    
    // Add change handler
    $speedDecreaseInput.addEventListener('input', () => {
      const value = Number($speedDecreaseInput.value);
      
      // Validate: must be between -99 and 99
      if (Number.isFinite(value) && value >= -99 && value <= 99) {
        saveSpeedDecrease(Math.floor(value));
      } else {
        // If invalid, revert to current saved value
        $speedDecreaseInput.value = String(speedDecreasePercent);
      }
    });
    
    // Also handle blur to ensure value is saved even if user types and leaves
    $speedDecreaseInput.addEventListener('blur', () => {
      const value = Number($speedDecreaseInput.value);
      
      if (Number.isFinite(value) && value >= -99 && value <= 99) {
        saveSpeedDecrease(Math.floor(value));
        $speedDecreaseInput.value = String(speedDecreasePercent);
      } else {
        // Revert to saved value if invalid
        $speedDecreaseInput.value = String(speedDecreasePercent);
      }
    });
  }

  function setupCanvas() {
    const rect = $canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    $canvas.width = rect.width * dpr;
    $canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    initializeCheeseLifePositions();
  }

  function syncHudHeightVar() {
    if (!$hud) return;
    const h = Math.ceil($hud.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--hud-height', `${h}px`);
  }

  function initializeCheeseLifePositions() {
    // Initialize fixed positions for all cheese lives (only called once on setup)
    const canvasRect = $canvas.getBoundingClientRect();

    // Position cheeses centered between spawn line and bottom
    // Spawn line is SPAWN_LINE_MARGIN above cheese, cheese is centered in remaining space
    const totalBottomSpace = SPAWN_LINE_MARGIN * 2; // Total space reserved at bottom
    const baseY = canvasRect.height - (totalBottomSpace / 2); // Center in bottom area

    const startX = 30; // Start 30px from left edge
    const endX = canvasRect.width - 30; // End 30px from right edge
    const totalWidth = endX - startX;
    const spacing = MAX_LIVES > 1 ? totalWidth / (MAX_LIVES - 1) : 0;

    // Preserve alive states if positions already exist (for resize)
    const previousAliveStates = cheeseLifePositions.map(c => c.alive);

    cheeseLifePositions = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      cheeseLifePositions.push({
        xPx: startX + i * spacing,
        yPx: baseY,
        alive: previousAliveStates.length > 0 ? previousAliveStates[i] : true
      });
    }
  }

  function resetCheeseLifeStates() {
    // Reset all cheese to alive state based on current lives
    for (let i = 0; i < cheeseLifePositions.length; i++) {
      cheeseLifePositions[i].alive = i < lives;
    }
  }

  function render() {
    const rect = $canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw transient effects (puff + +1) on top of scene.
    const now = Date.now();
    if (effects.length > 0) {
      const nextEffects = [];
      for (const e of effects) {
        const t = (now - e.startMs) / e.durationMs;
        if (t >= 1) continue;
        nextEffects.push(e);

        if (e.type === 'puff') {
          // Match earlier DOM effect: scale 0.5 -> 1.35, fade in then out.
          const scale = 0.5 + 0.85 * t;
          const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;

          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.translate(e.xPx, e.yPx);
          ctx.scale(scale, scale);
          ctx.font = `54px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
          ctx.fillStyle = '#000';
          ctx.fillText('💥', 0, 0);
          ctx.restore();
        } else if (e.type === 'score') {
          // Match earlier DOM effect: slight scale up and float up ~26px, fade in/out.
          const yOffset = -26 * t;
          const scale = 0.95 + 0.10 * t;
          const alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;

          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.translate(e.xPx, e.yPx + yOffset);
          ctx.scale(scale, scale);
          ctx.font = `28px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
          ctx.fillStyle = 'rgba(150, 255, 180, 0.98)'; // Green color matching app theme
          ctx.fillText(e.text || '+1', 0, 0);
          ctx.restore();
        } else if (e.type === 'record') {
          // Similar to score effect: scale up and float up ~26px, fade in/out, but yellow color.
          const yOffset = -26 * t;
          const scale = 0.95 + 0.10 * t;
          const alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;

          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.translate(e.xPx, e.yPx + yOffset);
          ctx.scale(scale, scale);
          ctx.font = `32px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
          ctx.fillStyle = e.color || 'rgba(255, 220, 100, 0.98)'; // Default: yellow
          ctx.fillText(e.text || 'Рекорд!', 0, 0);
          ctx.restore();
        } else if (e.type === 'penalty') {
          // Similar to score effect: scale up and float up ~26px, fade in/out, but red color for penalty.
          const yOffset = -26 * t;
          const scale = 0.95 + 0.10 * t;
          const alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;

          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.translate(e.xPx, e.yPx + yOffset);
          ctx.scale(scale, scale);
          ctx.font = `28px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
          ctx.fillStyle = 'rgba(255, 100, 100, 0.98)'; // Red color for penalty
          ctx.fillText(e.text || '-1', 0, 0);
          ctx.restore();
        }
      }
      effects = nextEffects;
    }

    // Draw mouse if visible
    if (mouseVisible && mousePos) {
      // Interpolate position if escaping
      let drawX = mousePos.xPx;
      let drawY = mousePos.yPx;
      let angle = 0;

      if (mouseEscaping && mouseTargetPos && window.mouseControlPoints) {
        const now = Date.now();
        const elapsed = now - mouseEscapeStartTime;
        const t = Math.min(1, elapsed / mouseEscapeDuration);

        // Generalized Bezier curve with variable control points
        // Build full point array: [start, ...controlPoints, end]
        const points = [mousePos, ...window.mouseControlPoints, mouseTargetPos];
        const n = points.length - 1; // degree

        // De Casteljau's algorithm for Bezier curve evaluation
        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        drawX = pos.xPx;
        drawY = pos.yPx;

        // Calculate tangent for rotation (derivative at t)
        const dt = 0.01;
        const pos1 = bezierPoint(points, Math.max(0, t - dt));
        const pos2 = bezierPoint(points, Math.min(1, t + dt));
        const dx = pos2.xPx - pos1.xPx;
        const dy = pos2.yPx - pos1.yPx;

        angle = Math.atan2(dy, dx) - Math.PI / 2; // Rotate 90° counter-clockwise
      }

      // Draw emoji with rotation
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(angle);
      ctx.font = `${MOUSE_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.fillStyle = '#000';
      ctx.fillText(MOUSE_EMOJI, 0, 0);
      ctx.restore();
    }

    // Draw rat if visible
    if (ratVisible && ratPos) {
      // Interpolate position if escaping
      let drawX = ratPos.xPx;
      let drawY = ratPos.yPx;
      let angle = 0;

      if (ratEscaping && ratTargetPos && window.ratControlPoints) {
        const now = Date.now();
        const elapsed = now - ratEscapeStartTime;
        const t = Math.min(1, elapsed / ratEscapeDuration);

        // Generalized Bezier curve with variable control points
        const points = [ratPos, ...window.ratControlPoints, ratTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        drawX = pos.xPx;
        drawY = pos.yPx;

        // Calculate tangent for rotation
        const dt = 0.01;
        const pos1 = bezierPoint(points, Math.max(0, t - dt));
        const pos2 = bezierPoint(points, Math.min(1, t + dt));
        const dx = pos2.xPx - pos1.xPx;
        const dy = pos2.yPx - pos1.yPx;

        angle = Math.atan2(dy, dx) - Math.PI / 2;
      }

      // Draw emoji with rotation
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(angle);
      ctx.font = `${RAT_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.fillStyle = '#000';
      ctx.fillText(RAT_EMOJI, 0, 0);
      ctx.restore();
    }

    // Draw lizard if visible
    if (lizardVisible && lizardPos) {
      // Interpolate position if escaping
      let drawX = lizardPos.xPx;
      let drawY = lizardPos.yPx;
      let angle = 0;

      if (lizardEscaping && lizardTargetPos && window.lizardControlPoints) {
        const now = Date.now();
        const elapsed = now - lizardEscapeStartTime;
        const t = Math.min(1, elapsed / lizardEscapeDuration);

        // Generalized Bezier curve with variable control points
        const points = [lizardPos, ...window.lizardControlPoints, lizardTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        drawX = pos.xPx;
        drawY = pos.yPx;

        // Calculate tangent for rotation
        const dt = 0.01;
        const pos1 = bezierPoint(points, Math.max(0, t - dt));
        const pos2 = bezierPoint(points, Math.min(1, t + dt));
        const dx = pos2.xPx - pos1.xPx;
        const dy = pos2.yPx - pos1.yPx;

        angle = Math.atan2(dy, dx) - Math.PI / 2;
      }

      // Draw emoji with rotation (flipped 180 degrees)
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(angle + Math.PI); // Add 180 degrees to flip the emoji
      ctx.font = `${LIZARD_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.fillStyle = '#000';
      ctx.fillText(LIZARD_EMOJI, 0, 0);
      ctx.restore();
    }

    // Draw bee if visible
    if (beeVisible && beePos) {
      // Interpolate position if escaping
      let drawX = beePos.xPx;
      let drawY = beePos.yPx;
      let angle = 0;

      if (beeEscaping && beeTargetPos && window.beeControlPoints) {
        const now = Date.now();
        const elapsed = now - beeEscapeStartTime;
        const t = Math.min(1, elapsed / beeEscapeDuration);

        // Generalized Bezier curve with variable control points
        const points = [beePos, ...window.beeControlPoints, beeTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        drawX = pos.xPx;
        drawY = pos.yPx;

        // Calculate tangent for rotation
        const dt = 0.01;
        const pos1 = bezierPoint(points, Math.max(0, t - dt));
        const pos2 = bezierPoint(points, Math.min(1, t + dt));
        const dx = pos2.xPx - pos1.xPx;
        const dy = pos2.yPx - pos1.yPx;

        angle = Math.atan2(dy, dx) - Math.PI / 2;
      }

      // Draw emoji with rotation
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(angle);
      ctx.font = `${BEE_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.fillStyle = '#000';
      ctx.fillText(BEE_EMOJI, 0, 0);
      ctx.restore();
    }

    // Draw cheese if visible
    if (cheeseVisible && cheesePos) {
      try {
        ctx.font = `${CHEESE_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
        ctx.fillStyle = '#000';
        ctx.fillText('🧀', cheesePos.xPx, cheesePos.yPx);
      } catch (e) {
        console.error('Cheese render error:', e);
      }
    }

    // Draw cat if visible
    if (catVisible && catPos) {
      try {
        ctx.font = `${CAT_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
        ctx.fillStyle = '#000';
        ctx.fillText(CAT_EMOJI, catPos.xPx, catPos.yPx);
      } catch (e) {
        console.error('Cat render error:', e);
      }
    }

    // Draw spawn line (dashed line above cheese row)
    if (cheeseLifePositions.length > 0) {
      const spawnLineY = cheeseLifePositions[0].yPx - SPAWN_LINE_MARGIN;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]); // Dashed line pattern
      ctx.beginPath();
      ctx.moveTo(0, spawnLineY);
      ctx.lineTo(rect.width, spawnLineY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line
    }

    // Draw life cheeses on canvas
    ctx.font = `${CHEESE_LIFE_SIZE}px Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.fillStyle = '#000';
    for (let i = 0; i < cheeseLifePositions.length; i++) {
      const pos = cheeseLifePositions[i];

      // Skip if not alive
      if (!pos.alive) continue;
      // If this cheese is being targeted and mouse has grabbed it, don't draw it
      if (mouseTargetCheeseIndex === i && mouseHasGrabbedCheese) {
        continue;
      }
      ctx.fillText('🧀', pos.xPx, pos.yPx);
    }

    // Continue render loop
    requestAnimationFrame(render);
  }

  function clearTimer(id) {
    if (id != null) window.clearTimeout(id);
  }

  function clearIntervalTimer(id) {
    if (id != null) window.clearInterval(id);
  }

  function clearAllTimers() {
    clearTimer(cheeseHideTimerId);
    clearTimer(nextSpawnTimerId);
    clearIntervalTimer(tickTimerId);
    clearTimer(mouseEscapeTimerId);
    clearIntervalTimer(mouseCheeseCheckIntervalId);
    clearTimer(ratEscapeTimerId);
    clearIntervalTimer(ratCheeseCheckIntervalId);
    clearTimer(lizardEscapeTimerId);
    clearTimer(beeEscapeTimerId);
    cheeseHideTimerId = null;
    nextSpawnTimerId = null;
    tickTimerId = null;
    mouseEscapeTimerId = null;
    mouseCheeseCheckIntervalId = null;
    ratEscapeTimerId = null;
    ratCheeseCheckIntervalId = null;
    lizardEscapeTimerId = null;
    beeEscapeTimerId = null;
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

  function loadBestTime() {
    try {
      const raw = window.localStorage.getItem(BEST_TIME_KEY);
      const n = Number(raw);
      bestTime = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      bestTime = 0;
    }
  }

  function saveBestTime() {
    try {
      window.localStorage.setItem(BEST_TIME_KEY, String(bestTime));
    } catch {
      // ignore
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // ignore
    }
  }

  function loadSavedLevel() {
    try {
      const raw = window.localStorage.getItem(SAVED_LEVEL_KEY);
      const n = Number(raw);
      savedLevel = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {
      savedLevel = 0;
    }
  }

  function saveLevelProgress(level) {
    try {
      window.localStorage.setItem(SAVED_LEVEL_KEY, String(level));
      savedLevel = level;
    } catch {
      // ignore
    }
  }

  function loadLevelMode() {
    try {
      const raw = window.localStorage.getItem(LEVEL_MODE_KEY);
      if (raw === 'fixed' || raw === 'fibonacci') {
        levelMode = raw;
      } else {
        levelMode = 'fixed'; // Default: linear 17 seconds per level
      }
    } catch {
      levelMode = 'fixed'; // Default: linear 10 seconds per level
    }
  }

  function saveLevelMode(mode) {
    try {
      window.localStorage.setItem(LEVEL_MODE_KEY, mode);
      levelMode = mode;
    } catch {
      // ignore
    }
  }

  function loadSoundEnabled() {
    try {
      const raw = window.localStorage.getItem(SOUND_ENABLED_KEY);
      if (raw === 'false') {
        soundEnabled = false;
      } else {
        soundEnabled = true; // Default: enabled
      }
    } catch {
      soundEnabled = true; // Default: enabled
    }
  }

  function saveSoundEnabled(enabled) {
    try {
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
      soundEnabled = enabled;
    } catch {
      // ignore
    }
  }

  function loadSpeedDecrease() {
    try {
      const raw = window.localStorage.getItem(SPEED_DECREASE_KEY);
      if (raw === null || raw === '' || raw === undefined) {
        // No value in localStorage, use default
        speedDecreasePercent = 5; // Default: 5%
        // Save default value to localStorage
        saveSpeedDecrease(5);
        return;
      }
      const n = Number(raw);
      if (Number.isFinite(n) && n >= -99 && n <= 99) {
        speedDecreasePercent = Math.floor(n);
      } else {
        speedDecreasePercent = 5; // Default: 5%
        saveSpeedDecrease(5);
      }
    } catch {
      speedDecreasePercent = 5; // Default: 5%
      saveSpeedDecrease(5);
    }
  }

  function saveSpeedDecrease(percent) {
    try {
      window.localStorage.setItem(SPEED_DECREASE_KEY, String(percent));
      speedDecreasePercent = percent;
    } catch {
      // ignore
    }
  }

  // Generate Fibonacci number for a given index (0-indexed)
  function fibonacci(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  // Get the time threshold in seconds for a given level (levels start from 1)
  function getLevelTimeSeconds(level) {
    if (level <= 1) return 0; // Level 1 is reached immediately
    if (levelMode === 'fixed') {
      // Linear: each level requires 17 seconds (level 2 at 17s, level 3 at 34s, etc.)
      return (level - 1) * 17;
    } else {
      // Fibonacci mode (default): level 2 at 1s, level 3 at 2s, level 4 at 3s, etc.
      return fibonacci(level - 1);
    }
  }

  // Calculate current level based on survival time in seconds (levels start from 1)
  function calculateLevel(survivalSeconds) {
    let level = 1; // Start from level 1
    while (getLevelTimeSeconds(level + 1) <= survivalSeconds) {
      level++;
    }
    return level;
  }

  // Get mouse lifespan in milliseconds for a given level in fixed mode
  function getMouseLifespanMs(level) {
    const BASE_LIFESPAN_MS = 2500; // Starting lifespan at level 1 (2.5 seconds)
    
    if (level <= 1) return BASE_LIFESPAN_MS;
    
    let lifespan = BASE_LIFESPAN_MS;
    
    // Calculate lifespan based on level progression
    // Use speedDecreasePercent setting (positive = decrease, negative = increase)
    const multiplier = 1 - (speedDecreasePercent / 100);
    
    for (let i = 2; i <= level; i++) {
      lifespan = lifespan * multiplier;
    }
    
    return Math.floor(lifespan);
  }

  function setOverlay($el, isVisible) {
    $el.classList.toggle('hidden', !isVisible);
  }

  function updateStartOverlay() {
    if (savedLevel > 0) {
      $savedLevelInfo.style.display = 'block';
      $savedLevelDisplay.textContent = String(savedLevel);
      $continueBtn.style.display = 'block';
      $continueLevelDisplay.textContent = String(savedLevel);
      $startBtn.style.marginTop = '8px';
    } else {
      $savedLevelInfo.style.display = 'none';
      $continueBtn.style.display = 'none';
      $startBtn.style.marginTop = '0';
    }
  }

  function updateEndOverlay() {
    if (savedLevel > 0) {
      $savedLevelInfoEnd.style.display = 'block';
      $savedLevelDisplayEnd.textContent = String(savedLevel);
      $continueBtnEnd.style.display = 'block';
      $continueLevelDisplayEnd.textContent = String(savedLevel);
      $restartBtn.style.marginTop = '8px';
    } else {
      $savedLevelInfoEnd.style.display = 'none';
      $continueBtnEnd.style.display = 'none';
      $restartBtn.style.marginTop = '0';
    }
  }

  function setMouseVisible(isVisible) {
    if (!isVisible && mouseVisible) {
      // Log when mouse becomes invisible
      console.trace('Mouse hidden');
    }
    mouseVisible = isVisible;
    if (!isVisible) {
      // Invalidate and clear any pending mouse timers from a previous spawn.
      mouseRunToken++;
      clearTimer(mouseEscapeTimerId);
      clearIntervalTimer(mouseCheeseCheckIntervalId);
      mouseEscapeTimerId = null;
      mouseCheeseCheckIntervalId = null;

      mousePos = null;
      mouseEscaping = false;
      mouseTargetPos = null;
      mouseControlPoint1 = null;
      mouseControlPoint2 = null;
      window.mouseControlPoints = null;
      currentMouseHitbox = HALF_HITBOX; // Reset to default
      mouseTargetCheeseIndex = -1;
      mouseHasGrabbedCheese = false;
    }
  }

  function setRatVisible(isVisible) {
    ratVisible = isVisible;
    if (!isVisible) {
      ratRunToken++;
      clearTimer(ratEscapeTimerId);
      clearIntervalTimer(ratCheeseCheckIntervalId);
      ratEscapeTimerId = null;
      ratCheeseCheckIntervalId = null;

      ratPos = null;
      ratEscaping = false;
      ratTargetPos = null;
      window.ratControlPoints = null;
      currentRatHitbox = HALF_HITBOX;
      ratTargetCheeseIndex = -1;
      ratHasGrabbedCheese = false;
    }
  }

  function setLizardVisible(isVisible) {
    lizardVisible = isVisible;
    if (!isVisible) {
      lizardRunToken++;
      clearTimer(lizardEscapeTimerId);
      lizardEscapeTimerId = null;

      lizardPos = null;
      lizardEscaping = false;
      lizardTargetPos = null;
      window.lizardControlPoints = null;
      currentLizardHitbox = HALF_HITBOX;
    }
  }

  function setBeeVisible(isVisible) {
    beeVisible = isVisible;
    if (!isVisible) {
      beeRunToken++;
      clearTimer(beeEscapeTimerId);
      beeEscapeTimerId = null;

      beePos = null;
      beeEscaping = false;
      beeTargetPos = null;
      window.beeControlPoints = null;
      currentBeeHitbox = HALF_HITBOX;
    }
  }

  function setCheeseVisible(isVisible) {
    cheeseVisible = isVisible;
    if (!isVisible) cheesePos = null;
  }

  function setCatVisibleAt(xPx, yPx) {
    catVisible = true;
    catPos = { xPx, yPx };
  }

  function hideCat() {
    catVisible = false;
    catPos = null;
  }

  function updateHud() {
    $score.textContent = String(score);
    $level.textContent = String(currentLevel);
    if ($savedLevelHud) $savedLevelHud.textContent = String(savedLevel);
    if ($bestScoreHud) $bestScoreHud.textContent = String(bestScore);
    if ($bestTimeHud) $bestTimeHud.textContent = String(bestTime);

    let survivalSeconds = 0;
    if (status === 'running') {
      survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      if (survivalSeconds > bestTime) bestTime = survivalSeconds;
      if ($bestTimeHud) $bestTimeHud.textContent = String(bestTime);

      // Check if time record was beaten (skip if first game)
      if (!recordTimeShown && survivalSeconds > bestTimeAtRoundStart && bestTimeAtRoundStart > 0) {
        recordTimeShown = true;
        timeRecordBeaten = true;
        playRecordSound();
        const rect = $canvas.getBoundingClientRect();
        spawnRecordEffect(rect.width / 2, rect.height / 2 - 40, 'Рекорд времени!', 'rgba(160, 190, 255, 0.95)');
        if ($timeCard) $timeCard.classList.add('highlightedTime');
      }
      const newLevel = calculateLevel(survivalSeconds);
      // Check if level record was beaten (only when level actually increases, skip if first game)
      if (newLevel !== currentLevel && !recordLevelShown && newLevel > savedLevelAtRoundStart && savedLevelAtRoundStart > 0) {
        recordLevelShown = true;
        levelRecordBeaten = true;
        playRecordSound();
        // Show record effect at center of canvas
        const rect = $canvas.getBoundingClientRect();
        spawnRecordEffect(rect.width / 2, rect.height / 2, 'Рекорд уровня!', 'rgba(255, 220, 100, 0.98)');
        if ($savedLevelCard) $savedLevelCard.classList.add('highlighted');
      }
      currentLevel = newLevel;
    } else if (status === 'paused') {
      survivalSeconds = Math.floor((pausedSurvivalMs + survivalTimeMs) / 1000);
    } else {
      survivalSeconds = Math.floor(survivalTimeMs / 1000);
    }
    $survivalTime.textContent = String(survivalSeconds);
    $level.textContent = String(currentLevel);
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
    if (isUserPaused) return; // Don't override user pause
    pausedSurvivalMs = Date.now() - gameStartMs;
    clearAllTimers();
    setMouseVisible(false);
    setRatVisible(false);
    setLizardVisible(false);
    setBeeVisible(false);
    setCheeseVisible(false);
    status = 'paused';
    updateHud();
  }

  function resumeGameAfterOrientation() {
    if (status !== 'paused') return;
    if (!isOrientationAllowed()) return;
    if (isUserPaused) return; // Don't resume if user paused

    survivalTimeMs = survivalTimeMs + pausedSurvivalMs;
    gameStartMs = Date.now();
    pausedSurvivalMs = 0;
    status = 'running';
    startTick();
    scheduleNextMouse();
    updateHud();
  }

  function pauseGameByUser() {
    if (status !== 'running') return;
    isUserPaused = true;
    pausedSurvivalMs = Date.now() - gameStartMs;
    clearAllTimers();
    setMouseVisible(false);
    setRatVisible(false);
    setLizardVisible(false);
    setBeeVisible(false);
    setCheeseVisible(false);
    status = 'paused';
    if ($pauseBtn) $pauseBtn.style.display = 'none';
    updateHud();
    setOverlay($pauseOverlay, true);
  }

  function resumeGameByUser() {
    if (status !== 'paused') return;
    if (!isUserPaused) return;
    if (!isOrientationAllowed()) return;

    isUserPaused = false;
    survivalTimeMs = survivalTimeMs + pausedSurvivalMs;
    gameStartMs = Date.now();
    pausedSurvivalMs = 0;
    status = 'running';
    if ($pauseBtn) $pauseBtn.style.display = 'block';
    setOverlay($pauseOverlay, false);
    startTick();
    scheduleNextMouse();
    updateHud();
  }

  function endGameFromPause() {
    if (status !== 'paused') return;
    if (!isUserPaused) return;

    isUserPaused = false;
    setOverlay($pauseOverlay, false);
    endGame();
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
      updateHud();
    }, 125);
  }

  function scheduleNextMouse() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    // Calculate difficulty-adjusted spawn times
    let difficultyFactor;
    
    if (levelMode === 'fixed') {
      // Fixed mode: spawn rate based on current level
      // Use same progression as mouse lifespan for consistency
      difficultyFactor = getMouseLifespanMs(currentLevel) / 2500;
    } else {
      // Fibonacci mode: spawn rate based on survival time (old logic)
      const survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      difficultyFactor = Math.max(0.3, 1 - survivalSeconds / 120); // Gets harder over 2 minutes
    }

    const minSpawn = Math.floor(BASE_MIN_SPAWN_MS * difficultyFactor);
    const maxSpawn = Math.min(3000, Math.floor(BASE_MAX_SPAWN_MS * difficultyFactor)); // Never exceed 3 seconds

    const waitMs = randomIntInclusive(minSpawn, maxSpawn);
    clearTimer(nextSpawnTimerId);
    nextSpawnTimerId = window.setTimeout(() => {
      // Count actual alive cheeses
      const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;

      // Randomly decide to spawn cheese, mouse, rat, lizard, or bee
      const rand = Math.random();
      
      // Only spawn cheese if player doesn't have all lives (15% chance)
      if (aliveCheesesCount < MAX_LIVES && rand < CHEESE_SPAWN_CHANCE) {
        showCheese();
      } else {
        // When cheese doesn't spawn, use remaining probability for animals
        // Normalize random value for animal spawn (since cheese takes 15%)
        const animalRand = aliveCheesesCount >= MAX_LIVES 
          ? rand  // If all lives, use full range
          : (rand - CHEESE_SPAWN_CHANCE) / (1 - CHEESE_SPAWN_CHANCE); // Otherwise normalize
        
        // Calculate cumulative probabilities for animals (60% + 12% + 8% + 5% = 85%)
        const totalAnimalChance = MOUSE_SPAWN_CHANCE + RAT_SPAWN_CHANCE + LIZARD_SPAWN_CHANCE + BEE_SPAWN_CHANCE;
        const mouseThreshold = MOUSE_SPAWN_CHANCE / totalAnimalChance;
        const ratThreshold = (MOUSE_SPAWN_CHANCE + RAT_SPAWN_CHANCE) / totalAnimalChance;
        const lizardThreshold = (MOUSE_SPAWN_CHANCE + RAT_SPAWN_CHANCE + LIZARD_SPAWN_CHANCE) / totalAnimalChance;
        
        if (animalRand < mouseThreshold) {
          // Mouse spawn (60% of total, ~70.6% of animals)
          showMouse();
        } else if (animalRand < ratThreshold) {
          // Rat spawn (12% of total, ~14.1% of animals)
          showRat();
        } else if (animalRand < lizardThreshold) {
          // Lizard spawn (8% of total, ~9.4% of animals)
          showLizard();
        } else {
          // Bee spawn (5% of total, ~5.9% of animals)
          showBee();
        }
      }
    }, waitMs);
  }

  function pickRandomMousePosition() {
    const rect = $canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Если поле ещё не проложилось — безопасно не спавним.
    if (!w || !h) return null;

    // Calculate spawn line position
    const spawnLineY = cheeseLifePositions.length > 0
      ? cheeseLifePositions[0].yPx - SPAWN_LINE_MARGIN
      : h - 150;

    const padding = 4;
    const minX = padding + HALF_HITBOX;
    const maxX = Math.max(minX, w - padding - HALF_HITBOX);
    const minY = padding + HALF_HITBOX;
    const maxY = Math.max(minY, spawnLineY - HALF_HITBOX); // Spawn only above line

    return {
      xPx: randomIntInclusive(Math.floor(minX), Math.floor(maxX)),
      yPx: randomIntInclusive(Math.floor(minY), Math.floor(maxY)),
    };
  }

  function showMouse() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      console.log('Failed to pick position');
      scheduleNextMouse();
      return;
    }

    console.log('Spawning mouse at', pos);
    mousePos = pos;
    setMouseVisible(true);

    // Start escaping immediately!
    animateMouseEscape();
  }

  function animateMouseEscape() {
    if (!mouseVisible || !mousePos) return;
    if (cheeseLifePositions.length === 0) return; // No cheese to steal

    // New mouse run: clear old timers and bump token so old callbacks become no-ops.
    const runToken = ++mouseRunToken;
    clearTimer(mouseEscapeTimerId);
    clearIntervalTimer(mouseCheeseCheckIntervalId);
    mouseEscapeTimerId = null;
    mouseCheeseCheckIntervalId = null;

    mouseEscaping = true;
    mouseHasGrabbedCheese = false;

    // Pick a random alive cheese to target
    const aliveCheeses = cheeseLifePositions
      .map((cheese, index) => ({ cheese, index }))
      .filter(item => item.cheese.alive);

    if (aliveCheeses.length === 0) return; // No alive cheese

    const randomAlive = aliveCheeses[Math.floor(Math.random() * aliveCheeses.length)];
    mouseTargetCheeseIndex = randomAlive.index;
    const targetCheese = randomAlive.cheese;

    // Calculate difficulty-adjusted animation duration
    // IMPORTANT: Capture currentLevel at spawn time to prevent it from changing during animation
    const spawnLevel = currentLevel; // Capture level at spawn time
    
    let animationDuration;
    
    if (levelMode === 'fixed') {
      // Fixed mode: duration based on level at spawn time
      animationDuration = getMouseLifespanMs(spawnLevel);
    } else {
      // Fibonacci mode: duration based on survival time (old logic)
      const survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      const difficultyFactor = Math.max(0.3, 1 - survivalSeconds / 120); // Gets harder over 2 minutes
      animationDuration = Math.floor(2500 * difficultyFactor); // 2500ms down to 750ms
    }
    
    // Ensure minimum duration of at least 500ms to prevent too-fast animals
    animationDuration = Math.max(500, animationDuration);

    // Minimal hitbox increase for faster mice
    const speedRatio = 2500 / animationDuration;
    const hitboxMultiplier = Math.pow(speedRatio, 0.3); // Extremely gentle growth
    currentMouseHitbox = HALF_HITBOX * hitboxMultiplier;

    const canvasRect = $canvas.getBoundingClientRect();

    // Target: first to the cheese, then below canvas
    const cheeseX = targetCheese.xPx;
    const cheeseY = targetCheese.yPx;
    const finalY = canvasRect.height + 100; // Go below canvas
    const targetX = cheeseX;
    const targetY = finalY;

    // Random path complexity: 2-5 control points
    const numControlPoints = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, or 5
    console.log(`Creating path with ${numControlPoints} control points`);

    // Generate control points with random offsets
    const controlPoints = [];
    for (let i = 0; i < numControlPoints; i++) {
      const ratio = (i + 1) / (numControlPoints + 1); // Distribute along path
      const offsetScale = 0.3 - (i * 0.05); // Reduce randomness for later points
      const offsetX = (Math.random() - 0.5) * canvasRect.width * offsetScale;
      const offsetY = (Math.random() - 0.5) * canvasRect.height * (offsetScale * 0.5);

      controlPoints.push({
        xPx: mousePos.xPx + (cheeseX - mousePos.xPx) * ratio + offsetX,
        yPx: mousePos.yPx + (cheeseY - mousePos.yPx) * ratio + offsetY
      });
    }

    // Adjust last control point to ensure curve goes through cheese
    // For simplicity, make the last control point close to cheese position
    const lastIdx = controlPoints.length - 1;
    controlPoints[lastIdx] = {
      xPx: cheeseX + (Math.random() - 0.5) * 30,
      yPx: cheeseY + (Math.random() - 0.5) * 30
    };

    // Store control points (pad to match expected structure)
    mouseControlPoint1 = controlPoints[0];
    mouseControlPoint2 = controlPoints[1] || controlPoints[0];
    // Store all control points for rendering
    window.mouseControlPoints = controlPoints;

    // Store animation params for render loop
    mouseTargetPos = { xPx: targetX, yPx: targetY };
    mouseEscapeStartTime = Date.now();
    mouseEscapeDuration = animationDuration;

    // Check periodically if mouse hitbox reached the cheese.
    mouseCheeseCheckIntervalId = window.setInterval(() => {
      if (runToken !== mouseRunToken || !mouseEscaping) {
        clearIntervalTimer(mouseCheeseCheckIntervalId);
        mouseCheeseCheckIntervalId = null;
        return;
      }

      const now = Date.now();
      const elapsed = now - mouseEscapeStartTime;
      const t = Math.min(1, elapsed / mouseEscapeDuration);

      // Determine current mouse position on the same curve as in render().
      let currentMouseX = mousePos.xPx;
      let currentMouseY = mousePos.yPx;
      if (mouseTargetPos && window.mouseControlPoints) {
        const points = [mousePos, ...window.mouseControlPoints, mouseTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentMouseX = pos.xPx;
        currentMouseY = pos.yPx;
      }

      // When mouse hitbox touches the targeted cheese emoji -> cheese is eaten.
      // Use a simple AABB overlap test: mouse hitbox radius + cheese half-size.
      const cheeseHalf = CHEESE_LIFE_SIZE / 2;
      const targetCheese = (mouseTargetCheeseIndex >= 0 && mouseTargetCheeseIndex < cheeseLifePositions.length)
        ? cheeseLifePositions[mouseTargetCheeseIndex]
        : null;

      const hitCheese = !!(targetCheese && targetCheese.alive) && (
        Math.abs(currentMouseX - targetCheese.xPx) <= (currentMouseHitbox + cheeseHalf) &&
        Math.abs(currentMouseY - targetCheese.yPx) <= (currentMouseHitbox + cheeseHalf)
      );

      if (!mouseHasGrabbedCheese && hitCheese) {
        // Grabbed the cheese! Immediately mark as dead and reduce lives
        mouseHasGrabbedCheese = true;
        targetCheese.alive = false;
        lives = Math.max(0, lives - 1);
        playMissSound();
        console.log(`Mouse grabbed cheese! Lives remaining: ${lives}`);

        // Check if game should end immediately
        const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;
        if (lives <= 0 || aliveCheesesCount === 0) {
          console.log('Game Over - No more lives!');
          clearIntervalTimer(mouseCheeseCheckIntervalId);
          mouseCheeseCheckIntervalId = null;
          mouseEscaping = false; // Stop animation
          endGame();
        }
      }
    }, 50);

    // After animation completes, steal cheese
    mouseEscapeTimerId = window.setTimeout(() => {
      if (runToken !== mouseRunToken) return;
      clearIntervalTimer(mouseCheeseCheckIntervalId);
      mouseCheeseCheckIntervalId = null;
      mouseEscapeTimerId = null;

      // Check if game has already ended or mouse was caught
      if (status !== 'running' || !mouseEscaping) return;

      mouseEscaping = false;
      setMouseVisible(false);

      // Steal the targeted cheese (this will check for game over)
      stealCheese();

      // Only schedule next mouse if game is still running
      if (status === 'running') {
        scheduleNextMouse();
      }
    }, animationDuration);
  }

  function stealCheese() {
    // Mark the targeted cheese as not alive (if not already marked during collision)
    if (mouseTargetCheeseIndex >= 0 && mouseTargetCheeseIndex < cheeseLifePositions.length) {
      const wasAlive = cheeseLifePositions[mouseTargetCheeseIndex].alive;

      // Only reduce lives if this cheese was still alive (prevents double-counting)
      // It might already be dead if mouse already collided with it earlier.
      if (wasAlive) {
        cheeseLifePositions[mouseTargetCheeseIndex].alive = false;
        lives = Math.max(0, lives - 1);
        console.log(`Animation completed - cheese stolen! Lives remaining: ${lives}`);
      }
    }

    updateHud();

    // Check if game should end (no more lives)
    const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;
    if (lives <= 0 || aliveCheesesCount === 0) {
      console.log('Game Over - No more lives!');
      endGame();
    }
  }

  function showRat() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      console.log('Failed to pick rat position');
      scheduleNextMouse();
      return;
    }

    console.log('Spawning rat at', pos);
    ratPos = pos;
    setRatVisible(true);

    // Start escaping immediately!
    animateRatEscape();
  }

  function animateRatEscape() {
    if (!ratVisible || !ratPos) return;
    if (cheeseLifePositions.length === 0) return; // No cheese to steal

    const runToken = ++ratRunToken;
    clearTimer(ratEscapeTimerId);
    clearIntervalTimer(ratCheeseCheckIntervalId);
    ratEscapeTimerId = null;
    ratCheeseCheckIntervalId = null;

    ratEscaping = true;
    ratHasGrabbedCheese = false;

    // Pick a random alive cheese to target
    const aliveCheeses = cheeseLifePositions
      .map((cheese, index) => ({ cheese, index }))
      .filter(item => item.cheese.alive);

    if (aliveCheeses.length === 0) return; // No alive cheese

    const randomAlive = aliveCheeses[Math.floor(Math.random() * aliveCheeses.length)];
    ratTargetCheeseIndex = randomAlive.index;
    const targetCheese = randomAlive.cheese;

    // Calculate difficulty-adjusted animation duration (1.1x faster than mouse)
    // IMPORTANT: Capture currentLevel at spawn time to prevent it from changing during animation
    const spawnLevel = currentLevel; // Capture level at spawn time
    
    let baseAnimationDuration;
    
    if (levelMode === 'fixed') {
      // Fixed mode: duration based on level at spawn time
      baseAnimationDuration = getMouseLifespanMs(spawnLevel);
    } else {
      // Fibonacci mode: duration based on survival time (old logic)
      const survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      const difficultyFactor = Math.max(0.3, 1 - survivalSeconds / 120);
      baseAnimationDuration = Math.floor(2500 * difficultyFactor);
    }
    
    let animationDuration = Math.floor(baseAnimationDuration / 1.1); // 1.1x faster
    
    // Ensure minimum duration of at least 500ms to prevent too-fast animals
    animationDuration = Math.max(500, animationDuration);

    // Minimal hitbox increase for faster rats
    const speedRatio = 2500 / animationDuration;
    const hitboxMultiplier = Math.pow(speedRatio, 0.3);
    currentRatHitbox = HALF_HITBOX * hitboxMultiplier;

    const canvasRect = $canvas.getBoundingClientRect();

    // Target: first to the cheese, then below canvas
    const cheeseX = targetCheese.xPx;
    const cheeseY = targetCheese.yPx;
    const finalY = canvasRect.height + 100;
    const targetX = cheeseX;
    const targetY = finalY;

    // Random path complexity: 2-5 control points
    const numControlPoints = Math.floor(Math.random() * 4) + 2;
    console.log(`Creating rat path with ${numControlPoints} control points`);

    // Generate control points with random offsets
    const controlPoints = [];
    for (let i = 0; i < numControlPoints; i++) {
      const ratio = (i + 1) / (numControlPoints + 1);
      const offsetScale = 0.3 - (i * 0.05);
      const offsetX = (Math.random() - 0.5) * canvasRect.width * offsetScale;
      const offsetY = (Math.random() - 0.5) * canvasRect.height * (offsetScale * 0.5);

      controlPoints.push({
        xPx: ratPos.xPx + (cheeseX - ratPos.xPx) * ratio + offsetX,
        yPx: ratPos.yPx + (cheeseY - ratPos.yPx) * ratio + offsetY
      });
    }

    // Adjust last control point to ensure curve goes through cheese
    const lastIdx = controlPoints.length - 1;
    controlPoints[lastIdx] = {
      xPx: cheeseX + (Math.random() - 0.5) * 30,
      yPx: cheeseY + (Math.random() - 0.5) * 30
    };

    // Store control points
    window.ratControlPoints = controlPoints;

    // Store animation params for render loop
    ratTargetPos = { xPx: targetX, yPx: targetY };
    ratEscapeStartTime = Date.now();
    ratEscapeDuration = animationDuration;

    // Check periodically if rat hitbox reached the cheese
    ratCheeseCheckIntervalId = window.setInterval(() => {
      if (runToken !== ratRunToken || !ratEscaping) {
        clearIntervalTimer(ratCheeseCheckIntervalId);
        ratCheeseCheckIntervalId = null;
        return;
      }

      const now = Date.now();
      const elapsed = now - ratEscapeStartTime;
      const t = Math.min(1, elapsed / ratEscapeDuration);

      // Determine current rat position on the curve
      let currentRatX = ratPos.xPx;
      let currentRatY = ratPos.yPx;
      if (ratTargetPos && window.ratControlPoints) {
        const points = [ratPos, ...window.ratControlPoints, ratTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentRatX = pos.xPx;
        currentRatY = pos.yPx;
      }

      // When rat hitbox touches the targeted cheese emoji -> cheese is eaten
      const cheeseHalf = CHEESE_LIFE_SIZE / 2;
      const targetCheese = (ratTargetCheeseIndex >= 0 && ratTargetCheeseIndex < cheeseLifePositions.length)
        ? cheeseLifePositions[ratTargetCheeseIndex]
        : null;

      const hitCheese = !!(targetCheese && targetCheese.alive) && (
        Math.abs(currentRatX - targetCheese.xPx) <= (currentRatHitbox + cheeseHalf) &&
        Math.abs(currentRatY - targetCheese.yPx) <= (currentRatHitbox + cheeseHalf)
      );

      if (!ratHasGrabbedCheese && hitCheese) {
        ratHasGrabbedCheese = true;
        targetCheese.alive = false;
        lives = Math.max(0, lives - 1);
        playMissSound();
        console.log(`Rat grabbed cheese! Lives remaining: ${lives}`);

        const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;
        if (lives <= 0 || aliveCheesesCount === 0) {
          console.log('Game Over - No more lives!');
          clearIntervalTimer(ratCheeseCheckIntervalId);
          ratCheeseCheckIntervalId = null;
          ratEscaping = false;
          endGame();
        }
      }
    }, 50);

    // After animation completes, steal cheese
    ratEscapeTimerId = window.setTimeout(() => {
      if (runToken !== ratRunToken) return;
      clearIntervalTimer(ratCheeseCheckIntervalId);
      ratCheeseCheckIntervalId = null;
      ratEscapeTimerId = null;

      if (status !== 'running' || !ratEscaping) return;

      ratEscaping = false;
      setRatVisible(false);

      // Steal the targeted cheese
      stealCheeseForRat();

      if (status === 'running') {
        scheduleNextMouse();
      }
    }, animationDuration);
  }

  function stealCheeseForRat() {
    // Mark the targeted cheese as not alive
    if (ratTargetCheeseIndex >= 0 && ratTargetCheeseIndex < cheeseLifePositions.length) {
      const wasAlive = cheeseLifePositions[ratTargetCheeseIndex].alive;

      if (wasAlive) {
        cheeseLifePositions[ratTargetCheeseIndex].alive = false;
        lives = Math.max(0, lives - 1);
        console.log(`Rat animation completed - cheese stolen! Lives remaining: ${lives}`);
      }
    }

    updateHud();

    // Check if game should end
    const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;
    if (lives <= 0 || aliveCheesesCount === 0) {
      console.log('Game Over - No more lives!');
      endGame();
    }
  }

  function showLizard() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      console.log('Failed to pick lizard position');
      scheduleNextMouse();
      return;
    }

    console.log('Spawning lizard at', pos);
    lizardPos = pos;
    setLizardVisible(true);

    // Start escaping immediately!
    animateLizardEscape();
  }

  function animateLizardEscape() {
    if (!lizardVisible || !lizardPos) return;
    if (cheeseLifePositions.length === 0) return; // No cheese to target

    const runToken = ++lizardRunToken;
    clearTimer(lizardEscapeTimerId);
    lizardEscapeTimerId = null;

    lizardEscaping = true;

    // Pick a random alive cheese to target (but won't eat it)
    const aliveCheeses = cheeseLifePositions
      .map((cheese, index) => ({ cheese, index }))
      .filter(item => item.cheese.alive);

    if (aliveCheeses.length === 0) return; // No alive cheese

    const randomAlive = aliveCheeses[Math.floor(Math.random() * aliveCheeses.length)];
    const targetCheese = randomAlive.cheese;

    // Calculate difficulty-adjusted animation duration (same speed as mouse)
    // IMPORTANT: Capture currentLevel at spawn time to prevent it from changing during animation
    const spawnLevel = currentLevel; // Capture level at spawn time
    
    let animationDuration;
    
    if (levelMode === 'fixed') {
      // Fixed mode: duration based on level at spawn time
      animationDuration = getMouseLifespanMs(spawnLevel);
    } else {
      // Fibonacci mode: duration based on survival time (old logic)
      const survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      const difficultyFactor = Math.max(0.3, 1 - survivalSeconds / 120);
      animationDuration = Math.floor(2500 * difficultyFactor);
    }
    
    // Ensure minimum duration of at least 500ms to prevent too-fast animals
    animationDuration = Math.max(500, animationDuration);

    // Minimal hitbox increase
    const speedRatio = 2500 / animationDuration;
    const hitboxMultiplier = Math.pow(speedRatio, 0.3);
    currentLizardHitbox = HALF_HITBOX * hitboxMultiplier;

    const canvasRect = $canvas.getBoundingClientRect();

    // Target: towards the cheese, then below canvas (but doesn't eat cheese)
    const cheeseX = targetCheese.xPx;
    const cheeseY = targetCheese.yPx;
    const finalY = canvasRect.height + 100;
    const targetX = cheeseX;
    const targetY = finalY;

    // Random path complexity: 2-5 control points
    const numControlPoints = Math.floor(Math.random() * 4) + 2;
    console.log(`Creating lizard path with ${numControlPoints} control points`);

    // Generate control points with random offsets
    const controlPoints = [];
    for (let i = 0; i < numControlPoints; i++) {
      const ratio = (i + 1) / (numControlPoints + 1);
      const offsetScale = 0.3 - (i * 0.05);
      const offsetX = (Math.random() - 0.5) * canvasRect.width * offsetScale;
      const offsetY = (Math.random() - 0.5) * canvasRect.height * (offsetScale * 0.5);

      controlPoints.push({
        xPx: lizardPos.xPx + (cheeseX - lizardPos.xPx) * ratio + offsetX,
        yPx: lizardPos.yPx + (cheeseY - lizardPos.yPx) * ratio + offsetY
      });
    }

    // Adjust last control point to ensure curve goes through cheese area
    const lastIdx = controlPoints.length - 1;
    controlPoints[lastIdx] = {
      xPx: cheeseX + (Math.random() - 0.5) * 30,
      yPx: cheeseY + (Math.random() - 0.5) * 30
    };

    // Store control points
    window.lizardControlPoints = controlPoints;

    // Store animation params for render loop
    lizardTargetPos = { xPx: targetX, yPx: targetY };
    lizardEscapeStartTime = Date.now();
    lizardEscapeDuration = animationDuration;

    // After animation completes, lizard disappears (doesn't steal cheese)
    lizardEscapeTimerId = window.setTimeout(() => {
      if (runToken !== lizardRunToken) return;
      lizardEscapeTimerId = null;
      if (status !== 'running' || !lizardEscaping) return;

      lizardEscaping = false;
      setLizardVisible(false);

      // Schedule next spawn
      if (status === 'running') {
        scheduleNextMouse();
      }
    }, animationDuration);
  }

  function showBee() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      console.log('Failed to pick bee position');
      scheduleNextMouse();
      return;
    }

    console.log('Spawning bee at', pos);
    beePos = pos;
    setBeeVisible(true);

    // Start escaping immediately!
    animateBeeEscape();
  }

  function animateBeeEscape() {
    if (!beeVisible || !beePos) return;
    if (cheeseLifePositions.length === 0) return; // No cheese to target

    const runToken = ++beeRunToken;
    clearTimer(beeEscapeTimerId);
    beeEscapeTimerId = null;

    beeEscaping = true;

    // Pick a random alive cheese to target (but won't eat it)
    const aliveCheeses = cheeseLifePositions
      .map((cheese, index) => ({ cheese, index }))
      .filter(item => item.cheese.alive);

    if (aliveCheeses.length === 0) return; // No alive cheese

    const randomAlive = aliveCheeses[Math.floor(Math.random() * aliveCheeses.length)];
    const targetCheese = randomAlive.cheese;

    // Calculate difficulty-adjusted animation duration (same speed as mouse)
    // IMPORTANT: Capture currentLevel at spawn time to prevent it from changing during animation
    const spawnLevel = currentLevel; // Capture level at spawn time
    
    let animationDuration;
    
    if (levelMode === 'fixed') {
      // Fixed mode: duration based on level at spawn time
      animationDuration = getMouseLifespanMs(spawnLevel);
    } else {
      // Fibonacci mode: duration based on survival time (old logic)
      const survivalSeconds = Math.floor((Date.now() - gameStartMs + survivalTimeMs) / 1000);
      const difficultyFactor = Math.max(0.3, 1 - survivalSeconds / 120);
      animationDuration = Math.floor(2500 * difficultyFactor);
    }
    
    // Ensure minimum duration of at least 500ms to prevent too-fast animals
    animationDuration = Math.max(500, animationDuration);

    // Minimal hitbox increase
    const speedRatio = 2500 / animationDuration;
    const hitboxMultiplier = Math.pow(speedRatio, 0.3);
    currentBeeHitbox = HALF_HITBOX * hitboxMultiplier;

    const canvasRect = $canvas.getBoundingClientRect();

    // Target: towards the cheese, then below canvas (but doesn't eat cheese)
    const cheeseX = targetCheese.xPx;
    const cheeseY = targetCheese.yPx;
    const finalY = canvasRect.height + 100;
    const targetX = cheeseX;
    const targetY = finalY;

    // Random path complexity: 2-5 control points
    const numControlPoints = Math.floor(Math.random() * 4) + 2;
    console.log(`Creating bee path with ${numControlPoints} control points`);

    // Generate control points with random offsets
    const controlPoints = [];
    for (let i = 0; i < numControlPoints; i++) {
      const ratio = (i + 1) / (numControlPoints + 1);
      const offsetScale = 0.3 - (i * 0.05);
      const offsetX = (Math.random() - 0.5) * canvasRect.width * offsetScale;
      const offsetY = (Math.random() - 0.5) * canvasRect.height * (offsetScale * 0.5);

      controlPoints.push({
        xPx: beePos.xPx + (cheeseX - beePos.xPx) * ratio + offsetX,
        yPx: beePos.yPx + (cheeseY - beePos.yPx) * ratio + offsetY
      });
    }

    // Adjust last control point to ensure curve goes through cheese area
    const lastIdx = controlPoints.length - 1;
    controlPoints[lastIdx] = {
      xPx: cheeseX + (Math.random() - 0.5) * 30,
      yPx: cheeseY + (Math.random() - 0.5) * 30
    };

    // Store control points
    window.beeControlPoints = controlPoints;

    // Store animation params for render loop
    beeTargetPos = { xPx: targetX, yPx: targetY };
    beeEscapeStartTime = Date.now();
    beeEscapeDuration = animationDuration;

    // After animation completes, bee disappears (doesn't steal cheese)
    beeEscapeTimerId = window.setTimeout(() => {
      if (runToken !== beeRunToken) return;
      beeEscapeTimerId = null;
      if (status !== 'running' || !beeEscaping) return;

      beeEscaping = false;
      setBeeVisible(false);

      // Schedule next spawn
      if (status === 'running') {
        scheduleNextMouse();
      }
    }, animationDuration);
  }

  function spawnPuffEffect(xPx, yPx) {
    effects.push({ type: 'puff', xPx, yPx, startMs: Date.now(), durationMs: 320 });
  }

  function spawnScoreEffect(xPx, yPx, text = '+1') {
    effects.push({ type: 'score', xPx, yPx, text, startMs: Date.now(), durationMs: 520 });
  }

  function spawnRecordEffect(xPx, yPx, text, color) {
    effects.push({ type: 'record', xPx, yPx, text, color, startMs: Date.now(), durationMs: 800 });
  }

  function spawnPenaltyEffect(xPx, yPx, text = '-1') {
    effects.push({ type: 'penalty', xPx, yPx, text, startMs: Date.now(), durationMs: 520 });
  }

  function showCheese() {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;

    const pos = pickRandomMousePosition();
    if (!pos) {
      console.log('Failed to pick cheese position');
      return;
    }

    console.log('Spawning cheese at', pos);
    cheesePos = pos;
    setCheeseVisible(true);

    const showMs = randomIntInclusive(2000, 4000);
    clearTimer(cheeseHideTimerId);
    cheeseHideTimerId = window.setTimeout(() => {
      hideCheeseAndReschedule();
    }, showMs);
  }

  function hideCheeseAndReschedule() {
    if (status !== 'running') {
      setCheeseVisible(false);
      return;
    }

    // Cheese just disappears, no penalty
    setCheeseVisible(false);

    // Schedule next spawn
    scheduleNextMouse();
  }

  function startGame(continueFromSaved = false) {
    updateOrientationOverlay();
    if (!isOrientationAllowed()) return;

    clearAllTimers();
    clearConfetti();
    hideCat();

    score = 0;
    bestScoreAtRoundStart = bestScore;
    bestTimeAtRoundStart = bestTime;
    savedLevelAtRoundStart = savedLevel;
    recordScoreShown = false;
    recordLevelShown = false;
    recordTimeShown = false;
    scoreRecordBeaten = false;
    levelRecordBeaten = false;
    timeRecordBeaten = false;
    // Remove highlight classes when starting new game
    if ($bestScoreCard) $bestScoreCard.classList.remove('highlighted', 'highlightedScore');
    if ($savedLevelCard) $savedLevelCard.classList.remove('highlighted');
    if ($timeCard) $timeCard.classList.remove('highlighted', 'highlightedTime');
    status = 'running';
    unlockAudio();

    if (continueFromSaved && savedLevel > 0) {
      // Start from saved level
      currentLevel = savedLevel;
      const levelTimeSeconds = getLevelTimeSeconds(savedLevel);
      survivalTimeMs = levelTimeSeconds * 1000;
    } else {
      // Start fresh
      currentLevel = 1;
      survivalTimeMs = 0;
    }

    gameStartMs = Date.now();
    pausedSurvivalMs = 0;
    isUserPaused = false;
    lives = INITIAL_LIVES;
    resetCheeseLifeStates(); // Reset cheese life states

    setMouseVisible(false);
    setRatVisible(false);
    setLizardVisible(false);
    setBeeVisible(false);
    setCheeseVisible(false);

    setOverlay($startOverlay, false);
    setOverlay($endOverlay, false);
    setOverlay($pauseOverlay, false);
    closeHistory();
    closeSettings();

    if ($pauseBtn) $pauseBtn.style.display = 'block';
    if ($settingsBtn) $settingsBtn.style.display = 'none';
    updateHud();
    startTick();
    scheduleNextMouse();
  }

  function endGame() {
    if (status === 'ended' || status === 'idle') return;

    clearAllTimers();
    setMouseVisible(false);
    setRatVisible(false);
    setLizardVisible(false);
    setBeeVisible(false);
    setCheeseVisible(false);

    status = 'ended';

    const endedWithRecord = scoreRecordBeaten || levelRecordBeaten || timeRecordBeaten;
    if ($endTitle) {
      $endTitle.textContent = endedWithRecord ? 'Игра окончена с рекордом!' : 'Игра окончена!';
      // If only one record type was beaten, tint the title accordingly; otherwise keep golden.
      const typesCount = (scoreRecordBeaten ? 1 : 0) + (timeRecordBeaten ? 1 : 0) + (levelRecordBeaten ? 1 : 0);
      const useScore = endedWithRecord && typesCount === 1 && scoreRecordBeaten;
      const useTime = endedWithRecord && typesCount === 1 && timeRecordBeaten;
      $endTitle.classList.toggle('titleRecord', endedWithRecord && !useScore && !useTime);
      $endTitle.classList.toggle('titleRecordScore', useScore);
      $endTitle.classList.toggle('titleRecordTime', useTime);
    }
    if (endedWithRecord) {
      playEndWithRecordSound();
      spawnEndConfetti();
    } else {
      clearConfetti();
    }

    // Calculate final survival time and level
    const finalSurvivalMs = Date.now() - gameStartMs + survivalTimeMs;
    const finalSurvivalSeconds = Math.floor(finalSurvivalMs / 1000);
    const finalLevel = calculateLevel(finalSurvivalSeconds);

    survivalTimeMs = finalSurvivalMs;
    currentLevel = finalLevel;

    // Save level progress if improved
    if (finalLevel > savedLevel) {
      saveLevelProgress(finalLevel);
    }

    // Save best score if improved
    if (bestScore > bestScoreAtRoundStart) saveBestScore();
    // Save best time if improved
    if (bestTime > bestTimeAtRoundStart) saveBestTime();

    history.unshift({
      ts: Date.now(),
      score,
      survivalSeconds: finalSurvivalSeconds,
      level: finalLevel,
      isBestScore: score > bestScoreAtRoundStart,
      isBestLevel: finalLevel > savedLevelAtRoundStart,
      isBestTime: finalSurvivalSeconds > bestTimeAtRoundStart,
    });
    history = history.slice(0, HISTORY_LIMIT);
    saveHistory();

    $finalTime.textContent = String(finalSurvivalSeconds);
    $finalLevel.textContent = String(finalLevel);
    $finalScore.textContent = String(score);
    $finalBest.textContent = String(bestScore);
    if ($finalBestTime) $finalBestTime.textContent = String(bestTime);

    updateHud();
    updateEndOverlay();
    if ($pauseBtn) $pauseBtn.style.display = 'none';
    if ($settingsBtn) $settingsBtn.style.display = 'block';
    setOverlay($endOverlay, true);
  }

  function resetToIdle() {
    clearAllTimers();
    clearConfetti();
    setMouseVisible(false);
    setRatVisible(false);
    setLizardVisible(false);
    setBeeVisible(false);
    setCheeseVisible(false);
    hideCat();

    status = 'idle';
    score = 0;
    lives = INITIAL_LIVES;
    currentLevel = 1;
    survivalTimeMs = 0;
    pausedSurvivalMs = 0;
    isUserPaused = false;
    recordScoreShown = false;
    recordLevelShown = false;
    recordTimeShown = false;
    scoreRecordBeaten = false;
    levelRecordBeaten = false;
    timeRecordBeaten = false;
    // Remove highlight classes when resetting to idle
    if ($bestScoreCard) $bestScoreCard.classList.remove('highlighted', 'highlightedScore');
    if ($savedLevelCard) $savedLevelCard.classList.remove('highlighted');
    if ($timeCard) $timeCard.classList.remove('highlighted', 'highlightedTime');
    resetCheeseLifeStates(); // Reset cheese life states

    setOverlay($endOverlay, false);
    setOverlay($pauseOverlay, false);
    setOverlay($startOverlay, true);
    if ($pauseBtn) $pauseBtn.style.display = 'none';
    if ($settingsBtn) $settingsBtn.style.display = 'block';
    updateStartOverlay();
    closeHistory();
    closeSettings();
    updateHud();
  }

  function pointInHitbox(clickX, clickY, targetX, targetY, hitboxRadius) {
    return (
      Math.abs(clickX - targetX) <= hitboxRadius &&
      Math.abs(clickY - targetY) <= hitboxRadius
    );
  }

  function pointInMouseHitbox(xPx, yPx) {
    if (!mouseVisible || !mousePos) return false;
    return pointInHitbox(xPx, yPx, mousePos.xPx, mousePos.yPx, currentMouseHitbox);
  }

  function pointInCheeseHitbox(xPx, yPx) {
    if (!cheeseVisible || !cheesePos) return false;
    return pointInHitbox(xPx, yPx, cheesePos.xPx, cheesePos.yPx, HALF_HITBOX);
  }

  function onPointerDown(ev) {
    if (status !== 'running') return;
    if (!isOrientationAllowed()) return;
    unlockAudio();

    const rect = $canvas.getBoundingClientRect();
    const xPx = ev.clientX - rect.left;
    const yPx = ev.clientY - rect.top;

    // Кот всегда один: просто переносим в последнюю точку.
    setCatVisibleAt(xPx, yPx);

    // Check if caught escaping mouse (use bezier curve interpolated position)
    if (mouseEscaping && mouseVisible) {
      let currentMouseX = mousePos.xPx;
      let currentMouseY = mousePos.yPx;

      if (mouseTargetPos && window.mouseControlPoints) {
        const now = Date.now();
        const elapsed = now - mouseEscapeStartTime;
        const t = Math.min(1, elapsed / mouseEscapeDuration);

        // Generalized Bezier curve (matches render loop)
        const points = [mousePos, ...window.mouseControlPoints, mouseTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentMouseX = pos.xPx;
        currentMouseY = pos.yPx;
      }

      if (pointInHitbox(xPx, yPx, currentMouseX, currentMouseY, currentMouseHitbox)) {
        score += 1;
        playHitSound();
        // Hit effects (match old UI): 💥 + floating +1 at mouse position.
        spawnPuffEffect(currentMouseX, currentMouseY);
        spawnScoreEffect(currentMouseX, currentMouseY - 36, '+1');
        if (score > bestScore) {
          bestScore = score;
        }
        // Check if score record was beaten (skip if this is the first game)
        if (!recordScoreShown && score > bestScoreAtRoundStart && bestScoreAtRoundStart > 0) {
          recordScoreShown = true;
          scoreRecordBeaten = true;
          playRecordSound();
          spawnRecordEffect(currentMouseX, currentMouseY - 70, 'Рекорд очков!', 'rgba(150, 255, 180, 0.95)');
          if ($bestScoreCard) $bestScoreCard.classList.add('highlightedScore');
        }
        updateHud();

        // Caught the escaping mouse!
        mouseEscaping = false;
        setMouseVisible(false);
        scheduleNextMouse();
        ev.preventDefault?.();
        return;
      }
    }

    // Check if caught escaping rat (use bezier curve interpolated position)
    if (ratEscaping && ratVisible) {
      let currentRatX = ratPos.xPx;
      let currentRatY = ratPos.yPx;

      if (ratTargetPos && window.ratControlPoints) {
        const now = Date.now();
        const elapsed = now - ratEscapeStartTime;
        const t = Math.min(1, elapsed / ratEscapeDuration);

        // Generalized Bezier curve (matches render loop)
        const points = [ratPos, ...window.ratControlPoints, ratTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentRatX = pos.xPx;
        currentRatY = pos.yPx;
      }

      if (pointInHitbox(xPx, yPx, currentRatX, currentRatY, currentRatHitbox)) {
        score += 3; // Rat gives +3 points
        playHitSound();
        // Hit effects: 💥 + floating +3 at rat position.
        spawnPuffEffect(currentRatX, currentRatY);
        spawnScoreEffect(currentRatX, currentRatY - 36, '+3');
        if (score > bestScore) {
          bestScore = score;
        }
        // Check if score record was beaten (skip if this is the first game)
        if (!recordScoreShown && score > bestScoreAtRoundStart && bestScoreAtRoundStart > 0) {
          recordScoreShown = true;
          scoreRecordBeaten = true;
          playRecordSound();
          spawnRecordEffect(currentRatX, currentRatY - 70, 'Рекорд очков!', 'rgba(150, 255, 180, 0.95)');
          if ($bestScoreCard) $bestScoreCard.classList.add('highlightedScore');
        }
        updateHud();

        // Caught the escaping rat!
        ratEscaping = false;
        setRatVisible(false);
        scheduleNextMouse();
        ev.preventDefault?.();
        return;
      }
    }

    // Check if caught escaping lizard (use bezier curve interpolated position)
    if (lizardEscaping && lizardVisible) {
      let currentLizardX = lizardPos.xPx;
      let currentLizardY = lizardPos.yPx;

      if (lizardTargetPos && window.lizardControlPoints) {
        const now = Date.now();
        const elapsed = now - lizardEscapeStartTime;
        const t = Math.min(1, elapsed / lizardEscapeDuration);

        // Generalized Bezier curve (matches render loop)
        const points = [lizardPos, ...window.lizardControlPoints, lizardTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentLizardX = pos.xPx;
        currentLizardY = pos.yPx;
      }

      if (pointInHitbox(xPx, yPx, currentLizardX, currentLizardY, currentLizardHitbox)) {
        score -= 1; // Lizard gives -1 points (penalty)
        playLizardSound();
        // Hit effects: 💥 + floating -1 at lizard position.
        spawnPuffEffect(currentLizardX, currentLizardY);
        spawnPenaltyEffect(currentLizardX, currentLizardY - 36, '-1');
        updateHud();

        // Caught the escaping lizard!
        lizardEscaping = false;
        setLizardVisible(false);
        scheduleNextMouse();
        ev.preventDefault?.();
        return;
      }
    }

    // Check if caught escaping bee (use bezier curve interpolated position)
    if (beeEscaping && beeVisible) {
      let currentBeeX = beePos.xPx;
      let currentBeeY = beePos.yPx;

      if (beeTargetPos && window.beeControlPoints) {
        const now = Date.now();
        const elapsed = now - beeEscapeStartTime;
        const t = Math.min(1, elapsed / beeEscapeDuration);

        // Generalized Bezier curve (matches render loop)
        const points = [beePos, ...window.beeControlPoints, beeTargetPos];

        function bezierPoint(pts, t) {
          if (pts.length === 1) return pts[0];
          const newPts = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newPts.push({
              xPx: (1 - t) * pts[i].xPx + t * pts[i + 1].xPx,
              yPx: (1 - t) * pts[i].yPx + t * pts[i + 1].yPx
            });
          }
          return bezierPoint(newPts, t);
        }

        const pos = bezierPoint(points, t);
        currentBeeX = pos.xPx;
        currentBeeY = pos.yPx;
      }

      if (pointInHitbox(xPx, yPx, currentBeeX, currentBeeY, currentBeeHitbox)) {
        score -= 3; // Bee gives -3 points (penalty)
        playBeeSound();
        // Hit effects: 💥 + floating -3 at bee position.
        spawnPuffEffect(currentBeeX, currentBeeY);
        spawnPenaltyEffect(currentBeeX, currentBeeY - 36, '-3');
        updateHud();

        // Caught the escaping bee!
        beeEscaping = false;
        setBeeVisible(false);
        scheduleNextMouse();
        ev.preventDefault?.();
        return;
      }
    }

    // Check if caught cheese (restore life)
    if (pointInCheeseHitbox(xPx, yPx)) {
      // Count actual alive cheeses
      const aliveCheesesCount = cheeseLifePositions.filter(c => c.alive).length;

      if (aliveCheesesCount < MAX_LIVES) {
        // Find first dead cheese position and restore it
        for (let i = 0; i < cheeseLifePositions.length; i++) {
          if (!cheeseLifePositions[i].alive) {
            cheeseLifePositions[i].alive = true;
            lives++;
            playCheeseSound();
            console.log(`Restored cheese at position ${i}, lives now: ${lives}`);
            break;
          }
        }

        updateHud();
      }

      // Cheese caught: hide immediately and schedule next spawn
      clearTimer(cheeseHideTimerId);
      cheeseHideTimerId = null;
      setCheeseVisible(false);
      scheduleNextMouse();
    }

    ev.preventDefault?.();
  }

  function bindEvents() {
    $startBtn.addEventListener('click', () => startGame(false));
    $continueBtn.addEventListener('click', () => startGame(true));
    $restartBtn.addEventListener('click', () => startGame(false));
    if ($continueBtnEnd) $continueBtnEnd.addEventListener('click', () => startGame(true));

    if ($pauseBtn) $pauseBtn.addEventListener('click', () => pauseGameByUser());
    if ($resumeBtn) $resumeBtn.addEventListener('click', () => resumeGameByUser());
    if ($endGameBtn) $endGameBtn.addEventListener('click', () => endGameFromPause());

    if ($historyBtnStart) $historyBtnStart.addEventListener('click', () => openHistory());
    if ($historyBtnEnd) $historyBtnEnd.addEventListener('click', () => openHistory());
    if ($historyCloseBtn) $historyCloseBtn.addEventListener('click', () => closeHistory());
    if ($historyResetRecordsBtn) $historyResetRecordsBtn.addEventListener('click', () => resetRecords());
    if ($historyOverlay) {
      $historyOverlay.addEventListener('click', (ev) => {
        if (ev.target === $historyOverlay) closeHistory();
      });
    }

    if ($settingsBtn) $settingsBtn.addEventListener('click', () => openSettings());
    if ($settingsCloseBtn) $settingsCloseBtn.addEventListener('click', () => closeSettings());
    if ($resetSettingsBtn) $resetSettingsBtn.addEventListener('click', () => resetSettings());
    if ($settingsOverlay) {
      $settingsOverlay.addEventListener('click', (ev) => {
        if (ev.target === $settingsOverlay) closeSettings();
      });
    }

    // Prevent double-tap zoom on iOS Safari
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // Pointer Events on canvas
    $canvas.addEventListener('pointerdown', onPointerDown, { passive: false });

    window.addEventListener('resize', () => {
      syncHudHeightVar();
      setupCanvas(); // Resize canvas
      updateOrientationOverlay();

      // При ресайзе безопасно скрыть мышь, крысу, ящерицу, пчелу и сыр и продолжить цикл.
      if (status === 'running') {
        setMouseVisible(false);
        setRatVisible(false);
        setLizardVisible(false);
        setBeeVisible(false);
        setCheeseVisible(false);
        clearTimer(cheeseHideTimerId);
        cheeseHideTimerId = null;
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
    syncHudHeightVar();
    setupCanvas();
    loadBestScore();
    loadBestTime();
    loadSavedLevel();
    loadLevelMode();
    loadSoundEnabled();
    loadSpeedDecrease();
    loadHistory();
    updateStartOverlay();
    updateHud();
    bindEvents();
    initSegmentedControl();
    initSpeedDecreaseInput();
    updateOrientationOverlay();
    if ($pauseBtn) $pauseBtn.style.display = 'none';
    if ($settingsBtn) $settingsBtn.style.display = 'block';
    render(); // Start render loop

    // Second pass after first paint (fonts/layout) to avoid tiny drift.
    requestAnimationFrame(() => {
      syncHudHeightVar();
      setupCanvas();
    });

    // Если вкладка скрыта — поставим игру на паузу (без усложнения таймингов мыши).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        if (status === 'running') {
          if (!isUserPaused) {
            pausedSurvivalMs = Date.now() - gameStartMs;
            clearAllTimers();
            setMouseVisible(false);
            setRatVisible(false);
            setLizardVisible(false);
            setBeeVisible(false);
            setCheeseVisible(false);
            status = 'paused';
            updateHud();
          }
        }
        return;
      }

      // Возврат: возобновим, только если ориентация разрешена и не пользовательская пауза.
      if (status === 'paused' && !isUserPaused) {
        resumeGameAfterOrientation();
      }
    });
  }

  init();
})();
