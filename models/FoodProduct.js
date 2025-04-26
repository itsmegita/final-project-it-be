const mongoose = require("mongoose");

const foodProductSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, unique: true, trim: true },
    unit: {
      type: String,
      required: true,
      enum: ["gram", "kg", "ml", "liter", "pcs"],
    },
    stock: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodProduct", foodProductSchema);
