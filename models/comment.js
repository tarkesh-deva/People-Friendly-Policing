// Packages
const mongoose = require('mongoose');

// Schema
const commentSchema = new mongoose.Schema({
  text: String,
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  },
  created: {
    type: Date,
    default: Date.now
  }
});

// Exports
module.exports = mongoose.model('Comment', commentSchema);
