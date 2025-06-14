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
    const {
      type,
      status,
      month,
      year,
      sort,
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const filter = { userId: req.user.id };

    // filter berdasarkan jenis
    if (type && type.trim() !== "") {
      filter.type = type;
    }

    // filter berdasarkan status
    if (status && status.trim() !== "") {
      filter.status = status;
    }

    // filter berdasarkan bulan dan tahun
    if (month && year) {
      const monthInt = parseInt(month);
      const yearInt = parseInt(year);

      if (
        !isNaN(monthInt) &&
        !isNaN(yearInt) &&
        monthInt >= 1 &&
        monthInt <= 12
      ) {
        const startDate = new Date(yearInt, monthInt - 1, 1);
        const endDate = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);

        filter.dueDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // filter berdasarkan search
    if (search && search.trim() !== "") {
      filter.customerName = { $regex: search, $options: "i" };
    }

    // sorting
    const sortOption = {};
    if (sort) {
      if (sort === "date_asc") sortOption.dueDate = 1;
      else if (sort === "date_desc") sortOption.dueDate = -1;
      else if (sort === "amount_asc") sortOption.amount = 1;
      else if (sort === "amount_desc") sortOption.amount = -1;
      else sortOption.dueDate = 1;
    } else {
      sortOption.dueDate = 1;
    }

    // pagination
    const currentPage = parseInt(page) || 1;
    const perPage = parseInt(limit) || 10;
    const skip = (currentPage - 1) * perPage;

    const totalData = await Debt.countDocuments(filter);
    const totalPages = Math.ceil(totalData / perPage);

    const data = await Debt.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(perPage)
      .lean();

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil data hutang/piutang",
      data,
      pagination: {
        totalData,
        totalPages,
        currentPage,
        perPage,
      },
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

    const debt = await Debt.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!debt) {
      return res.status(404).json({
        status: "Error",
        message: "Data tidak ditemukan",
      });
    }

    const debtName = debt.customerName;
    const debtAmount = debt.amount;
    const userId = req.user.id;

    // notifikasi
    await createNotification(
      userId,
      `Hutang/Piutang Dihapus`,
      `Hutang/Piutang oleh ${debtName} sebesar Rp${debtAmount} telah dihapus`
    );

    // hapus data
    await Debt.deleteOne({ _id: id });

    res.status(200).json({
      status: "Success",
      message: `Data dengan id ${id} berhasil dihapus`,
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
