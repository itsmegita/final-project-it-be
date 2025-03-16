const DebtReceivable = require("../models/DebtReceivable");
const moment = require("moment");
const mongoose = require("mongoose");
const { createNotification } = require("../utils/notificationHelper");

// tambah hutang/piutang
const createDebtReceivable = async (req, res) => {
  try {
    const { name, type, amount, dueDate, category, notes } = req.body;

    // validasi input
    if (!name || !type || !amount || !dueDate) {
      return res.status(400).json({
        status: "Error",
        message: "Data tidak lengkap",
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        status: "Error",
        message: "Jumlah harus berupa angka positif",
      });
    }

    if (isNaN(Date.parse(dueDate))) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal jatuh tempo tidak valid",
      });
    }

    const newDebtReceivable = new DebtReceivable({
      userId: req.user.id,
      name,
      type,
      amount,
      dueDate,
      category,
      notes,
    });

    await newDebtReceivable.save();

    // notifikasi
    await createNotification(
      userId,
      "Hutang/Piutang Baru",
      `Hutang/Piutang sebesar Rp{amount} telah ditambahkan`
    );

    res.status(201).json({
      status: "Success",
      message: "Data hutang/piutang berhasil ditambahkan",
      data: newDebtReceivable,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan server",
      message: err.message,
    });
  }
};

// get semua hutang/piutang
const getAllDebtsReceivables = async (req, res) => {
  try {
    const { type, status, startDate, endDate, sort } = req.query;
    let filter = { userId: req.user.id };

    // filter berdasarkan jenis
    if (type) {
      filter.type = type;
    }

    // filter berdasarkan status lunas/belum lunas
    if (status) {
      filter.status = status;
    }

    // filter berdasarkan rentang tanggal
    if (startDate && endDate) {
      filter.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.dueDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.dueDate = { $lte: new Date(endDate) };
    }

    // sorting
    let sortOption = {};
    if (sort) {
      if (sort === "date_asc") sortOption.dueDate = 1;
      if (sort === "date_desc") sortOption.dueDate = -1;
      if (sort === "amount_asc") sortOption.amount = 1;
      if (sort === "amount_desc") sortOption.amount = -1;
    } else {
      sortOption.dueDate = 1;
    }

    // ambil data dari database
    const data = await DebtReceivable.find(filter).sort(sortOption).lean();

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data hutang/piutang",
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

// get detail hutang/piutang
const getDebtReceivableById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID tidak valid",
      });
    }

    const data = await DebtReceivable.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!data) {
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: `Berhasil mengambil data dengan id ${req.params.id}`,
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
};

// update hutang/piutang
const updateDebtReceivable = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID tidak valid",
      });
    }

    const updateFields = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined && req.body[key] !== "") {
        updateFields[key] = req.body[key];
      }
    });

    if (
      updateFields.amount &&
      (isNaN(updateFields.amount) || updateFields.amount <= 0)
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Jumlah harus berupa angka positif",
      });
    }

    if (updateFields.dueDate && isNaN(Date.parse(updateFields.dueDate))) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal jatuh tempo tidak valid",
      });
    }

    const existingData = await DebtReceivable.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!existingData)
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });

    const updatedData = await DebtReceivable.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateFields },
      { new: true }
    );

    if (updateFields.status === "Lunas" && existingData.status !== "Lunas") {
      await createNotification(
        req.user.id,
        "Hutang/Piutang Lunas",
        `Hutang/Piutang sebesar Rp${existingData.amount} telah lunas`
      );
    }

    res.status(200).json({
      status: "Success",
      message: "Data hutang/piutang berhasil diperbarui",
      data: updatedData,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

// hapus hutang/piutang
const deleteDebtReceivable = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID tidak valid",
      });
    }

    const deletedData = await DebtReceivable.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedData) {
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: `Data dengan id ${req.params.id} berhasil dihapus`,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

// get daftar hutang/piutang yang jatuh tempo
const getDueDateReminders = async (req, res) => {
  try {
    // validasi user
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: "Error",
        message: "Unauthorized",
      });
    }

    // ambil tanggal hari ini dan 7 hari ke depan
    const today = moment().startOf("day");
    const nextWeek = moment().add(7, "days").endOf("day");
    const threeDaysBeforeDue = moment().add(3, "days").endOf("day");

    // ambil data dengan validasi userId dan rentang tanggal jatuh tempo
    const reminders = await DebtReceivable.find({
      userId: req.user.id,
      dueDate: { $gte: today.toDate(), $lte: nextWeek.toDate() },
    }).sort({ dueDate: 1 });

    // jika tidak ada data
    if (!reminders.length) {
      return res.status(404).json({
        status: "Error",
        message: "Tidak ada data pengingat jatuh tempo dalam 7 hari ke depan",
      });
    }

    // notifikasi
    for (const debt of reminders) {
      if (moment(debt.dueDate).isSame(threeDaysBeforeDue, "day")) {
        await createNotification(
          req.user.id,
          "Pengingat Jatuh Tempo",
          `Hutang/Piutang atas nama ${debt.name} akan jatuh tempo dalam 3 hari`
        );
      }
    }

    // kirim respon sukses
    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data pengingat jatuh tempo",
      data: reminders,
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
  createDebtReceivable,
  getAllDebtsReceivables,
  getDebtReceivableById,
  updateDebtReceivable,
  deleteDebtReceivable,
  getDueDateReminders,
};
