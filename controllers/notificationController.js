const { mongoose } = require("mongoose");
const Notification = require("../models/Notification");

// mengambil data semua notifikasi
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "Success",
      message: "Berhasil mendapatkan notifikasi",
      data: notifications,
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
const markAsRead = async (req, res) => {
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

// menandai semua notifikasi sebagai dibaca
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      status: "Success",
      message: "Semua notifikasi ditandai sebagai dibaca",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menandai semua notifikasi",
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

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!notification) {
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
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
