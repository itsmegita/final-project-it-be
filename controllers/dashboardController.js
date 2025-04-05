const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // filter berdasarkan rentang tanggal jika ada
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ambil transaksi penjualan
    const sales = await Transaction.find({
      userId,
      type: "Sale",
      ...dateFilter,
    });

    // ambil pengeluaran dari model Expense
    const expenses = await Expense.find({ userId, ...dateFilter });

    // hitung total pemasukan dan pengeluaran
    let totalIncome = sales.reduce((sum, trx) => sum + (trx.amount || 0), 0);
    let totalExpense = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const balance = totalIncome - totalExpense;

    // hitung jumlah transaksi (penjualan + pengeluaran)
    const totalTransactions = sales.length + expenses.length;

    // hitung kategori transaksi yang paling sering digunakan
    const categoryCount = {};
    sales.forEach((trx) => {
      const category = trx.category || "Uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    expenses.forEach((exp) => {
      const category = exp.category || "Uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const mostFrequentCategory = Object.keys(categoryCount).length
      ? Object.keys(categoryCount).reduce((a, b) =>
          categoryCount[a] > categoryCount[b] ? a : b
        )
      : "Tidak Ada Data";

    // data grafik keuangan per bulan
    const monthlyData = {};
    sales.forEach((trx) => {
      if (trx.date) {
        const month = trx.date.getMonth() + 1;
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month].income += trx.amount || 0;
      }
    });

    expenses.forEach((exp) => {
      if (exp.date) {
        const month = exp.date.getMonth() + 1;
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month].expense += exp.amount || 0;
      }
    });

    // konversi data bulanan ke array dan urutkan
    const chartData = Object.keys(monthlyData)
      .map((month) => ({
        month: parseInt(month),
        income: monthlyData[month].income,
        expense: monthlyData[month].expense,
      }))
      .sort((a, b) => a.month - b.month);

    res.status(200).json({
      status: "Success",
      summary: { totalIncome, totalExpense, balance },
      transactionStats: { totalTransactions, mostFrequentCategory },
      chartData,
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
