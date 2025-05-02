const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  getUsers,
  getUser,
  updateUserByAdmin,
  getActivityLogs,
} = require("../controllers/adminController");
const router = express.Router();

router.get("/users", protect, isAdmin, getUsers);
router.get("/users/:id", protect, isAdmin, getUser);
router.patch("/users/:id", protect, isAdmin, updateUserByAdmin);
router.get("/activity-logs", protect, isAdmin, getActivityLogs);

module.exports = router;
