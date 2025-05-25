const bcrypt = require("bcryptjs");
const User = require("../models/User");
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
    const limit = parseInt(req.query.limit) || 25;
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

module.exports = {
  getAdminDashboard,
  getUsers,
  getUser,
  updateUserByAdmin,
  getActivityLogs,
};
