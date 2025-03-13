const express = require("express");
const authRouter = require("./authRouter");
const transactionRouter = require("./transactionRouter");
const dashboardRouter = require("./dashboardRouter");
const reportRouter = require("./reportRouter");
const debtRouter = require("./debtReceivableRouter");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", transactionRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportRouter);
router.use("/debt", debtRouter);

module.exports = router;
