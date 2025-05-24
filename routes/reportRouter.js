const express = require("express");
const {
  generateProfitLossReport,
  generateFinancialPositionReport,
  generateDailyCashBookReport,
  generateLedgerReport,
} = require("../controllers/repotController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profit-loss", protect, generateProfitLossReport);
router.get("/financial-position", protect, generateFinancialPositionReport);
router.get("/cash-book", protect, generateDailyCashBookReport);
router.get("/ledger", protect, generateLedgerReport);

module.exports = router;
