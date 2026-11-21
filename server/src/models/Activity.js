const mongoose = require('mongoose');

/**
 * Append-only audit trail. One document per meaningful change so the
 * timeline can show "who changed what, from → to, when".
 */
const activitySchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['created', 'status', 'assignee', 'field', 'comment', 'attachment'],
      required: true,
    },
    field: String,
    from: mongoose.Schema.Types.Mixed,
    to: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ issue: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 }); // dashboard feed

module.exports = mongoose.model('Activity', activitySchema);
