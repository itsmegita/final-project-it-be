// Mendapatkan profile dari user
const getUserProfile = async (req, res, next) => {
  try {
    // memastikan req.user ada
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: "Error",
        message: "Token tidak valid atau kadaluwarsa",
      });
    }

    // ambil data user berdasarkan id dari token (kecuali password)
    const user = await User.findById(req.user.id).select("-password");

    // cek jika user ada
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Profile berhasil diambil",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

// Update profile
const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    // cek apakah ada data untuk diperbarui
    if (!name) {
      return res.status(400).json({
        status: "Error",
        message: "Nama tidak boleh kosong",
      });
    }

    // cari user berdasarkan id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "Error",
        message: "User tidak ditemukan",
      });
    }

    // update name
    user.name = name || user.name;

    // simpan perubahan
    await user.save();

    res.status(200).json({
      status: "Success",
      message: "Profile berhasil diperbarui",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server",
      error: err.message,
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};
