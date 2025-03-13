const express = require("express");
const {
  createDebtReceivable,
  getAllDebtsReceivables,
  getDebtReceivableById,
  updateDebtReceivable,
  deleteDebtReceivable,
  getDueDateReminders,
} = require("../controllers/debtReceivableController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createDebtReceivable);
router.get("/", protect, getAllDebtsReceivables);
router.get("/due-date-reminders", protect, getDueDateReminders);
router.get("/:id", protect, getDebtReceivableById);
router.patch("/:id", protect, updateDebtReceivable);
router.delete("/:id", protect, deleteDebtReceivable);

module.exports = router;
