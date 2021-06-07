const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const middleware = require('../middleware');

// Root
router.get('/', (req, res) => res.render('landing', {isLanding: true}));

// Register
router.get('/register', middleware.ensureNotAuthenticated, (req, res) => res.render('register', {currentPage: 'register'}));

router.post('/register', middleware.ensureNotAuthenticated, (req, res) => {
  let user = new User({username: req.body.username});
  if (req.body.admincode === process.env.ADMIN_CODE) {
    user.isAdmin = true;
  }
  User.register(user, req.body.password, (err, user) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/register');
    }
    passport.authenticate('local')(req, res, () => {
      req.flash('success', `Welcome to YelpCamp, ${user.username}`);
      res.redirect('/campgrounds');
    });
  });
});

// Login
router.get('/login', middleware.ensureNotAuthenticated, (req, res) => res.render('login', {currentPage: 'login'}));

router.post('/login', middleware.ensureNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/campgrounds',
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => {
  req.flash('error', 'Couldn\'t sign you in.');
  return res.render('/login');
});

// Logout
router.get('/logout', middleware.ensureAuthenticated, (req, res) => {
  req.logout();
  req.flash('success', 'Logged out successfully.');
  res.redirect('/campgrounds');
});

module.exports = router;
