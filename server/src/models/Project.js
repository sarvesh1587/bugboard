const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Short code used to build issue keys, e.g. "PAY" → PAY-12
    key: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z][A-Z0-9]{1,5}$/ },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Atomic counter for sequential issue numbers per project
    issueSeq: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// "Which projects can this user see?" is the most frequent query → multikey index on members
projectSchema.index({ members: 1 });

projectSchema.methods.hasMember = function hasMember(userId) {
  const id = userId.toString();
  return this.members.some((m) => (m._id || m).toString() === id);
};

module.exports = mongoose.model('Project', projectSchema);
