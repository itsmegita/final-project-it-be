const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");

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

    res.status(200).json({
      status: "Success",
      summary: { totalIncome, totalExpense, balance },
      transactionStats: { mostFrequentCategory },
      chartData,
      availableYears,
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
