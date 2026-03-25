const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema(
  {
    missionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    robotId: {
      type: String,
      required: true,
      trim: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    mapName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      default: 'Pending',
      trim: true,
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
    collection: 'missions',
    versionKey: false,
  }
);

module.exports = mongoose.model('Mission', missionSchema);
