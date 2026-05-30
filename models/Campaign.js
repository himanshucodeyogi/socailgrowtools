const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['instagram', 'youtube'],
    required: true,
  },
  taskType: {
    type: String,
    enum: ['like', 'subscribe', 'follow'],
    required: true,
  },
  targetUrl: {
    type: String,
    required: true,
    trim: true,
  },
  coinRewardPerTask: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 1,
  },
  remainingBudget: {
    type: Number,
    required: true,
  },
  completedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, { timestamps: true });

CampaignSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
