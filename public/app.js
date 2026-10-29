// app.js — Escape Room: Data Edition (Full V3 Engine)
// Adaptive difficulty, Leaderboard, Web Audio SFX, Canvas Card, Topic Profile, Auth.
// All local state is kept in memory; no localStorage/sessionStorage is used.

// ═══════════════════════════════════════════════════
// CONSTANTS & GAME SETTINGS
// ═══════════════════════════════════════════════════

const TIMER_DURATION     = 20;   // seconds per question
const MAX_LIVES          = 3;
const QUESTIONS_PER_ROOM = 5;    // exactly 5 adaptive questions served per room
const BASE_POINTS        = 10;   // points per correct easy question (before multipliers)
const HINT_COST          = 5;    // points deducted when hint is used

// Streak multipliers
const STREAK_X2 = 3;
const STREAK_X3 = 5;

// Speed bonus tiers (seconds elapsed when answered)
const SPEED_TIERS = [
  { maxSec: 5,  bonus: 10 },
  { maxSec: 12, bonus: 5  },
  { maxSec: 20, bonus: 0  },
];

// Room unlock progression rules
const UNLOCK_RULES = {
  'statistics-lab':   { prev: 'algorithm-vault', minCorrect: 3 },
  'database-dungeon': { prev: 'statistics-lab',  minCorrect: 3 },
};

// Immersive two-sentence narratives for the Room Intro Screen
const ROOM_INTROS = {
  'algorithm-vault': {
    title: 'The Algorithm Vault',
    icon: '⚙️',
    story: 'Heavy iron gears grind behind ancient stone pillars as the vault seals shut. The labyrinth analyzes your moves, tuning its puzzles to test your deepest algorithmic intuition.'
  },
  'statistics-lab': {
    title: 'The Statistics Lab',
    icon: '📊',
    story: 'Flickering fluorescent tubes illuminate chalkboards covered in distributions and probability curves. A cold synthetic voice challenges you to prove your data is no mere outlier.'
  },
  'database-dungeon': {
    title: 'The Database Dungeon',
    icon: '🗄️',
    story: 'Massive relational server monoliths hum in the subterranean dark, bound by locks of foreign keys and transactions. Only a master query can shatter the chains and secure your escape.'
  }
};

// Two-line victory narratives shown upon completing a room
const ROOM_NARRATIVES = {
  'algorithm-vault': [
    'The vault door groans and swings open with a metallic roar...',
    'Binary trees scatter like autumn leaves. You step deeper into the data labyrinth.'
  ],
  'statistics-lab': [
    'The fluorescent lights flicker, hum, and die.',
    'Your statistical precision shattered every probability lock. The dungeon looms ahead.'
  ],
  'database-dungeon': [
    'The final query resolves. Chains of data dissolve into blinding light.',
    'You have mastered the data labyrinth. No table, key, or join can hold you now.'
  ],
};

// Final screen titles based on total points
const FINAL_TITLES = [
  { min: 350, icon: '🏆', title: 'Master Escapist',  msg: 'Unbelievable! You conquered the labyrinth with master precision.' },
  { min: 250, icon: '🥈', title: 'Clever Explorer',  msg: 'Sharp instincts and solid knowledge — a truly impressive escape!' },
  { min: 150, icon: '🧩', title: 'Puzzle Solver',    msg: 'Good effort! A bit more practice and you will conquer every room.' },
  { min: 0,   icon: '💡', title: 'Keep Practicing', msg: 'Every expert was once a beginner. Return to the labyrinth and try again!' },
];

// ═══════════════════════════════════════════════════
// ANALYTICS & SESSION IDENTIFICATION
// ═══════════════════════════════════════════════════

// One anonymous session ID per page load (in memory only)
const SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

let questionStartTime  = 0;
let roomCompleteLogged = false;

// ═══════════════════════════════════════════════════
// GLOBAL STATE (In-Memory Only)
// ═══════════════════════════════════════════════════

const state = {
  // Theme & Sound
  theme: 'dark',
  isMuted: false,

  // User Auth
  currentUser: null, // { id, username } if signed in

  // Room progression
  completedRooms: {}, // roomId -> { correct, points, livesLeft }
  skipUnlock: false,

  // Active room session
  pendingRoom: null,         // room awaiting Enter Room click
  currentRoom: null,         // room object being played
  servedQuestionTexts: new Set(), // question texts already served in this room
  currentQuestion: null,     // question object currently displayed
  currentQuestionNumber: 0,  // 1 to 5
  consecutiveCorrect: 0,     // for adaptive difficulty rule (>=2 => hard, wrong => 0 => easy)
  sessionCorrect: 0,
  sessionPoints: 0,
  lives: MAX_LIVES,
  streak: 0,
  answered: false,
  hintUsed: false,

  // Topic profile tracking (browser-only session memory)
  topicStats: {}, // { [topic]: { total: 0, correct: 0 } }

  // Timer
  timerInterval: null,
  timerTick: 0,

  // Active Leaderboard Tab
  activeLbRoom: 'algorithm-vault'
};

