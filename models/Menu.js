const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ["Makanan", "Minuman"],
    required: true,
  },
  price: { type: Number, required: true, min: 0 },
  ingredients: [
    {
      foodProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodProduct",
        required: true,
      },
      quantity: { type: Number, required: true, min: 0 },
      unit: String,
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Menu", menuSchema);
