const express = require("express");
const router = express.Router();
const { createActivityLog } = require("../controllers/activityController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createActivityLog);

module.exports = router;