// ═══════════════════════════════════════════════════
// WEB AUDIO API SOUND EFFECTS (Feature 6)
// ═══════════════════════════════════════════════════

let audioCtx = null;

/** Lazily initialize AudioContext on user interaction */
function getAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Short high tone for correct answers */
function playCorrectSound() {
  if (state.isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

/** Low tone for wrong answers */
function playWrongSound() {
  if (state.isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.linearRampToValueAtTime(140, now + 0.22);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

/** Rising triumphant arpeggio for room completion */
function playVictorySound() {
  if (state.isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, i) => {
    const now = ctx.currentTime + i * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  });
}

// ═══════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════

const screens = {
  home:   document.getElementById('screen-home'),
  intro:  document.getElementById('screen-intro'),
  quiz:   document.getElementById('screen-quiz'),
  result: document.getElementById('screen-result'),
  final:  document.getElementById('screen-final'),
};

// Global Top Bar
const authNavArea     = document.getElementById('auth-nav-area');
const btnSoundToggle  = document.getElementById('btn-sound-toggle');
const soundIcon       = document.getElementById('sound-icon');
const btnThemeToggle  = document.getElementById('btn-theme-toggle');
const themeIcon       = document.getElementById('theme-icon');

// Home
const roomGrid        = document.getElementById('room-grid');
const overallProgress = document.getElementById('overall-progress');
const skipUnlockLink  = document.getElementById('skip-unlock-link');

// Leaderboard
const lbTabs          = document.querySelectorAll('.lb-tab-btn');
const lbLoading       = document.getElementById('lb-loading');
const lbError         = document.getElementById('lb-error');
const lbTable         = document.getElementById('lb-table');
const lbTableBody     = document.getElementById('lb-table-body');

// Room Intro Modal
const introRoomIcon   = document.getElementById('intro-room-icon');
const introRoomTitle  = document.getElementById('intro-room-title');
const introStoryText  = document.getElementById('intro-story-text');
const btnEnterRoom    = document.getElementById('btn-enter-room');
const btnIntroCancel  = document.getElementById('btn-intro-cancel');

// Quiz
const quizScreenEl    = document.getElementById('screen-quiz');
const quizRoomTitle   = document.getElementById('quiz-room-title');
const quizProgress    = document.getElementById('quiz-progress');
const levelBadge      = document.getElementById('question-level-badge');
const topicBadge      = document.getElementById('question-topic-badge');
const progressFill    = document.getElementById('progress-bar-fill');
const timerFill       = document.getElementById('timer-bar-fill');
const livesDisplay    = document.getElementById('lives-display');
const streakBadge     = document.getElementById('streak-badge');
const sessionPointsEl = document.getElementById('session-points');
const questionCard    = document.getElementById('question-card');
const questionText    = document.getElementById('question-text');
const optionsList     = document.getElementById('options-list');
const btnHint         = document.getElementById('btn-hint');
const feedbackPanel   = document.getElementById('feedback-panel');
const feedbackIcon    = document.getElementById('feedback-icon');
const feedbackMessage = document.getElementById('feedback-message');
const explanationText = document.getElementById('explanation-text');
const pointsEarned    = document.getElementById('points-earned');
const btnNext         = document.getElementById('btn-next');
const btnBackHome     = document.getElementById('btn-back-home');

// Room Result
const storyPanel      = document.getElementById('story-panel');
const resultTrophy    = document.getElementById('result-trophy');
const resultRoomName  = document.getElementById('result-room-name');
const resultCorrect   = document.getElementById('result-correct');
const resultTotal     = document.getElementById('result-total');
const resultPoints    = document.getElementById('result-points');
const resultLives     = document.getElementById('result-lives');
const resultVerdict   = document.getElementById('result-verdict');
const btnGoHome       = document.getElementById('btn-go-home');
const btnReplay       = document.getElementById('btn-replay');
const btnNextRoom     = document.getElementById('btn-next-room');

// Final Screen
const finalIcon       = document.getElementById('final-icon');
const finalTitle      = document.getElementById('final-title');
const finalMessage    = document.getElementById('final-message');
const finalTotalPts   = document.getElementById('final-total-pts');
const finalBreakdown  = document.getElementById('final-breakdown');
const btnPlayAgain    = document.getElementById('btn-play-again');

// Topic Profile
const strongestTopicEl = document.getElementById('strongest-topic');
const weakestTopicEl   = document.getElementById('weakest-topic');
const topicBarsList    = document.getElementById('topic-bars-list');

// Share Card
const shareCanvas       = document.getElementById('share-canvas');
const btnDownloadCard   = document.getElementById('btn-download-card');
const btnCopyCardText   = document.getElementById('btn-copy-card-text');
const shareCopyConfirm  = document.getElementById('share-copy-confirm');

// ═══════════════════════════════════════════════════
// THEME & SOUND TOGGLES
// ═══════════════════════════════════════════════════

btnThemeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  themeIcon.textContent = state.theme === 'dark' ? '🌙' : '☀️';
});

btnSoundToggle.addEventListener('click', () => {
  getAudioContext(); // prime context
  state.isMuted = !state.isMuted;
  soundIcon.textContent = state.isMuted ? '🔇' : '🔊';
  btnSoundToggle.title = state.isMuted ? 'Unmute Sound' : 'Mute Sound';
});

// Prime audio context on any user click
document.addEventListener('click', () => getAudioContext(), { once: true });

// ═══════════════════════════════════════════════════
// AUTHENTICATION CLIENT (Feature 7)
// ═══════════════════════════════════════════════════

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      if (data.signedIn && data.user) {
        state.currentUser = data.user;
        renderAuthUI();
        return;
      }
    }
    state.currentUser = null;
    renderAuthUI();
  } catch (err) {
    state.currentUser = null;
    renderAuthUI();
  }
}

