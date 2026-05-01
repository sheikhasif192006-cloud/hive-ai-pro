const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
