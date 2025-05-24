const ActivityLog = require("../models/ActivityLog");

const createActivityLog = async (req, res) => {
  try {
    const { type } = req.body;

    if (!["login", "logout"].includes(type)) {
      return res.status(400).json({ message: "Tipe log tidak valid" });
    }

    await ActivityLog.create({
      user: req.user.id,
      type,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Log aktivitas berhasil dicatat" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mencatat log aktivitas", error: err.message });
  }
};

module.exports = { createActivityLog };
