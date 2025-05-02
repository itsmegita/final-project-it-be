const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.delete("/delete-all", protect, deleteAllNotifications);
router.patch("/:id/read", protect, markNotificationAsRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
