const Transaction = require("../models/Transaction");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const matchCriteria = { userId };
    if (startDate && endDate) {
      matchCriteria.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ambil semua transaksi pengguna
    const transactions = await Transaction.find({ userId });

    // hitung total pemasukan dan pengeluaran, dan saldo
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((trx) => {
      if (trx.type === "income") totalIncome += trx.amount;
      if (trx.type === "expense") totalExpense += trx.amount;
    });
    const balance = totalIncome - totalExpense;

    // hitung jumlah transaksi
    const totalTransactions = transactions.length;

    // cari kategori transaksi yang paling sering digunakan
    const categoryCount = {};
    transactions.forEach((trx) => {
      categoryCount[trx.category] = (categoryCount[trx.category] || 0) + 1;
    });
    const mostFrequentCategory = Object.keys(categoryCount).reduce((a, b) =>
      categoryCount[a] > categoryCount[b] ? a : b
    );

    // persiapkan data untuk grafik keuangan per bulan
    const monthlyData = {};
    transactions.forEach((trx) => {
      const month = trx.date.getMonth() + 1;
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
      if (trx.type === "income") monthlyData[month].income += trx.amount;
      if (trx.type === "expense") monthlyData[month].expense += trx.amount;
    });

    const chartData = Object.keys(monthlyData).map((month) => ({
      month: parseInt(month),
      income: monthlyData[month].income,
      expense: monthlyData[month].expense,
    }));

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
