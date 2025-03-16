const mongoose = require("mongoose");

const foodProductSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      enum: ["Bahan Pokok", "Bumbu", "Minuman", "Lainnya"],
    },
    stock: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      enum: ["Kg", "Gram", "Liter", "Mililiter", "Pcs"],
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

const FoodProduct = mongoose.model("FoodProduct", foodProductSchema);
module.exports = FoodProduct;
