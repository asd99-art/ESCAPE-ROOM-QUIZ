// models/AnswerEvent.js — Schema for individual answer events logged to MongoDB
const mongoose = require('mongoose');

const answerEventSchema = new mongoose.Schema({
  sessionId:      { type: String,  required: true },
  room:           { type: String,  required: true },
  questionId:     { type: Number,  required: true },
  questionText:   { type: String,  required: true },
  selectedOption: { type: String,  required: true },
  isCorrect:      { type: Boolean, required: true },
  timeTakenMs:    { type: Number,  required: true, min: 0 },
  createdAt:      { type: Date,    default: Date.now },
});

module.exports = mongoose.model('AnswerEvent', answerEventSchema);
