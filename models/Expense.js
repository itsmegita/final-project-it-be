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
      enum: [
        "Pembelian Bahan Baku",
        "Listrik",
        "Sewa",
        "Gaji",
        "Pajak",
        "Transportasi",
      ],
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
    items: [
      {
        foodProductId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodProduct",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, "Jumlah harus lebih dari 0"],
        },
        unit: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Harga harus lebih dari 0"],
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
