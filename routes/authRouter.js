const express = require("express");
const {
  register,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  resendOTP,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/resend-otp", resendOTP);

module.exports = router;
