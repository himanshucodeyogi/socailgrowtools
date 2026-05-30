const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const CoinTransaction = require('../models/CoinTransaction');
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const user = await User.findById(userId);

    // Campaigns this user created
    const myCampaigns = await Campaign.find({ creatorId: userId })
      .sort({ createdAt: -1 });

    // Tasks this user completed (earned transactions with a campaignId)
    const completedTxns = await CoinTransaction.find({
      userId,
      type: 'earned',
      campaignId: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .populate('campaignId', 'platform taskType targetUrl coinRewardPerTask');

    res.render('orders', { user, myCampaigns, completedTxns });
  } catch (err) {
    console.error('Orders error:', err);
    res.status(500).render('error', { message: 'Failed to load orders.' });
  }
});

module.exports = router;
