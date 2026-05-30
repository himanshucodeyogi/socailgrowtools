require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');

const authRouter      = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const earnRouter      = require('./routes/earn');
const boostRouter     = require('./routes/boost');
const ordersRouter    = require('./routes/orders');
const requireAuth     = require('./middleware/requireAuth');
const User            = require('./models/User');

const app  = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 7 * 24 * 60 * 60,
    touchAfter: 24 * 60 * 60,
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Public home page
app.get('/', async (req, res) => {
  let user = null;
  if (req.session.userId) {
    user = await User.findById(req.session.userId).catch(() => null);
  }
  res.render('home', { user });
});

// Routes
app.use('/', authRouter);
app.use('/', requireAuth, dashboardRouter);
app.use('/earn', requireAuth, earnRouter);
app.use('/boost', requireAuth, boostRouter);
app.use('/orders', requireAuth, ordersRouter);

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { message: 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
