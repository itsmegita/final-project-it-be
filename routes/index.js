const express = require("express");
const authRouter = require("./authRouter");
const transactionRouter = require("./transactionRouter");
const dashboardRouter = require("./dashboardRouter");
const reportRouter = require("./reportRouter");
const debtRouter = require("./debtReceivableRouter");
const menuRouter = require("./menuRouter");
const foodProductRouter = require("./foodProductRouter");
const userRouter = require("./userRouter");
const notificationRouter = require("./notificationRouter");
const expenseRouter = require("./expenseRouter");
const adminRouter = require("./adminRouter");
const activityRouter = require("./activityRouter");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", transactionRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportRouter);
router.use("/debt", debtRouter);
router.use("/menu", menuRouter);
router.use("/food-product", foodProductRouter);
router.use("/profile", userRouter);
router.use("/notification", notificationRouter);
router.use("/expense", expenseRouter);
router.use("/admin", adminRouter);
router.use("/log", activityRouter);

module.exports = router;