function renderAuthUI() {
  if (state.currentUser) {
    authNavArea.innerHTML = `
      <span class="user-badge">👤 ${escapeHtml(state.currentUser.username)}</span>
      <button id="btn-logout" class="btn btn-ghost" style="padding:0.25rem 0.6rem;font-size:0.8rem;">Sign Out</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
        state.currentUser = null;
        renderAuthUI();
        loadLeaderboard();
      } catch (e) {}
    });
  } else {
    authNavArea.innerHTML = `
      <a href="/login.html" class="auth-btn-link">Sign In</a>
      <a href="/signup.html" class="auth-btn-link" style="color:var(--accent);">Sign Up</a>
    `;
  }
}

// ═══════════════════════════════════════════════════
// SCREEN NAVIGATION
// ═══════════════════════════════════════════════════

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (el) el.classList.toggle('active', key === name);
  });
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════
// UNLOCK RULES
// ═══════════════════════════════════════════════════

function isUnlocked(roomId) {
  if (state.skipUnlock) return true;
  if (!UNLOCK_RULES[roomId]) return true; // first room always open

  const rule = UNLOCK_RULES[roomId];
  const prev = state.completedRooms[rule.prev];
  return prev && prev.correct >= rule.minCorrect;
}

function unlockMessage(roomId) {
  const rule = UNLOCK_RULES[roomId];
  const prevRoom = ROOMS.find(r => r.id === rule.prev);
  return `🔒 Complete "${prevRoom.title}" with ≥${rule.minCorrect} correct first.`;
}

// ═══════════════════════════════════════════════════
// HOME SCREEN & LEADERBOARD (Feature 2)
// ═══════════════════════════════════════════════════

function renderHome() {
  roomGrid.innerHTML = '';

  ROOMS.forEach(room => {
    const unlocked  = isUnlocked(room.id);
    const completed = room.id in state.completedRooms;

    const card = document.createElement('div');
    card.className = `room-card${completed ? ' completed' : ''}${unlocked ? '' : ' locked'}`;
    card.dataset.room = room.id;

    card.innerHTML = `
      <div class="room-card-icon">${room.icon}</div>
      <div class="room-card-title">${room.title}</div>
      <div class="room-card-desc">${room.description}</div>
      ${completed ? '<div class="room-checkmark">✓</div>' : ''}
      ${!unlocked ? `<div class="lock-overlay">${unlockMessage(room.id)}</div>` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => promptRoomIntro(room));
    }

    roomGrid.appendChild(card);
  });

  const done = Object.keys(state.completedRooms).length;
  overallProgress.textContent =
    done === ROOMS.length
      ? '🎉 All rooms escaped! View your final summary and certificate below.'
      : `${done} / ${ROOMS.length} rooms completed`;

  loadLeaderboard();
}

async function loadLeaderboard() {
  lbLoading.classList.remove('hidden');
  lbError.classList.add('hidden');
  lbTable.classList.add('hidden');

  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();

    lbLoading.classList.add('hidden');

    if (!data.available) {
      lbError.textContent = data.message || 'Leaderboard is currently unavailable. Offline mode is active.';
      lbError.classList.remove('hidden');
      return;
    }

    const roomScores = (data.rooms && data.rooms[state.activeLbRoom]) || [];
    renderLeaderboardRows(roomScores);

  } catch (err) {
    lbLoading.classList.add('hidden');
    lbError.textContent = 'Leaderboard is currently offline. You can still play and escape normally!';
    lbError.classList.remove('hidden');
  }
}

