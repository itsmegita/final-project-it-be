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
      trim: true,
      lowercase: true,
      enum: ["bahan pokok", "bumbu", "minuman", "lainnya"],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock harus berupa angka bulat (integer)",
      },
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["kg", "gram", "liter", "mililiter", "pcs"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Harga harus berupa angka bulat (integer)",
      },
    },
  },
  { timestamps: true }
);

const FoodProduct = mongoose.model("FoodProduct", foodProductSchema);
module.exports = FoodProduct;
