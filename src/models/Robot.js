const mongoose = require('mongoose');

const robotSchema = new mongoose.Schema(
  {
    robotId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    status: {
      type: String,
      default: 'offline',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'robots',
    versionKey: false,
  }
);

module.exports = mongoose.model('Robot', robotSchema);
