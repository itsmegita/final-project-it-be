const { required } = require("joi");
const mongoose = require("mongoose");

const DebtReceivableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["hutang", "piutang"], required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["belum lunas", "lunas"],
      default: "belum lunas",
    },
    category: { type: String, enum: ["usaha", "pribadi"], default: "usaha" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DebtReceivable", DebtReceivableSchema);
