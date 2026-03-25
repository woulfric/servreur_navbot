const mongoose = require('mongoose');

const poiSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
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
    type: {
      type: String,
      default: 'Other',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      default: 'Medium',
    },
    status: {
      type: String,
      default: 'Active',
    },
    visits: {
      type: Number,
      default: 0,
    },
    created: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const missionPlanSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    mapName: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    pois: {
      type: [poiSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'missionplans',
    versionKey: false,
  }
);

module.exports = mongoose.model('MissionPlan', missionPlanSchema);
