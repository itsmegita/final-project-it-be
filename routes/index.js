const express = require("express");
const authRouter = require("./authRouter");
const transactionRouter = require("./transactionRouter");
const dashboardRouter = require("./dashboardRouter");
const reportRouter = require("./reportRouter");
const debtRouter = require("./debtReceivableRouter");
const menuRouter = require("./menuRouter");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", transactionRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportRouter);
router.use("/debt", debtRouter);
router.use("/menu", menuRouter);

module.exports = router;