function renderLeaderboardRows(scores) {
  lbTableBody.innerHTML = '';

  if (scores.length === 0) {
    lbError.textContent = 'No scores recorded for this room yet. Be the first to escape!';
    lbError.classList.remove('hidden');
    lbTable.classList.add('hidden');
    return;
  }

  lbError.classList.add('hidden');
  lbTable.classList.remove('hidden');

  scores.forEach(s => {
    const row = document.createElement('tr');
    const rankClass = s.rank === 1 ? 'rank-1' : s.rank === 2 ? 'rank-2' : s.rank === 3 ? 'rank-3' : '';

    row.innerHTML = `
      <td><span class="rank-badge ${rankClass}">${s.rank}</span></td>
      <td><strong>${escapeHtml(s.playerLabel)}</strong></td>
      <td>${s.score}/${s.totalQuestions}</td>
      <td><span class="lb-pts">${s.points} pts</span></td>
    `;
    lbTableBody.appendChild(row);
  });
}

// Leaderboard tab switcher
lbTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    lbTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeLbRoom = tab.dataset.room;
    loadLeaderboard();
  });
});

// ═══════════════════════════════════════════════════
// ROOM INTRO CARD (Feature 6)
// ═══════════════════════════════════════════════════

function promptRoomIntro(room) {
  state.pendingRoom = room;
  const info = ROOM_INTROS[room.id] || {
    title: room.title,
    icon: room.icon,
    story: 'Prepare yourself. The data chamber awaits.'
  };

  introRoomIcon.textContent  = info.icon;
  introRoomTitle.textContent = info.title;
  introStoryText.textContent = info.story;

  showScreen('intro');
}

btnEnterRoom.addEventListener('click', () => {
  if (state.pendingRoom) {
    startRoom(state.pendingRoom);
    state.pendingRoom = null;
  }
});

btnIntroCancel.addEventListener('click', () => {
  state.pendingRoom = null;
  showScreen('home');
});

// ═══════════════════════════════════════════════════
// ADAPTIVE QUESTION SELECTION (Feature 1)
// ═══════════════════════════════════════════════════

/**
 * Pick next question adaptively from the room's 8-question pool:
 * - Start with easy question
 * - After two correct in a row (consecutiveCorrect >= 2): serve HARD next
 * - After a wrong answer: serve EASY next
 * - Never repeat a question in the same room
 */
function pickAdaptiveQuestion(room) {
  const targetLevel = (state.consecutiveCorrect >= 2) ? 'hard' : 'easy';

  // Find unused questions matching the target level
  const candidates = room.questions.filter(q =>
    q.level === targetLevel && !state.servedQuestionTexts.has(q.text)
  );

  if (candidates.length > 0) {
    // Pick randomly from available candidates of that level
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    state.servedQuestionTexts.add(chosen.text);
    return chosen;
  }

  // Fallback: pick any unused question from the opposite level
  const remaining = room.questions.filter(q => !state.servedQuestionTexts.has(q.text));
  if (remaining.length > 0) {
    const fallback = remaining[Math.floor(Math.random() * remaining.length)];
    state.servedQuestionTexts.add(fallback.text);
    return fallback;
  }

  // Ultimate fallback (should not occur with 5 questions from pool of 8)
  return room.questions[0];
}

// ═══════════════════════════════════════════════════
// QUIZ ENGINE
// ═══════════════════════════════════════════════════

function startRoom(room) {
  state.currentRoom           = room;
  state.servedQuestionTexts   = new Set();
  state.currentQuestionNumber = 0;
  state.consecutiveCorrect    = 0;
  state.sessionCorrect        = 0;
  state.sessionPoints         = 0;
  state.lives                 = MAX_LIVES;
  state.streak                = 0;
  state.answered              = false;
  state.hintUsed              = false;
  roomCompleteLogged          = false;

  quizScreenEl.className = 'screen active room-' + room.id;
  quizRoomTitle.textContent = `${room.icon} ${room.title}`;

  showScreen('quiz');
  serveNextQuestion();
}

