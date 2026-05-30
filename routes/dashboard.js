const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');

router.get('/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    const recentTransactions = await CoinTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const isNewUser = !!req.session.isNewUser;
    if (isNewUser) delete req.session.isNewUser;

    res.render('dashboard', { user, recentTransactions, isNewUser, flash: req.session.flash || null });
    delete req.session.flash;
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', { message: 'Failed to load dashboard.' });
  }
});

module.exports = router;
