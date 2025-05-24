const { mongoose } = require("mongoose");
const Notification = require("../models/Notification");

// mengambil data semua notifikasi
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({ userId: req.user.id }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "Success",
      message: "Berhasil mendapatkan notifikasi",
      data: {
        notifications,
        pagination: totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mendapatkan notifikasi",
      error: err.message,
    });
  }
};

// menandai notifikasi sebagai dibaca
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID notifikasi tidak valid",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        status: "Error",
        message: "Notifikasi tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Notifikasi ditandai sebagai dibaca",
      data: notification,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menandai notifikasi",
      error: err.message,
    });
  }
};

// menghapus notifikasi
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID notifikasi tidak valid",
      });
    }

    const deletedNotification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!deletedNotification) {
      return res.status(404).json({
        status: "Error",
        message: "Notifikasi tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Notifikasi berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus notifikasi",
    });
  }
};

// menghapus semua notifikasi
const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });

    res.status(200).json({
      status: "Success",
      message: "Semua notifikasi berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus semua notifikasi",
      error: err.message,
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications,
};
