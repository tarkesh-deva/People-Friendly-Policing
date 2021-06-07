// Packages
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const moment = require('moment');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const helmet = require('helmet');

// Project imports
const User = require('./models/user');
const indexRoutes = require('./routes/index');
const campgroundsRoutes = require('./routes/campgrounds');
const commentsRoutes = require('./routes/comments');

// App config
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(`${__dirname}/public`));
app.use(methodOverride('_method'));
app.use(flash());
app.use(helmet());
app.locals.moment = moment;
const port = process.env.PORT || 3000;

// Db config
const databaseUri = process.env.DATABASE_URI || 'mongodb://localhost/yelpcampdb';
mongoose.connect(databaseUri);

// Passport config
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// middleware to make currentUser available to all routes
app.use((req, res, next) => {
  res.locals.currentUser = req.user; // req.user is an authenticated user
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  res.locals.isLanding = false;
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/campgrounds', campgroundsRoutes);
app.use('/campgrounds/:id/comments', commentsRoutes);
app.use((req, res, next) => {
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404');
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

// Start server
app.listen(port, () => console.log(`Yelp Camp server listening on port ${port}`));
