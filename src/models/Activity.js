/**
 * Activity Model
 * Mongoose schema for storing normalized GitHub activities
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PUSH', 'PR', 'ISSUE', 'STAR'],
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  repo: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.timestamp = ret.timestamp.toISOString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

// Compound indexes for efficient querying
activitySchema.index({ username: 1, timestamp: -1 });
activitySchema.index({ username: 1, type: 1, timestamp: -1 });
activitySchema.index({ username: 1, repo: 1, timestamp: -1 });

// Text index for repository search
activitySchema.index({ repo: 'text' });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
