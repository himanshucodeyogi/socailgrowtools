const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const CoinTransaction = require('../models/CoinTransaction');

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i;

const TASK_TYPES = {
  instagram: ['like', 'follow'],
  youtube: ['like', 'subscribe'],
};

function detectPlatformFromUrl(url) {
  if (YOUTUBE_REGEX.test(url)) return 'youtube';
  if (INSTAGRAM_REGEX.test(url)) return 'instagram';
  return null;
}

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('boost', { user, error: null, formData: {} });
  } catch (err) {
    console.error('Boost page error:', err);
    res.status(500).render('error', { message: 'Failed to load boost page.' });
  }
});

router.post('/', async (req, res) => {
  const renderError = async (error, formData) => {
    const user = await User.findById(req.session.userId);
    return res.render('boost', { user, error, formData });
  };

  try {
    const user = await User.findById(req.session.userId);

    if (user.flagged) {
      return renderError('Your account is restricted from creating campaigns.', req.body);
    }

    const { targetUrl, taskType, coinRewardPerTask: rewardRaw, totalBudget: budgetRaw } = req.body;

    if (!targetUrl || !targetUrl.trim()) {
      return renderError('Please enter a valid URL.', req.body);
    }

    const platform = detectPlatformFromUrl(targetUrl.trim());
    if (!platform) {
      return renderError('URL must be a valid YouTube or Instagram link.', req.body);
    }

    const validTypes = TASK_TYPES[platform];
    if (!taskType || !validTypes.includes(taskType)) {
      return renderError(`Task type must be one of: ${validTypes.join(', ')} for ${platform}.`, req.body);
    }

    const coinRewardPerTask = parseInt(rewardRaw, 10);
    if (isNaN(coinRewardPerTask) || coinRewardPerTask < 1 || coinRewardPerTask > 50) {
      return renderError('Coin reward per task must be between 1 and 50.', req.body);
    }

    const totalBudget = parseInt(budgetRaw, 10);
    if (isNaN(totalBudget) || totalBudget < coinRewardPerTask) {
      return renderError(`Total budget must be at least ${coinRewardPerTask} coins (enough for 1 task).`, req.body);
    }

    if (totalBudget > user.coins) {
      return renderError(`You only have ${user.coins} coins. Reduce your budget.`, req.body);
    }

    await User.findByIdAndUpdate(user._id, { $inc: { coins: -totalBudget } });

    const campaign = await Campaign.create({
      creatorId: user._id,
      platform,
      taskType,
      targetUrl: targetUrl.trim(),
      coinRewardPerTask,
      totalBudget,
      remainingBudget: totalBudget,
      isActive: true,
    });

    await CoinTransaction.create({
      userId: user._id,
      type: 'spent',
      amount: totalBudget,
      campaignId: campaign._id,
      description: `Created ${taskType} campaign`,
    });

    const updatedUser = await User.findById(user._id);
    if (updatedUser.coins < 0) {
      await User.findByIdAndUpdate(user._id, {
        flagged: true,
        flagReason: 'Negative coin balance detected',
      });
    }

    req.session.flash = `Campaign created! ${totalBudget} coins allocated.`;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Boost error:', err);
    const user = await User.findById(req.session.userId).catch(() => null);
    res.render('boost', { user, error: 'Something went wrong. Please try again.', formData: req.body });
  }
});

module.exports = router;
