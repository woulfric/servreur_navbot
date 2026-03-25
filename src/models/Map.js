const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema(
  {
    mapName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    robotId: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    apiPath: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'maps',
    versionKey: false,
  }
);

module.exports = mongoose.model('Map', mapSchema);
