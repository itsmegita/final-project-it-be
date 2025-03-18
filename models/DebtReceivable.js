const mongoose = require("mongoose");

const debtSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Utang", "Piutang"], required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Belum Lunas", "Lunas"],
      default: "Belum Lunas",
    },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Debt", debtSchema);
