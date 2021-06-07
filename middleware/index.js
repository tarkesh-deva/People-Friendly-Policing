const Campground = require('../models/campground');
const Comment = require('../models/comment');

// Middleware functions
module.exports.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You need to sign in before doing that.');
  res.redirect('/login');
};

module.exports.ensureNotAuthenticated = function (req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You need to sign out before doing that.');
  res.redirect('campgrounds');
};

module.exports.ensureCampgroundExists = function (req, res, next) {
  Campground.count({_id: req.params.id}, (err, count) => {
    if (!err && count > 0) {
      return next();
    }
    req.flash('error', 'Couldn\'t retrieve campground.');
    res.redirect('/campgrounds');
  });
};

module.exports.ensureCampgroundAuthor = function (req, res, next) {
  Campground.findById(req.params.id, (err, campground) => {
    if (err || !campground) {
      req.flash('error', 'Couldn\'t retrieve campground.');
      res.redirect('/campgrounds');
    } else {
      // is user the campground's author or is user an admin?
      if (req.user.isAdmin || campground.author.id.equals(req.user._id)) {
        // set request obj to retrieved campground to use in routes
        req.campground = campground;
        return next();
      }
      req.flash('error', 'You don\'t have permission to do that.');
      res.redirect(`/campgrounds/${req.params.id}`);
    }
  });
};

module.exports.ensureCommentAuthor = function (req, res, next) {
  Comment.findById(req.params.comment_id, (err, comment) => {
    if (err || !comment) {
      req.flash('error', 'Couldn\'t retrieve comment.');
      res.redirect(`/campgrounds/${req.params.id}`);
    } else {
      // is user the comment's author or is user an admin?
      if (req.user.isAdmin || comment.author.id.equals(req.user._id)) {
        // set request obj to retrieved campground to use in routes
        req.comment = comment;
        return next();
      }
      req.flash('error', 'You don\'t have permission to do that.');
      res.redirect(`/campgrounds/${req.params.id}`);
    }
  });
};

// can be used on create/update/delete routes to enforce read only to non-admin usres
module.exports.ensureAdmin = function (req, res, next) {
  if (req.user.isAdmin) {
    next();
  } else {
    req.flash('error', 'This site is read only for the moment.');
    res.redirect('back');
  }
};
