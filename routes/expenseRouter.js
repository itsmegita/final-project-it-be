const express = require("express");
const router = express.Router();
const {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createExpense);
router.get("/", protect, getExpenses);
router.get("/:id", protect, getExpense);
router.patch("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);

module.exports = router;
