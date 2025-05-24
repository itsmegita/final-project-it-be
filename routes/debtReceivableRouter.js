const express = require("express");
const {
  createDebt,
  getAllDebtss,
  getDebtById,
  updateDebt,
  deleteDebt,
  markDebtAsPaid,
} = require("../controllers/debtReceivableController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createDebt);
router.get("/", protect, getAllDebtss);
router.get("/:id", protect, getDebtById);
router.patch("/:id", protect, updateDebt);
router.patch("/:id/mark-as-paid", protect, markDebtAsPaid);
router.delete("/:id", protect, deleteDebt);

module.exports = router;
