const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  ingredients: [
    {
      foodProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodProduct",
        required: true,
      },
      quantity: { type: Number, required: true, min: 0 },
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  image: { type: String },
});

module.exports = mongoose.model("Menu", menuSchema);
