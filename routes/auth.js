const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');

const HANDLE_REGEX = /^[a-zA-Z0-9._\-]{3,50}$/;

// Matches only actual YouTube URLs, not usernames that happen to contain "youtube"
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;
const INSTAGRAM_URL_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\//i;

function normalizeHandle(raw) {
  const trimmed = raw.trim();

  if (YOUTUBE_URL_REGEX.test(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
      const parts = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
      // Strip known path prefixes to get the channel identifier
      const id = parts.find(p => !['channel', 'c', 'user', 'watch', 'shorts'].includes(p))
        || parts[0]
        || url.hostname;
      return { username: id.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._\-]/g, ''), platform: 'youtube' };
    } catch {
      return { username: trimmed.toLowerCase().replace(/[^a-z0-9._\-]/g, ''), platform: 'youtube' };
    }
  }

  if (INSTAGRAM_URL_REGEX.test(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
      const parts = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
      const id = parts[0] || trimmed;
      return { username: id.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._\-]/g, ''), platform: 'instagram' };
    } catch {
      return { username: trimmed.toLowerCase().replace(/[^a-z0-9._\-]/g, ''), platform: 'instagram' };
    }
  }

  // Plain handle (no URL) — always Instagram
  const clean = trimmed.replace(/^@/, '').toLowerCase();
  return { username: clean, platform: 'instagram' };
}

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const raw = (req.body.handle || '').trim();
    if (!raw) {
      return res.render('login', { error: 'Please enter your username or channel link.' });
    }

    const { username, platform } = normalizeHandle(raw);

    if (!HANDLE_REGEX.test(username)) {
      return res.render('login', {
        error: 'Invalid username format. Use 3–50 characters: letters, numbers, . _ -',
      });
    }

    let user = await User.findOne({ username, platform });
    let isNew = false;

    if (!user) {
      user = await User.create({ username, platform, coins: 20 });
      await CoinTransaction.create({
        userId: user._id,
        type: 'earned',
        amount: 20,
        description: 'Welcome bonus — starter coins',
      });
      isNew = true;
    }

    req.session.userId = user._id.toString();
    if (isNew) req.session.isNewUser = true;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Something went wrong. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
