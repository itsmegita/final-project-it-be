const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["Sale", "Purchase"], required: true },
  orderItems: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "orderItems.menuItemType",
        required: true,
      },
      menuItemType: {
        type: String,
        enum: ["Menu", "FoodProduct"],
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
