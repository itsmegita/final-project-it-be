const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["Transaksi", "Stok Habis", "Hutang/Piutang", "Umum"],
      default: "Umum",
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceType",
      default: null,
    },
    referenceType: {
      type: String,
      enum: ["DebtReceivable", "FoodProduct", "Transaction"],
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
