const mongoose = require('mongoose');

const initialPoseSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    yaw: {
      type: Number,
      default: 0,
    },
    capturedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      default: 'slam_start',
      trim: true,
    },
  },
  {
    _id: false,
  }
);

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
    initialPose: {
      type: initialPoseSchema,
      default: null,
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
