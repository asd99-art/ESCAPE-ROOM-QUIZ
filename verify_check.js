// verify_check.js
'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const express  = require('express');
const session  = require('express-session');
const http     = require('http');

const AnswerEvent = require('./models/AnswerEvent');
const RoomResult  = require('./models/RoomResult');
const apiRoutes   = require('./routes/api');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('=== MongoDB Connection Verification ===');
    console.log('Connection Status: Connected successfully');
    const dbName = mongoose.connection.name || mongoose.connection.db.databaseName;
    console.log('Database Name:', dbName);

    // Document counts
    const answerEventsCount = await AnswerEvent.countDocuments();
    const roomResultsCount  = await RoomResult.countDocuments();

    console.log('\n=== Document Counts ===');
    console.log('answerevents collection count:', answerEventsCount);
    console.log('roomresults collection count:', roomResultsCount);

    // Setup Express app to test routes
    const app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));
    app.use('/api', apiRoutes);

    const server = http.createServer(app);

    await new Promise((resolve, reject) => {
      server.listen(0, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const PORT = server.address().port;

    // Helper for HTTP GET
    const fetchJson = (path) => {
      return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: PORT, path }, (res) => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, rawBody: raw });
          });
        }).on('error', reject);
      });
    };

    console.log('\n=== GET /api/stats (Raw Response) ===');
    const statsRes = await fetchJson('/api/stats');
    console.log(`Status Code: ${statsRes.statusCode}`);
    console.log(statsRes.rawBody);

    console.log('\n=== GET /api/leaderboard (Raw Response) ===');
    const lbRes = await fetchJson('/api/leaderboard');
    console.log(`Status Code: ${lbRes.statusCode}`);
    console.log(lbRes.rawBody);

    server.close();
    await mongoose.disconnect();
    console.log('\n=== Verification Completed Successfully ===');
    process.exit(0);
  } catch (err) {
    console.error('Error during verification:', err.message);
    process.exit(1);
  }
}

run();
