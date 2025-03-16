const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  deleteAllNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);
router.delete("/:id", protect, deleteNotification);
router.delete("/delete-all", protect, deleteAllNotifications);

module.exports = router;