function serveNextQuestion() {
  state.currentQuestionNumber++;

  if (state.currentQuestionNumber > QUESTIONS_PER_ROOM) {
    endRoom(false);
    return;
  }

  const q = pickAdaptiveQuestion(state.currentRoom);
  state.currentQuestion = q;

  state.answered = false;
  state.hintUsed = false;

  // Track topic usage in session profile
  if (!state.topicStats[q.topic]) {
    state.topicStats[q.topic] = { total: 0, correct: 0 };
  }
  state.topicStats[q.topic].total++;

  // Update progress bar
  quizProgress.textContent = `Question ${state.currentQuestionNumber} of ${QUESTIONS_PER_ROOM}`;
  progressFill.style.width = `${((state.currentQuestionNumber - 1) / QUESTIONS_PER_ROOM) * 100}%`;

  // Update Difficulty & Topic Badges (Feature 1)
  const isHard = q.level === 'hard';
  levelBadge.textContent = isHard ? '🔥 Hard (2× pts)' : '🌱 Easy (1× pts)';
  levelBadge.className   = `level-badge ${isHard ? 'hard' : 'easy'}`;
  topicBadge.textContent = q.topic || 'General';

  updateHUD();

  // Question text
  questionText.textContent = q.text;

  // Hint button reset
  btnHint.disabled = false;
  btnHint.style.opacity = '';

  // Render options
  optionsList.innerHTML = '';
  q.options.forEach((opt, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectAnswer(i));
    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  // Hide feedback panel
  feedbackPanel.classList.add('hidden');

  // Trigger card animation
  questionCard.classList.remove('fade-out', 'fade-in');
  void questionCard.offsetWidth;
  questionCard.classList.add('fade-in');

  // Start timer and record start timestamp
  startTimer();
  questionStartTime = Date.now();
}

// ═══════════════════════════════════════════════════
// TIMER (Per-Question Countdown)
// ═══════════════════════════════════════════════════

function startTimer() {
  clearTimer();
  state.timerTick = 0;
  timerFill.style.width = '100%';
  timerFill.className = 'timer-bar-fill';

  const MAX_TICKS = TIMER_DURATION * 10;

  state.timerInterval = setInterval(() => {
    state.timerTick++;
    const pct = 1 - state.timerTick / MAX_TICKS;
    timerFill.style.width = (pct * 100) + '%';

    if (pct <= 0.25)     timerFill.className = 'timer-bar-fill danger';
    else if (pct <= 0.5) timerFill.className = 'timer-bar-fill warn';

    if (state.timerTick >= MAX_TICKS) {
      clearTimer();
      onTimeout();
    }
  }, 100);
}

function clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function onTimeout() {
  if (state.answered) return;
  state.answered = true;

  const q = state.currentQuestion;

  // Highlight correct button
  const btns = optionsList.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex) btn.classList.add('correct');
  });

  // Reset streaks and adaptive sequence
  state.streak = 0;
  state.consecutiveCorrect = 0; // go back to easy
  state.lives--;
  updateHUD();

  playWrongSound();

  feedbackIcon.textContent    = '⏰';
  feedbackMessage.textContent = "Time's up!";
  feedbackMessage.className   = 'feedback-message wrong';
  explanationText.textContent = q.explanation;
  pointsEarned.textContent    = '+0 pts';
  feedbackPanel.classList.remove('hidden');

  // Log answer event to MongoDB
  const timeTaken = Date.now() - questionStartTime;
  logAnswer(state.currentRoom.id, state.currentQuestionNumber, q.text, '(timed out)', false, timeTaken);

  if (state.lives <= 0) {
    btnNext.textContent = 'See Results →';
  }
}

// ═══════════════════════════════════════════════════
// ANSWER SELECTION & SCORING
// ═══════════════════════════════════════════════════

function selectAnswer(chosenIndex) {
  if (state.answered) return;
  state.answered = true;
  clearTimer();

  const q = state.currentQuestion;
  const correct = chosenIndex === q.correctIndex;
  const elapsedSec = state.timerTick / 10;

  // Colour buttons
  const btns = optionsList.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex)   btn.classList.add('correct');
    else if (i === chosenIndex) btn.classList.add('wrong');
  });

  if (correct) {
    playCorrectSound();
    state.sessionCorrect++;
    state.streak++;
    state.consecutiveCorrect++; // 2 in a row triggers hard question next

    if (state.topicStats[q.topic]) {
      state.topicStats[q.topic].correct++;
    }

    // Multipliers
    const streakMult = state.streak >= STREAK_X3 ? 3 : state.streak >= STREAK_X2 ? 2 : 1;
    const diffMult   = q.level === 'hard' ? 2 : 1; // Double points for hard!
    const speedBonus = SPEED_TIERS.find(t => elapsedSec <= t.maxSec)?.bonus ?? 0;

    const earned = (BASE_POINTS * streakMult + speedBonus) * diffMult;
    state.sessionPoints += earned;

    feedbackIcon.textContent    = '✅';
    feedbackMessage.textContent = q.level === 'hard' ? 'Correct! (Hard 2× Bonus)' : 'Correct!';
    feedbackMessage.className   = 'feedback-message correct';
    pointsEarned.textContent    = `+${earned} pts${diffMult > 1 ? ' (2× Hard)' : ''}${streakMult > 1 ? ` (×${streakMult} streak)` : ''}${speedBonus > 0 ? ` +${speedBonus} speed` : ''}`;
  } else {
    playWrongSound();
    state.streak = 0;
    state.consecutiveCorrect = 0; // wrong answer returns difficulty to easy
    state.lives--;

    feedbackIcon.textContent    = '❌';
    feedbackMessage.textContent = 'Not quite.';
    feedbackMessage.className   = 'feedback-message wrong';
    pointsEarned.textContent    = '+0 pts';

    updateHUD();
  }

  explanationText.textContent = q.explanation;
  feedbackPanel.classList.remove('hidden');

  sessionPointsEl.textContent = state.sessionPoints + ' pts';

  // Log answer to MongoDB
  const timeTaken = Date.now() - questionStartTime;
  logAnswer(state.currentRoom.id, state.currentQuestionNumber, q.text, q.options[chosenIndex], correct, timeTaken);

  if (state.lives <= 0) {
    btnNext.textContent = 'See Results →';
  }
}

