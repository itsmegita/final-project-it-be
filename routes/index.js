const express = require("express");
const authRouter = require("./authRouter");
const userRouter = require("./userRouter");

const router = express.Router();

router.use("/api/v1/auth", authRouter);
router.use("/api/v1/user", userRouter);

module.exports = router;
