const express = require('express');
const router = express.Router({mergeParams: true});
const Campground = require('../models/campground');
const Comment = require('../models/comment');
const middleware = require('../middleware');

// New
router.get('/new', middleware.ensureAuthenticated, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if (err || !campground) {
      req.flash('error', 'Couldn\'t retrieve campground.');
      res.redirect('/campgrounds');
    } else {
      res.render('comments/new', {campground});
    }
  });
});

// Create
router.post('/', middleware.ensureAuthenticated, (req, res) => {
  // get campground to add comment to
  Campground.findById(req.params.id, (err, campground) => {
    if (err || !campground) {
      req.flash('error', 'Couldn\'t retrieve campground.');
      res.redirect('/campgrounds');
    } else {
      // campground found so add new comment to the DB
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash('error', 'Couldn\'t add comment.');
          res.redirect('back');
        } else {
          // associate user with comment
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          // save comment to db
          comment.save();
          // add comment to campground and save to db
          campground.comments.push(comment);
          campground.save();
          req.flash('success', 'Comment added successfully.');
          res.redirect(`/campgrounds/${campground._id}`);
        }
      });
    }
  });
});

// Edit
router.get('/:comment_id/edit', middleware.ensureAuthenticated, middleware.ensureCampgroundExists, middleware.ensureCommentAuthor, (req, res) => {
  // first call to ensureCampgroundExists to avoid campground id tampering in url
  // ensureCommentAuthor places retrieved comment in req.campground so no need for 2nd db roundtrip
  res.render('comments/edit', {campgroundId: req.params.id, comment: req.comment});
});

// Update
router.put('/:comment_id', middleware.ensureAuthenticated, middleware.ensureCommentAuthor, (req, res) => {
  // req.body.campground.description = req.sanitize(req.body.campground.description);
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, comment) => {
    if (err) {
      req.flash('error', 'Couldn\'t update comment.');
      res.redirect('back');
    } else {
      req.flash('success', 'Comment updated successfully.');
      res.redirect(`/campgrounds/${req.params.id}`);
    }
  });
});

// Destroy
router.delete('/:comment_id', middleware.ensureAuthenticated, middleware.ensureCampgroundExists, middleware.ensureCommentAuthor, (req, res) => {
  // remove comment refs
  Campground.findByIdAndUpdate(req.params.id, {
    $pull: {
      comments: req.comment.id
    } // use $pull to remove comment id from comments array
  }, err => {
    if (err) {
      req.flash('error', `Error removing association from campground`);
    } else {
      // remove comment from db. req.comment loaded by ensureCommentAuthor
      req.comment.remove(err => {
        if (err) {
          req.flash('error', 'Couldn\'t delete comment.');
        } else {
          req.flash('success', 'Comment deleted successfully.');
        }
        res.redirect(`/campgrounds/${req.params.id}`);
      });
    }
  });
});

module.exports = router;