// ═══════════════════════════════════════════════════
// HINTS
// ═══════════════════════════════════════════════════

function useHint() {
  if (state.hintUsed || state.answered) return;
  state.hintUsed = true;

  const q = state.currentQuestion;

  state.sessionPoints = Math.max(0, state.sessionPoints - HINT_COST);
  sessionPointsEl.textContent = state.sessionPoints + ' pts';
  btnHint.disabled = true;

  // Eliminate two wrong answers
  const wrongIndices = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
  for (let i = wrongIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
  }
  const toEliminate = wrongIndices.slice(0, 2);

  const btns = optionsList.querySelectorAll('.option-btn');
  toEliminate.forEach(idx => btns[idx].classList.add('hint-eliminated'));

  const hintEl = document.createElement('p');
  hintEl.style.cssText = 'font-size:0.85rem;color:var(--yellow);font-style:italic;margin-bottom:0.25rem;';
  hintEl.textContent = `💡 Hint: ${q.hint}`;
  optionsList.before(hintEl);
}

btnHint.addEventListener('click', useHint);

// ═══════════════════════════════════════════════════
// HUD DISPLAY
// ═══════════════════════════════════════════════════

function updateHUD() {
  livesDisplay.textContent = '❤️'.repeat(Math.max(0, state.lives)) +
                             '🖤'.repeat(Math.max(0, MAX_LIVES - state.lives));

  if (state.streak >= STREAK_X3) {
    streakBadge.textContent = '🔥 ×3 streak';
    streakBadge.className   = 'streak-badge x3';
    streakBadge.classList.remove('hidden');
  } else if (state.streak >= STREAK_X2) {
    streakBadge.textContent = '🔥 ×2 streak';
    streakBadge.className   = 'streak-badge';
    streakBadge.classList.remove('hidden');
  } else {
    streakBadge.classList.add('hidden');
  }

  sessionPointsEl.textContent = state.sessionPoints + ' pts';
}

// ═══════════════════════════════════════════════════
// ADVANCING QUESTIONS & ROOM END
// ═══════════════════════════════════════════════════

btnNext.addEventListener('click', () => {
  btnNext.textContent = 'Next →';

  if (state.lives <= 0) {
    endRoom(true);
    return;
  }

  questionCard.classList.add('fade-out');
  setTimeout(() => {
    questionCard.classList.remove('fade-out');
    serveNextQuestion();
  }, 220);
});

function endRoom(gameOver = false) {
  clearTimer();

  const room = state.currentRoom;

  state.completedRooms[room.id] = {
    correct:   state.sessionCorrect,
    points:    state.sessionPoints,
    livesLeft: state.lives,
  };

  if (!roomCompleteLogged) {
    roomCompleteLogged = true;
    logRoomComplete(room.id, state.sessionCorrect, QUESTIONS_PER_ROOM, state.sessionPoints);
  }

  progressFill.style.width = '100%';

  if (gameOver) {
    playWrongSound();
    storyPanel.innerHTML = '💀 Out of lives! The labyrinth locked you out. Review your theory and try again.';
    storyPanel.className = 'story-panel gameover';
  } else {
    playVictorySound();
    const lines = ROOM_NARRATIVES[room.id] || [];
    storyPanel.innerHTML = lines.map(l => `<span>${l}</span>`).join('<br>');
    storyPanel.className = 'story-panel';
  }

  const pct = state.sessionCorrect / QUESTIONS_PER_ROOM;
  resultTrophy.textContent   = pct === 1 ? '🏆' : pct >= 0.6 ? '🥈' : '💡';
  resultRoomName.textContent = room.title;
  resultCorrect.textContent  = state.sessionCorrect;
  resultTotal.textContent    = ` / ${QUESTIONS_PER_ROOM}`;
  resultPoints.textContent   = state.sessionPoints;
  resultLives.textContent    = '❤️'.repeat(Math.max(0, state.lives)) +
                               '🖤'.repeat(Math.max(0, MAX_LIVES - state.lives));

  resultVerdict.textContent =
    gameOver   ? 'Zero lives left. The chamber door remains sealed.' :
    pct === 1  ? 'Flawless escape! Every lock opened cleanly!' :
    pct >= 0.8 ? 'Great escape! You breezed past the room defenses.' :
    pct >= 0.6 ? 'You escaped, but barely! Hone your weak spots.' :
                 'Door barely moved. Study up and retry!';

  // Next room button
  const nextRoomObj = ROOMS[ROOMS.findIndex(r => r.id === room.id) + 1];
  if (nextRoomObj && isUnlocked(nextRoomObj.id)) {
    btnNextRoom.classList.remove('hidden');
    btnNextRoom.onclick = () => promptRoomIntro(nextRoomObj);
  } else {
    btnNextRoom.classList.add('hidden');
  }

  showScreen('result');
}

