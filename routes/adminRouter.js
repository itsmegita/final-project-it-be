const express = require("express");
const {
  getUsers,
  getUser,
  updateUserByAdmin,
  getActivityLogs,
  getAdminDashboard,
  getAllTransactions,
  getSystemReport,
} = require("../controllers/adminController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, isAdmin, getAdminDashboard);
router.get("/users", protect, isAdmin, getUsers);
router.get("/users/:id", protect, isAdmin, getUser);
router.patch("/users/:id", protect, isAdmin, updateUserByAdmin);
router.get("/activity-logs", protect, isAdmin, getActivityLogs);
router.get("/all-transactions", protect, isAdmin, getAllTransactions);
router.get("/system-report", protect, isAdmin, getSystemReport);

module.exports = router;
