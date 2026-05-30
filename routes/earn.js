const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const CoinTransaction = require('../models/CoinTransaction');

async function checkRateLimit(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await CoinTransaction.countDocuments({
    userId,
    type: 'earned',
    campaignId: { $ne: null },
    createdAt: { $gte: oneHourAgo },
  });
  return count < 10;
}

router.get('/', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const user = await User.findById(userId);

    const campaigns = await Campaign.find({
      isActive: true,
      creatorId: { $ne: userId },
      'completedBy.userId': { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const filtered = campaigns.filter(c => c.remainingBudget >= c.coinRewardPerTask);

    res.render('earn', { user, campaigns: filtered });
  } catch (err) {
    console.error('Earn page error:', err);
    res.status(500).render('error', { message: 'Failed to load earn page.' });
  }
});

router.post('/api/tasks/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid campaign ID.' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign || !campaign.isActive) {
      return res.status(404).json({ error: 'Campaign not found or inactive.' });
    }

    if (campaign.creatorId.toString() === userId) {
      return res.status(400).json({ error: 'Cannot start your own campaign.' });
    }

    const alreadyDone = campaign.completedBy.some(c => c.userId.toString() === userId);
    if (alreadyDone) {
      return res.status(400).json({ error: 'Already completed this task.' });
    }

    req.session.taskStart = { campaignId: id, startedAt: Date.now() };

    res.json({ success: true, startedAt: req.session.taskStart.startedAt });
  } catch (err) {
    console.error('Task start error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid campaign ID.' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign || !campaign.isActive) {
      return res.status(404).json({ error: 'Campaign not found or inactive.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'User not found.' });

    if (user.flagged) {
      return res.status(403).json({ error: 'Account flagged: ' + (user.flagReason || 'suspicious activity') });
    }

    if (campaign.creatorId.toString() === userId) {
      return res.status(400).json({ error: 'Cannot complete your own campaign.' });
    }

    const alreadyDone = campaign.completedBy.some(c => c.userId.toString() === userId);
    if (alreadyDone) {
      return res.status(400).json({ error: 'Already completed this task.' });
    }

    const taskStart = req.session.taskStart;
    if (!taskStart || taskStart.campaignId !== id) {
      return res.status(400).json({ error: 'Task not started properly. Please click Start Task first.' });
    }

    const elapsed = Date.now() - taskStart.startedAt;
    if (elapsed < 4000) {
      return res.status(400).json({ error: 'Minimum 4 seconds required on the task.' });
    }

    const underLimit = await checkRateLimit(userId);
    if (!underLimit) {
      return res.status(429).json({ error: 'Rate limit reached. Maximum 10 tasks per hour.' });
    }

    if (campaign.remainingBudget < campaign.coinRewardPerTask) {
      return res.status(400).json({ error: 'Campaign budget exhausted.' });
    }

    const updated = await Campaign.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
        remainingBudget: { $gte: campaign.coinRewardPerTask },
        'completedBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
      },
      {
        $push: { completedBy: { userId: new mongoose.Types.ObjectId(userId), completedAt: new Date() } },
        $inc: { remainingBudget: -campaign.coinRewardPerTask },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ error: 'Could not claim task. It may have just filled up.' });
    }

    if (updated.remainingBudget < updated.coinRewardPerTask) {
      await Campaign.findByIdAndUpdate(id, { isActive: false });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { coins: campaign.coinRewardPerTask },
        $push: { completedTaskIds: campaign._id },
      },
      { new: true }
    );

    await CoinTransaction.create({
      userId,
      type: 'earned',
      amount: campaign.coinRewardPerTask,
      campaignId: campaign._id,
      description: `Completed ${campaign.taskType} task`,
    });

    delete req.session.taskStart;

    res.json({
      success: true,
      coinsEarned: campaign.coinRewardPerTask,
      newBalance: updatedUser.coins,
    });
  } catch (err) {
    console.error('Task complete error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
