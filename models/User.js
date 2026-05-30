const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  platform: {
    type: String,
    enum: ['instagram', 'youtube'],
    required: true,
  },
  coins: {
    type: Number,
    default: 20,
    min: 0,
  },
  completedTaskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
  }],
  flagged: {
    type: Boolean,
    default: false,
  },
  flagReason: {
    type: String,
    default: null,
  },
}, { timestamps: true });

UserSchema.index({ username: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
