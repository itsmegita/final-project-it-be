const express = require("express");
const {
  generateProfitLossReport,
  generateCashFlowReport,
  generateFinancialSummaryReport,
} = require("../controllers/repotController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profit-loss", protect, generateProfitLossReport);
router.get("/cash-flow", protect, generateCashFlowReport);
router.get("/transaction-summary", protect, generateFinancialSummaryReport);

module.exports = router;
