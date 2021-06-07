// Packages
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  isAdmin: {
    type: Boolean,
    default: false
  }
});

userSchema.plugin(passportLocalMongoose);

// Exports
module.exports = mongoose.model('User', userSchema);
