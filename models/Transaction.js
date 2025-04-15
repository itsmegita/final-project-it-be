const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      default: "Pelanggan Umum",
      trim: true,
    },
    orderItems: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Jumlah harus lebih dari 0"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Harga tidak boleh negatif"],
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
      min: [0, "Total transaksi tidak boleh negatif"],
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