// ═══════════════════════════════════════════════════
// FINAL RESULTS SCREEN (Certificate & Profile)
// ═══════════════════════════════════════════════════

function showFinalScreen() {
  const totalPts = Object.values(state.completedRooms).reduce((sum, r) => sum + r.points, 0);
  const tier = FINAL_TITLES.find(t => totalPts >= t.min);

  finalIcon.textContent     = tier.icon;
  finalTitle.textContent    = tier.title;
  finalMessage.textContent  = tier.msg;
  finalTotalPts.textContent = totalPts;

  // Breakdown
  finalBreakdown.innerHTML = '';
  ROOMS.forEach(room => {
    const data = state.completedRooms[room.id];
    if (!data) return;
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-room">${room.icon} ${room.title}</span>
      <span class="breakdown-score">${data.correct}/${QUESTIONS_PER_ROOM} correct</span>
      <span class="breakdown-pts">${data.points} pts</span>
    `;
    finalBreakdown.appendChild(row);
  });

  // Render Topic Profile (Feature 5)
  renderTopicProfile();

  // Draw Shareable Canvas Card (Feature 4)
  drawShareableCard(totalPts, tier.title);

  showScreen('final');
}

// ═══════════════════════════════════════════════════
// TOPIC PROFILE CALCULATION (Feature 5)
// ═══════════════════════════════════════════════════

function renderTopicProfile() {
  topicBarsList.innerHTML = '';
  const topics = Object.keys(state.topicStats);

  if (topics.length === 0) {
    strongestTopicEl.textContent = 'None';
    weakestTopicEl.textContent   = 'None';
    return;
  }

  // Calculate percentages
  const ranked = topics.map(t => {
    const s = state.topicStats[t];
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return { topic: t, pct, correct: s.correct, total: s.total };
  });

  // Sort descending
  ranked.sort((a, b) => b.pct - a.pct || b.total - a.total);

  strongestTopicEl.textContent = `${ranked[0].topic} (${ranked[0].pct}%)`;
  weakestTopicEl.textContent   = `${ranked[ranked.length - 1].topic} (${ranked[ranked.length - 1].pct}%)`;

  ranked.forEach(item => {
    const row = document.createElement('div');
    row.className = 'topic-bar-row';
    row.innerHTML = `
      <div class="topic-bar-labels">
        <span class="topic-bar-name">${escapeHtml(item.topic)}</span>
        <span class="topic-bar-pct">${item.pct}% (${item.correct}/${item.total})</span>
      </div>
      <div class="topic-bar-track">
        <div class="topic-bar-fill" style="width: ${item.pct}%;"></div>
      </div>
    `;
    topicBarsList.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════
// SHAREABLE CANVAS RESULT CARD (Feature 4 - 1200x630)
// ═══════════════════════════════════════════════════

function drawShareableCard(totalPoints, playerTitle) {
  const canvas = shareCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1200;
  const H = 630;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.5, '#111b2b');
  bgGrad.addColorStop(1, '#0d1117');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative border
  ctx.strokeStyle = '#1f6feb';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.strokeStyle = 'rgba(88, 166, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Header Title
  ctx.fillStyle = '#58a6ff';
  ctx.font = 'bold 44px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ESCAPE ROOM: DATA EDITION', W / 2, 95);

  ctx.fillStyle = '#8b949e';
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillText('Official Escapist Certificate & Achievement Record', W / 2, 130);

  // Big Trophy & Title
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillText(`🏅 ${playerTitle}`, W / 2, 210);

  // Points Box
  const boxX = W / 2 - 180;
  const boxY = 240;
  const boxW = 360;
  const boxH = 90;

  ctx.fillStyle = 'rgba(31, 111, 235, 0.15)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#1f6feb';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#58a6ff';
  ctx.font = '800 50px Inter, sans-serif';
  ctx.fillText(`${totalPoints} PTS`, W / 2, boxY + 62);

  // Three Room Scores Cards
  const roomCardY = 370;
  const cardW = 320;
  const cardH = 130;
  const gap = 40;
  const startX = (W - (cardW * 3 + gap * 2)) / 2;

  ROOMS.forEach((room, idx) => {
    const x = startX + idx * (cardW + gap);
    const data = state.completedRooms[room.id] || { correct: 0, points: 0 };

    ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
    ctx.fillRect(x, roomCardY, cardW, cardH);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, roomCardY, cardW, cardH);

    // Accent line on top of each card
    const accentCol = idx === 0 ? '#1a78c2' : idx === 1 ? '#1e8449' : '#7a1fa2';
    ctx.fillStyle = accentCol;
    ctx.fillRect(x, roomCardY, cardW, 4);

    // Room Title
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${room.icon} ${room.title}`, x + 16, roomCardY + 38);

    // Score
    ctx.fillStyle = '#3fb950';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(`${data.correct} / 5 Correct`, x + 16, roomCardY + 80);

    // Points
    ctx.fillStyle = '#8b949e';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`Earned: ${data.points} pts`, x + 16, roomCardY + 110);
  });

  // Footer Watermark
  const playerName = state.currentUser ? state.currentUser.username : `Player ${SESSION_ID.slice(-4)}`;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#484f58';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(`Escapist: ${playerName} • Session: ${SESSION_ID.slice(0, 8)}... • Verified on ${dateStr}`, W / 2, 580);
}

