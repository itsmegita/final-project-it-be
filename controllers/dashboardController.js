const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Debt = require("../models/DebtReceivable");
const FoodProduct = require("../models/FoodProduct");
const mongoose = require("mongoose");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Ambil tahun unik dari transaksi dan pengeluaran
    const transactionYears = await Transaction.find({ userId }).distinct(
      "date"
    );
    const expenseYears = await Expense.find({ userId }).distinct("date");

    const allYears = [...transactionYears, ...expenseYears].map((d) =>
      new Date(d).getFullYear()
    );
    const availableYears = [...new Set(allYears)].sort((a, b) => b - a);

    // Filter transaksi dan pengeluaran berdasarkan tahun
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999`);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Total income & expense
    const totalIncome = transactions.reduce(
      (sum, trx) => sum + (trx.amount || 0),
      0
    );
    const totalExpense = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const balance = totalIncome - totalExpense;

    // Tidak ada lagi category di transaction, hanya ambil dari expenses
    const categoryCount = {};
    expenses.forEach((exp) => {
      const category = exp.category || "Uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const mostFrequentCategory = Object.keys(categoryCount).length
      ? Object.keys(categoryCount).reduce((a, b) =>
          categoryCount[a] > categoryCount[b] ? a : b
        )
      : "Tidak Ada Data";

    // Grafik per bulan
    const monthlyData = {};

    transactions.forEach((trx) => {
      if (trx.date) {
        const month = trx.date.getMonth();
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month].income += trx.amount || 0;
      }
    });

    expenses.forEach((exp) => {
      if (exp.date) {
        const month = exp.date.getMonth();
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month].expense += exp.amount || 0;
      }
    });

    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: monthNames[i],
      income: monthlyData[i]?.income || 0,
      expense: monthlyData[i]?.expense || 0,
    }));

    const topMenus = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.menuItem",
          totalSold: { $sum: "$orderItems.quantity" },
        },
      },
      {
        $lookup: {
          from: "menus",
          localField: "_id",
          foreignField: "_id",
          as: "menuInfo",
        },
      },
      { $unwind: "$menuInfo" },
      {
        $project: {
          _id: 0,
          name: "$menuInfo.name",
          totalSold: 1,
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // cek stok
    const lowStockThreshold = 5;

    const lowStocks = await FoodProduct.find({
      userId,
      stock: { $lte: lowStockThreshold },
    }).select("name stock unit");

    // reminder
    const reminders = [];

    // Reminder: stok menipis
    if (lowStocks.length > 0) {
      reminders.push("Beberapa bahan baku hampir habis. Segera restock.");
    }

    // Reminder: tidak ada transaksi minggu ini
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

    const transactionThisWeek = await Transaction.find({
      userId,
      date: { $gte: startOfWeek, $lte: endOfWeek },
    });

    if (transactionThisWeek.length === 0) {
      reminders.push("Belum ada transaksi minggu ini.");
    }

    // Reminder: hutang/piutang minggu ini
    const startOfWeekDate = new Date(startOfWeek).setHours(0, 0, 0, 0);
    const endOfWeekDate = new Date(endOfWeek).setHours(23, 59, 59, 999);

    // Ambil hutang/piutang dalam rentang minggu ini
    const debtsThisWeek = await Debt.find({
      userId,
      dueDate: { $gte: startOfWeekDate, $lte: endOfWeekDate },
      status: "Belum Lunas",
    });

    if (debtsThisWeek.length > 0) {
      reminders.push(
        `${debtsThisWeek.length} hutang/piutang jatuh tempo minggu ini dan belum dibayar`
      );
    }

    res.status(200).json({
      status: "Success",
      summary: { totalIncome, totalExpense, balance },
      transactionStats: { mostFrequentCategory },
      chartData,
      availableYears,
      topMenus,
      reminders,
      lowStocks,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat mengambil data dashboard",
      error: err.message,
    });
  }
};

module.exports = { getDashboardData };
