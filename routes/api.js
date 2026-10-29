// routes/api.js — API endpoints for logging, stats, leaderboard, and user authentication
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const AnswerEvent = require('../models/AnswerEvent');
const RoomResult  = require('../models/RoomResult');
const User        = require('../models/User');

// Helper to check MongoDB connection state
const isDbConnected = () => mongoose.connection.readyState === 1;

// ────────────────────────────────────────────────────
// USER AUTHENTICATION ROUTES
// ────────────────────────────────────────────────────

// POST /api/signup — Register a new user
router.post('/signup', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }

  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanUsername = username.trim();

    // Check if user already exists
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: cleanUsername,
      password: hashedPassword,
    });

    // Establish session
    req.session.userId   = user._id;
    req.session.username = user.username;

    // Never return the password hash
    return res.status(201).json({
      success: true,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    console.error('❌ POST /api/signup error:', err.message);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/login — Sign in existing user
router.post('/login', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId   = user._id;
    req.session.username = user.username;

    return res.json({
      success: true,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    console.error('❌ POST /api/login error:', err.message);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/logout — Terminate user session
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// GET /api/me — Check authentication status
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      signedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
      },
    });
  }
  return res.json({ signedIn: false, user: null });
});

// ────────────────────────────────────────────────────
// QUIZ LOGGING ROUTES
// ────────────────────────────────────────────────────

// POST /api/answers — Log a single answer attempt
router.post('/answers', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }

  try {
    const { sessionId, room, questionId, questionText,
            selectedOption, isCorrect, timeTakenMs } = req.body;

    // Validate required fields and types
    if (!sessionId || typeof sessionId !== 'string')          return res.status(400).json({ error: 'sessionId is required (string).' });
    if (!room || typeof room !== 'string')                    return res.status(400).json({ error: 'room is required (string).' });
    if (questionId == null || typeof questionId !== 'number')  return res.status(400).json({ error: 'questionId is required (number).' });
    if (!questionText || typeof questionText !== 'string')    return res.status(400).json({ error: 'questionText is required (string).' });
    if (!selectedOption || typeof selectedOption !== 'string') return res.status(400).json({ error: 'selectedOption is required (string).' });
    if (typeof isCorrect !== 'boolean')                       return res.status(400).json({ error: 'isCorrect is required (boolean).' });
    if (timeTakenMs == null || typeof timeTakenMs !== 'number' || timeTakenMs < 0) {
      return res.status(400).json({ error: 'timeTakenMs is required (non-negative number).' });
    }

    const doc = await AnswerEvent.create({
      sessionId, room, questionId, questionText,
      selectedOption, isCorrect, timeTakenMs,
    });

    return res.status(201).json({ success: true, id: doc._id });
  } catch (err) {
    console.error('❌ POST /api/answers error:', err.message);
    return res.status(500).json({ error: 'Failed to save answer event.' });
  }
});

// POST /api/rooms/complete — Log a room completion event
router.post('/rooms/complete', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }

  try {
    const { sessionId, room, score, totalQuestions, points } = req.body;

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string')   return res.status(400).json({ error: 'sessionId is required (string).' });
    if (!room || typeof room !== 'string')             return res.status(400).json({ error: 'room is required (string).' });
    if (score == null || typeof score !== 'number')     return res.status(400).json({ error: 'score is required (number).' });
    if (totalQuestions == null || typeof totalQuestions !== 'number') {
      return res.status(400).json({ error: 'totalQuestions is required (number).' });
    }

    const pointsNum = (typeof points === 'number') ? points : 0;

    // Link user if signed in
    const userId   = req.session && req.session.userId ? req.session.userId : null;
    const username = req.session && req.session.username ? req.session.username : null;

    const doc = await RoomResult.create({
      sessionId,
      room,
      score,
      totalQuestions,
      points: pointsNum,
      userId,
      username,
    });

    return res.status(201).json({ success: true, id: doc._id });
  } catch (err) {
    console.error('❌ POST /api/rooms/complete error:', err.message);
    return res.status(500).json({ error: 'Failed to save room result.' });
  }
});

