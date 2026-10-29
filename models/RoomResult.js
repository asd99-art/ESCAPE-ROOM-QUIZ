// models/RoomResult.js — Schema for room-completion events logged to MongoDB
const mongoose = require('mongoose');

const roomResultSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true },
  room:           { type: String, required: true },
  score:          { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  points:         { type: Number, required: true, default: 0 },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username:       { type: String, default: null },
  completedAt:    { type: Date,   default: Date.now },
});

module.exports = mongoose.model('RoomResult', roomResultSchema);
