// Packages
const mongoose = require('mongoose');

// Schema
const campgroundSchema = new mongoose.Schema({
  name: String,
  cost: Number,
  image: {
    id: String,
    url: String
  },
  description: String,
  location: String,
  lat: Number,
  lng: Number,
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ],
  created: {
    type: Date,
    default: Date.now
  }
});

// Exports
module.exports = mongoose.model('Campground', campgroundSchema);
