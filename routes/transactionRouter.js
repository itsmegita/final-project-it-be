const express = require("express");
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactionsToCSV,
} = require("../controllers/transactionController");

const protect = require("../middleware/authMiddleware");

router.post("/", protect, createTransaction);
router.get("/", protect, getTransactions);
router.get("/export/csv", protect, exportTransactionsToCSV);
router.get("/:id", protect, getTransactionById);
router.patch("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);

module.exports = router;
