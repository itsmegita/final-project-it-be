const User = require("../models/User");
const bcrypt = require("bcryptjs");

// get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    // cek apakah user ada
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Berhasil mendapatkan data user",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil data user",
      error: err.message,
    });
  }
};

// update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    // update & update nama jika ada
    if (name) {
      if (name.length < 3 || name.length > 50) {
        return res.status(400).json({
          status: "Error",
          message: "Nama harus antara 3 - 50 karakter",
        });
      }
      user.name = name;
    }

    await user.save();
    res.status(200).json({
      status: "Success",
      message: "Berhasil memperbarui profile",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui profil",
      error: err.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // pastikan input ada
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: "Error",
        message: "Current password dan new password wajib diisi",
      });
    }

    // validasi format password baru
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        status: "Error",
        message:
          "Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol",
      });
    }

    // cari user berdasarkan id
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    // bandingkan password lama
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: "Error",
        message: "Password lama salah",
      });
    }

    // hash password baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // simpan password baru
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      status: "Success",
      message: "Password berhasil diubah",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengubah password",
      error: err.message,
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
};