// ────────────────────────────────────────────────────
// LEADERBOARD ROUTE
// ────────────────────────────────────────────────────

// GET /api/leaderboard — Return top 10 scores per room sorted by points
router.get('/leaderboard', async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      available: false,
      message: 'Leaderboard is currently unavailable. Offline mode active.',
      rooms: {
        'algorithm-vault': [],
        'statistics-lab': [],
        'database-dungeon': [],
      },
    });
  }

  try {
    const pipeline = [
      // Sort by points descending, then completedAt ascending
      { $sort: { points: -1, completedAt: 1 } },
      // Group by room
      {
        $group: {
          _id: '$room',
          scores: {
            $push: {
              sessionId:      '$sessionId',
              points:         '$points',
              score:          '$score',
              totalQuestions: '$totalQuestions',
              username:       '$username',
              completedAt:    '$completedAt',
            },
          },
        },
      },
      // Slice top 10 for each room
      {
        $project: {
          _id: 1,
          top10: { $slice: ['$scores', 10] },
        },
      },
    ];

    const aggregated = await RoomResult.aggregate(pipeline);

    const roomMap = {
      'algorithm-vault': [],
      'statistics-lab': [],
      'database-dungeon': [],
    };

    aggregated.forEach(group => {
      if (roomMap[group._id] !== undefined) {
        roomMap[group._id] = group.top10.map((entry, index) => {
          const sid = entry.sessionId || 'anon';
          const last4 = sid.slice(-4);
          const playerLabel = entry.username
            ? entry.username
            : `Player ${last4}`;

          return {
            rank: index + 1,
            playerLabel,
            points: entry.points || 0,
            score: entry.score || 0,
            totalQuestions: entry.totalQuestions || 5,
            completedAt: entry.completedAt,
          };
        });
      }
    });

    return res.json({ available: true, rooms: roomMap });
  } catch (err) {
    console.error('❌ GET /api/leaderboard error:', err.message);
    return res.json({
      available: false,
      message: 'Failed to load leaderboard data.',
      rooms: {
        'algorithm-vault': [],
        'statistics-lab': [],
        'database-dungeon': [],
      },
    });
  }
});

// ────────────────────────────────────────────────────
// ANALYTICS & STATS ROUTE
// ────────────────────────────────────────────────────

// GET /api/stats — Aggregated question stats via pipeline
router.get('/stats', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database service is currently unavailable.' });
  }

  try {
    const pipeline = [
      // Group attempts by question and room
      {
        $group: {
          _id: {
            questionId:   '$questionId',
            questionText: '$questionText',
            room:         '$room',
          },
          totalAttempts:   { $sum: 1 },
          correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTimeTakenMs:  { $avg: '$timeTakenMs' },
        },
      },
      // Calculate percentage correct and round values
      {
        $project: {
          _id:             0,
          questionId:      '$_id.questionId',
          questionText:    '$_id.questionText',
          room:            '$_id.room',
          totalAttempts:   1,
          correctAttempts: 1,
          percentCorrect:  {
            $round: [{ $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] }, 1],
          },
          avgTimeTakenMs:  { $round: ['$avgTimeTakenMs', 0] },
        },
      },
      // Default order: hardest questions first (lowest percent correct ascending)
      { $sort: { percentCorrect: 1, totalAttempts: -1 } },
    ];

    const perQuestion = await AnswerEvent.aggregate(pipeline);
    const totalAnswers = await AnswerEvent.countDocuments();

    return res.json({ totalAnswers, perQuestion });
  } catch (err) {
    console.error('❌ GET /api/stats error:', err.message);
    return res.status(500).json({ error: 'Failed to compute stats.' });
  }
});

module.exports = router;
