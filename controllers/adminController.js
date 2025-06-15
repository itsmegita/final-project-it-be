const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const ActivityLog = require("../models/ActivityLog");

const getAdminDashboard = async (req, res) => {
  try {
    const [totalUsers, totalLogs] = await Promise.all([
      User.countDocuments(),
      ActivityLog.countDocuments(),
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalLogs,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil data dashboard admin:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil data dashboard admin",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data users",
      users,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil data user",
      error: err.message,
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    // validasi id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: "Error",
        message: "ID tidak valid",
      });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data user",
      user,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil detail user",
      error: err.message,
    });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password } = req.body;

    // validasi input
    if (!email && !password) {
      return res.status(400).json({
        status: "Error",
        message: "Minimal satu field harus diisi (email atau password)",
      });
    }

    // validasi format email jika email diubah
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        status: "Error",
        message: "Format email tidak valid",
      });
    }

    // validasi panjang password jika password diubah
    if (password && password.length < 8) {
      return res.status(400).json({
        status: "Error",
        message: "Password minimal 8 karakter",
      });
    }

    // validasi id format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: "Error",
        message: "ID tidak valid",
      });
    }

    // cari user berdasarkan id
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    // jika email diubah
    if (email) {
      console.log("Update email ke: ", email);
      user.email = email;
    }

    // jika password diubah
    if (password) {
      console.log("update password");
      user.password = await bcrypt.hash(password, 10);
    }

    // simpan perubahan user
    const updatedUser = await user.save();

    if (!updatedUser) {
      return res.status(500).json({
        status: "Error",
        message: "Gagal memperbarui user",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "User berhasil diperbarui",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui user",
      error: err.message,
    });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .populate("user", "name email")
        .sort({ timestamp: -1 })
        .select("user type timestamp ipAddress userAgent")
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(),
    ]);

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil log aktivitas",
      error: error.message,
    });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const { user, bulan, tahun, page = 1, limit = 10 } = req.query;

    // validasi query
    const query = {};

    // validasi user id
    if (user) {
      if (!user.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          status: "Error",
          message: "User ID tidak valid",
        });
      }
      query.userId = user;
    }

    // Validasi filter tanggal
    if (bulan && !tahun) {
      return res.status(400).json({
        status: "Error",
        message: "Tahun harus diisi jika ingin memfilter berdasarkan bulan.",
      });
    }

    // Jika tahun saja (tanpa bulan)
    if (tahun && !bulan) {
      const start = new Date(tahun, 0, 1);
      const end = new Date(Number(tahun) + 1, 0, 1);
      query.date = { $gte: start, $lt: end };
    }

    // filter bulan/tahun
    if (bulan && tahun) {
      const start = new Date(tahun, bulan - 1, 1);
      const end = new Date(tahun, bulan, 1);
      query.date = { $gte: start, $lt: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ambil data + total
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate("userId", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query),
    ]);

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil semua transaksi",
      data: transactions.map((tx) => ({
        _id: tx._id,
        date: tx.date,
        customerName: tx.customerName,
        amount: tx.amount,
        user: tx.userId,
        orderItems: tx.orderItems,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil data transaksi",
      error: err.message,
    });
  }
};

const getSystemReport = async (req, res) => {
  try {
    const { bulan, tahun } = req.query;

    if (!tahun) {
      return res.status(400).json({
        status: "Error",
        message: "Tahun wajib diisi",
      });
    }

    let dateFilter = {};
    if (bulan) {
      const bulanNum = Number(bulan);
      const start = new Date(tahun, bulanNum - 1, 1);
      const end = new Date(tahun, bulanNum, 1);
      dateFilter = { date: { $gte: start, $lt: end } };
    }

    const users = await User.find({ role: "user" });

    const reportData = [];

    for (const user of users) {
      const [userTransactions, userExpenses] = await Promise.all([
        Transaction.find({ userId: user._id, ...dateFilter }),
        Expense.find({ userId: user._id, ...dateFilter }),
      ]);

      const totalIncome = userTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
      const totalExpense = userExpenses.reduce((sum, ex) => sum + ex.amount, 0);
      const profit = totalIncome - totalExpense;

      reportData.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        totalIncome,
        totalExpense,
        profit,
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Laporan sistem berhasil diambil",
      periode: bulan ? `${bulan}-${tahun}` : tahun,
      data: reportData,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil laporan sistem",
      error: err.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getUsers,
  getUser,
  updateUserByAdmin,
  getActivityLogs,
  getAllTransactions,
  getSystemReport,
};
