const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Dapatkan semua tahun yang tersedia (dari transaksi dan pengeluaran)
    const transactionYears = await Transaction.find({ userId }).distinct(
      "date"
    );
    const expenseYears = await Expense.find({ userId }).distinct("date");

    // Gabungkan dan ambil tahun unik
    const allYears = [...transactionYears, ...expenseYears].map((d) =>
      new Date(d).getFullYear()
    );
    const availableYears = [...new Set(allYears)].sort((a, b) => b - a);

    // Filter transaksi dan pengeluaran berdasarkan tahun yang diminta
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999`);

    const sales = await Transaction.find({
      userId,
      type: "Sale",
      date: { $gte: startDate, $lte: endDate },
    });

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Hitung total income dan expense
    const totalIncome = sales.reduce((sum, trx) => sum + (trx.amount || 0), 0);
    const totalExpense = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const balance = totalIncome - totalExpense;

    // Hitung kategori terbanyak
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

    // Data grafik per bulan
    const monthlyData = {};

    sales.forEach((trx) => {
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

    // Konversi data bulanan ke array
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
