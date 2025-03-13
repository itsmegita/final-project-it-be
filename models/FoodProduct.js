const mongoose = require("mongoose");

const bahanBakuSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  minimumStock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BahanBaku", bahanBakuSchema);
