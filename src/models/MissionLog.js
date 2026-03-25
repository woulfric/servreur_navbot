const mongoose = require('mongoose');

const missionLogSchema = new mongoose.Schema(
  {
    missionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    robotId: {
      type: String,
      default: null,
      trim: true,
    },
    level: {
      type: String,
      default: 'info',
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'missionlogs',
    versionKey: false,
  }
);

module.exports = mongoose.model('MissionLog', missionLogSchema);
