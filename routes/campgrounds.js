const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const Comment = require('../models/comment');
const middleware = require('../middleware');
const NodeGeocoder = require('node-geocoder');
const multer = require('multer');
const cloudinary = require('cloudinary');

// ============ Geocoder config ============
const geocoder = NodeGeocoder({
  provider: 'google',
  httpAdapter: 'https',
  formatter: null
});

// ============ Image upload ============
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  }
});
const imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Regex sanitizer function
const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// Index
router.get('/', (req, res) => {
  // search was used
  if (req.query.search) {
    let regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({name: regex}, (err, campgrounds) => {
      if (err || !campgrounds) {
        req.flash('error', 'There was a problem with the search.');
      }
      // if no results found, send a message to display in the view
      let message = 'Couldn\'t find a matching query.';
      campgrounds.length === 0
        ? res.render('campgrounds/index', {campgrounds: campgrounds, currentPage: 'campgrounds', searchMessage: message})
        : res.render('campgrounds/index', {campgrounds: campgrounds, currentPage: 'campgrounds'});
    });
  } else {
  // get all campgrounds from DB
    Campground.find({}, (err, campgrounds) => {
      if (err) {
        throw err;
      } else {
        res.render('campgrounds/index', {campgrounds: campgrounds, currentPage: 'campgrounds'});
      }
    });
  }
});

// New
router.get('/new', middleware.ensureAuthenticated, (req, res) => res.render('campgrounds/new'));

// Create
router.post('/', middleware.ensureAuthenticated, upload.single('imageLocal'), (req, res) => {
  let name = req.body.name;
  let cost = req.body.cost;
  let image;
  let description = req.body.description;
  let author = {
    id: req.user._id,
    username: req.user.username
  };
  // start with geocoder
  geocoder.geocode(req.body.location, (err, data) => {
    if (err || data.length === 0) {
      req.flash('error', 'Invalid location');
      return res.redirect('/campgrounds/new');
    }
    let lat = data[0].latitude;
    let lng = data[0].longitude;
    let location = data[0].formattedAddress;
    // if cloudinary
    // cloudinary
    if (req.file) {
      cloudinary.v2.uploader.upload(req.file.path, { transformation: [
        { width: 2048 }]}, (err, result) => {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        // add cloudinary image props
        image = {
          id: result.public_id,
          url: result.secure_url
        };
        // add new campground to the DB
        Campground.create({name, cost, image, description, location, lat, lng, author}, (err, campground) => {
          if (err) {
            req.flash('error', 'Couldn\'t add campground.');
          } else {
            req.flash('success', 'Campground added successfully.');
          }
          res.redirect('/campgrounds');
        });
      });
    } else { (console.log('no file to upload!!')); }
  });
});

// Show
router.get('/:id', (req, res) => {
  // get campground from db
  Campground.findById(req.params.id).populate('comments').exec((err, campground) => {
    if (err || !campground) {
      req.flash('error', 'Couldn\'t retrieve campground.');
      return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', {campground: campground});
  });
});

// Edit
router.get('/:id/edit', middleware.ensureAuthenticated, middleware.ensureCampgroundAuthor, (req, res) => {
  // ensureCampgroundAuthor places retrieved campground in req.campground so no need for 2nd db roundtrip
  res.render('campgrounds/edit', {campground: req.campground});
});

// Update
router.put('/:id', middleware.ensureAuthenticated, middleware.ensureCampgroundAuthor, upload.single('imageLocal'), (req, res) => {
  // req.campground, with pre-save values, loaded by ensureCampgroundAuthor
  // start with geocoder
  geocoder.geocode(req.body.location, (err, data) => {
    if (err || data.length === 0) {
      req.flash('error', 'Invalid location');
      return res.redirect(`/campgrounds/${req.params.id}/edit`);
    }
    let updateData = {
      name: req.body.name,
      cost: req.body.cost,
      description: req.body.description,
      location: data[0].formattedAddress,
      lat: data[0].latitude,
      lng: data[0].longitude
    };
    // new file update, upload to cloudinary and delete old one
    if (req.file) {
      cloudinary.v2.uploader.upload(req.file.path, {transformation: [{ width: 2048 }]}, (err, result) => {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        // update cloudinary image props
        updateData.image = {
          id: result.public_id,
          url: result.secure_url
        };
        // delete old picture
        cloudinary.v2.uploader.destroy(req.campground.image.id, (err, result) => console.log(result));
        // save campground
        Campground.findByIdAndUpdate(req.params.id, {$set: updateData}, (err, campground) => {
          if (err) {
            req.flash('error', 'Couldn\'t update campground.');
          } else {
            req.flash('success', 'Campground updated successfully.');
          }
          res.redirect(`/campgrounds/${campground._id}`); // or req.params.id
        });
      });// cloudinary
    } else { // no new file to upload
      // save campground
      Campground.findByIdAndUpdate(req.params.id, {$set: updateData}, (err, campground) => {
        if (err) {
          req.flash('error', 'Couldn\'t update campground.');
        } else {
          req.flash('success', 'Campground updated successfully.');
        }
        res.redirect(`/campgrounds/${campground._id}`); // or req.params.id
      });
    }
  });// geocoder
});

// Destroy
router.delete('/:id', middleware.ensureAuthenticated, middleware.ensureCampgroundAuthor, (req, res) => {
  // req.campground loaded by ensureCampgroundAuthor
  // delete cloudinary image
  if (typeof req.campground.image !== 'undefined') {
    cloudinary.v2.uploader.destroy(req.campground.image.id, (err, result) => console.log(result));
  }
  // delete associated comments
  Comment.remove({
    _id: {
      $in: req.campground.comments
    }
  }, err => {
    if (err) {
      req.flash('error', `Error removing associated comments.`);
      res.redirect('back');
    } else {
      // delete campground
      req.campground.remove(err => {
        if (err) {
          req.flash('error', 'Couldn\'t delete campground.');
        } else {
          req.flash('success', 'Campground deleted successfully.');
        }
        res.redirect('/campgrounds');
      });
    }
  });
});

module.exports = router;