// Download Card
btnDownloadCard.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `escape-room-result-${Date.now()}.png`;
  link.href = shareCanvas.toDataURL('image/png');
  link.click();
});

// Copy Text Summary
btnCopyCardText.addEventListener('click', () => {
  const totalPts = Object.values(state.completedRooms).reduce((sum, r) => sum + r.points, 0);
  const tier = FINAL_TITLES.find(t => totalPts >= t.min);

  const roomSummaries = ROOMS.map(r => {
    const d = state.completedRooms[r.id];
    return d ? `${r.title}: ${d.correct}/5 (${d.points} pts)` : '';
  }).filter(Boolean).join(' | ');

  const summaryLine = `🔐 Escape Room: Data Edition — ${totalPts} pts (${tier.title}) | ${roomSummaries}`;

  navigator.clipboard.writeText(summaryLine).then(() => {
    shareCopyConfirm.classList.remove('hidden');
    setTimeout(() => shareCopyConfirm.classList.add('hidden'), 3000);
  });
});

// ═══════════════════════════════════════════════════
// LOGGING HELPERS (MongoDB POST)
// ═══════════════════════════════════════════════════

function logAnswer(room, questionIndex, questionText, selectedOption, isCorrect, timeTakenMs) {
  fetch('/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId:      SESSION_ID,
      room:           room,
      questionId:     questionIndex,
      questionText:   questionText,
      selectedOption: selectedOption,
      isCorrect:      isCorrect,
      timeTakenMs:    Math.max(0, Math.round(timeTakenMs)),
    }),
  }).catch(err => console.warn('Analytics: failed to log answer –', err.message));
}

function logRoomComplete(room, score, totalQuestions, points) {
  fetch('/api/rooms/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId:      SESSION_ID,
      room:           room,
      score:          score,
      totalQuestions: totalQuestions,
      points:         points,
    }),
  }).catch(err => console.warn('Analytics: failed to log room completion –', err.message));
}

// ═══════════════════════════════════════════════════
// NAVIGATION & CONTROLS
// ═══════════════════════════════════════════════════

function goHome() {
  clearTimer();
  const allDone = ROOMS.every(r => r.id in state.completedRooms);
  if (allDone) {
    showFinalScreen();
  } else {
    renderHome();
    showScreen('home');
  }
}

btnBackHome.addEventListener('click', goHome);
btnGoHome.addEventListener('click', goHome);

btnReplay.addEventListener('click', () => {
  if (state.currentRoom) {
    promptRoomIntro(state.currentRoom);
  }
});

btnPlayAgain.addEventListener('click', () => {
  state.completedRooms = {};
  state.topicStats     = {};
  state.skipUnlock     = false;
  renderHome();
  showScreen('home');
});

skipUnlockLink.addEventListener('click', e => {
  e.preventDefault();
  state.skipUnlock = true;
  renderHome();
  skipUnlockLink.textContent = '✓ All rooms unlocked for testing';
  skipUnlockLink.style.pointerEvents = 'none';
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

// ═══════════════════════════════════════════════════
// BOOTSTRAP INITIALIZATION
// ═══════════════════════════════════════════════════

checkAuth();
renderHome();
showScreen('home');
