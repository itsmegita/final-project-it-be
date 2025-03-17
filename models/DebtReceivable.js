const mongoose = require("mongoose");

const debtReceivableSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["hutang", "piutang"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Tanggal jatuh tempo harus di masa depan!",
      },
    },
    status: {
      type: String,
      enum: ["belum lunas", "lunas"],
      default: "belum lunas",
    },
    category: {
      type: String,
      enum: ["usaha", "pribadi"],
      default: "usaha",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DebtReceivable", debtReceivableSchema);
