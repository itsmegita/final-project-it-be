const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", protect, getUserProfile);
router.patch("/", protect, updateUserProfile);
router.patch("/change-password", protect, changePassword);

module.exports = router;
