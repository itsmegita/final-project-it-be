const Debt = require("../models/DebtReceivable");
const { createNotification } = require("../utils/notificationHelper");

// tambah hutang/piutang
const createDebt = async (req, res) => {
  try {
    const { customerName, type, amount, dueDate, description } = req.body;
    const userId = req.user.id;

    // validasi input
    if (!customerName || !type || !amount || !dueDate) {
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

    const newDebt = new Debt({
      userId: req.user.id,
      customerName,
      type,
      amount,
      dueDate,
      description,
    });

    await newDebt.save();

    // notifikasi
    await createNotification(
      userId,
      `Hutang/Piutang Baru`,
      `Hutang/Piutang Baru oleh ${customerName} sebesar Rp${amount}`
    );

    res.status(201).json({
      status: "Success",
      message: "Data hutang/piutang berhasil ditambahkan",
      data: newDebt,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menambahkan data hutang/piutang",
      message: err.message,
    });
  }
};

// get semua hutang/piutang
const getAllDebtss = async (req, res) => {
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
    const data = await Debt.find(filter).sort(sortOption).lean();

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data hutang/piutang",
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mendapatkan data hutang/piutang",
      error: err.message,
    });
  }
};

// get detail hutang/piutang
const getDebtById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Debt.findOne({
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
      message: `Gagal mengambil data hutang/piutang pada user dengan ID ${req.params.id}`,
      error: err.message,
    });
  }
};

// update hutang/piutang
const updateDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, type, amount, dueDate, description } = req.body;

    const debt = await Debt.findOne({ _id: id, userId: req.user.id });
    if (!debt)
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });

    if (amount && (isNaN(amount) || amount <= 0)) {
      return res.status(400).json({
        status: "Error",
        message: "Jumlah harus berupa angka positif",
      });
    }

    if (dueDate && isNaN(Date.parse(dueDate))) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal jatuh tempo tidak valid",
      });
    }

    const updatedDebt = await Debt.findByIdAndUpdate(
      id,
      { customerName, type, amount, dueDate, description },
      { new: true, runValidators: true }
    );

    // notifikasi
    await createNotification(
      userId,
      `Hutang/Piutang Diubah`,
      `Hutang/Piutang oleh ${customerName} diubah`
    );

    res.status(200).json({
      status: "Success",
      message: "Data hutang/piutang berhasil diperbarui",
      data: updatedDebt,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui data hutang/piutang",
      error: err.message,
    });
  }
};

// update status menjadi lunas
const markDebtAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const debt = await Debt.findOne({ _id: id, userId: req.user.id });

    // validasi jika tidak ada data debt
    if (!debt) {
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });
    }

    // validasi jika debt = lunas
    if (debt.status === "Lunas") {
      return res.status(400).json({
        status: "Error",
        message: "Data sudah lunas",
      });
    }

    debt.status = "Lunas";
    await debt.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Hutang/Piutang Lunas",
      `Hutang/Piutang sebesar Rp${debt.amount} dari ${debt.customerName} telah lunas`
    );

    res.status(200).json({
      status: "Success",
      message: "Status hutang/piutang berhasil diperbarui",
      data: debt,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengubah status hutang/piutang",
      error: err.message,
    });
  }
};

// hapus hutang/piutang
const deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedData = await Debt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedData) {
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });
    }

    // notifikasi
    await createNotification(
      userId,
      `Hutang/Piutang Dihapus`,
      `Hutang/Piutang oleh ${customerName} sebesar Rp${amount} telah dihapus`
    );

    res.status(200).json({
      status: "Success",
      message: `Data dengan id ${req.params.id} berhasil dihapus`,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus data hutang/piutang",
      error: err.message,
    });
  }
};

module.exports = {
  createDebt,
  getAllDebtss,
  getDebtById,
  updateDebt,
  markDebtAsPaid,
  deleteDebt,
};
