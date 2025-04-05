const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: ["Listrik", "Sewa", "Gaji", "Bahan Baku", "Pajak", "Transportasi"],
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Jumlah pengeluaran tidak boleh negatif"],
    },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Transfer", "Credit", "E-Wallet"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
