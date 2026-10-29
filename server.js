// server.js - Express server for Escape Room Quiz App
// Loads environment variables, connects to MongoDB, serves static files and API routes.

// ── Load .env FIRST, before accessing process.env ──
require('dotenv').config();

const express  = require('express');
const session  = require('express-session');
const path     = require('path');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Parse JSON request bodies for API routes ──
app.use(express.json());

// ── Session middleware for authentication ──
app.use(session({
  secret: process.env.SESSION_SECRET || 'escape-room-session-secret-xyz',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));

// ── Serve everything in /public as static files ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Mount API routes (before the catch-all) ──
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// ── Fallback: serve index.html for any unknown non-file route ──
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Connect to MongoDB, then start listening ──
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn('⚠️  MONGODB_URI is not set in .env — the quiz will run but logging to MongoDB is disabled.');
  app.listen(PORT, () => {
    console.log(`🔐 Escape Room server running at http://localhost:${PORT} (database disabled)`);
  });
} else {
  // Use a reasonable serverSelectionTimeoutMS so connection failures don't hang server startup
  mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      app.listen(PORT, () => {
        console.log(`🔐 Escape Room server running at http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      // Gracefully handle connection failures without crashing the application
      console.error('❌ MongoDB connection failed:', err.message);
      console.warn('⚠️  The quiz will still run, but logging requests will fail gracefully.');
      app.listen(PORT, () => {
        console.log(`🔐 Escape Room server running at http://localhost:${PORT} (database unavailable)`);
      });
    });
}
