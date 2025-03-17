const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
});

module.exports = mongoose.model("Menu", MenuSchema);
