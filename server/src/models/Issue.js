const mongoose = require('mongoose');
const { SEVERITIES, PRIORITIES, STATUSES } = require('../utils/constants');

const attachmentSchema = new mongoose.Schema(
  {
    filename: String, // stored name on disk
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const issueSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    number: { type: Number, required: true },
    key: { type: String, required: true }, // e.g. PAY-12 (denormalised for fast display/search)
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    severity: { type: String, enum: SEVERITIES, default: 'medium' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: STATUSES, default: 'open' },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

// Indexes match the API's real query patterns (see README → Indexing)
issueSchema.index({ project: 1, number: 1 }, { unique: true });
issueSchema.index({ project: 1, status: 1, updatedAt: -1 }); // board + filtered lists
issueSchema.index({ assignee: 1, status: 1 }); // "assigned to me"
issueSchema.index({ reporter: 1 });
issueSchema.index({ severity: 1, status: 1 }); // dashboard "critical" counts
issueSchema.index({ key: 1 });

module.exports = mongoose.model('Issue', issueSchema);
