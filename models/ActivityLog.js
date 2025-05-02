const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["login", "logout"], required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
