const Expense = require("../models/Expense");
const { createNotification } = require("../utils/notificationHelper");
const mongoose = require("mongoose");

// buat expense baru
const createExpense = async (req, res) => {
  try {
    const { category, amount, description, date, paymentMethod, items } =
      req.body;
    const userId = req.user.id;

    if (!category || !amount || !paymentMethod) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori, jumlah, dan metode pembayaran harus diisi",
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        status: "Error",
        message: "Jumlah pengeluaran harus berupa angka positif",
      });
    }

    // Validasi item jika kategori adalah Pembelian Bahan Baku
    if (category === "Pembelian Bahan Baku") {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: "Error",
          message: "Detail pembelian bahan baku (items) wajib diisi",
        });
      }

      for (const item of items) {
        if (
          !item.foodProductId ||
          typeof item.quantity !== "number" ||
          item.quantity <= 0 ||
          !item.unit ||
          typeof item.price !== "number" ||
          item.price <= 0
        ) {
          return res.status(400).json({
            status: "Error",
            message:
              "Semua item harus memiliki foodProductId, quantity (>0), unit, dan price (>0)",
          });
        }
      }
    }

    const expense = new Expense({
      userId,
      category,
      amount,
      description,
      date: date || new Date(),
      paymentMethod,
      items: category === "Pembelian Bahan Baku" ? items : [],
    });

    await expense.save();

    // notifikasi
    await createNotification(
      userId,
      "Pengeluaran Baru",
      `Pengeluaran sebesar Rp${amount} dengan kategori ${category} telah ditambahkan`
    );

    res.status(201).json({
      status: "Success",
      message: "Pengeluaran berhasil dibuat",
      expense,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat membuat pengeluaran",
      error: err.message,
    });
  }
};

// get semua pengeluaran dengan filter berdasarkan category, bulan dan tahun, serta pagination
const getExpenses = async (req, res) => {
  try {
    const { category, month, year, sort, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    let filter = { userId };

    // filter berdasarkan kategori
    if (category) filter.category = category;

    // filter berdasarkan bulan dan tahun
    let startDate, endDate;
    if (month || year) {
      filter.date = {};
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();

      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

      filter.date.$gte = startDate;
      filter.date.$lte = endDate;
    }

    // sorting
    let sortOption = { date: -1, _id: -1 };
    if (sort === "oldest") sortOption = { date: 1 };

    // pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Ambil data pengeluaran
    const expenses = await Expense.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    const totalExpenses = await Expense.countDocuments(filter);

    // Hitung total pengeluaran bulan tersebut (tanpa skip/limit)
    let totalMonthlyExpense = 0;
    if (startDate && endDate) {
      const monthlyExpenses = await Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      if (monthlyExpenses.length > 0) {
        totalMonthlyExpense = monthlyExpenses[0].total;
      }
    }

    res.status(200).json({
      status: "Success",
      message: "Data pengeluaran berhasil diambil",
      total: totalExpenses,
      page: pageNumber,
      limit: limitNumber,
      expenses,
      totalMonthlyExpense,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil data pengeluaran",
      error: err.message,
    });
  }
};

// get detail pengeluaran
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({
        status: "Error",
        message: "Pengeluaran tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Pengeluaran ditemukan",
      expense,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil data pengeluaran",
      error: err.message,
    });
  }
};

// update pengeluaran
const updateExpense = async (req, res) => {
  try {
    const { category, amount, description, date, paymentMethod, items } =
      req.body;
    const updateFields = {};

    if (category) updateFields.category = category;
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          status: "Error",
          message: "Jumlah pengeluaran harus berupa angka positif",
        });
      }
      updateFields.amount = amount;
    }
    if (description) updateFields.description = description;
    if (date) updateFields.date = date;
    if (paymentMethod) updateFields.paymentMethod = paymentMethod;

    if (category === "Pembelian Bahan Baku") {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: "Error",
          message: "Detail pembelian bahan baku (items) wajib diisi",
        });
      }

      for (const item of items) {
        if (
          !item.foodProductId ||
          typeof item.quantity !== "number" ||
          item.quantity <= 0 ||
          !item.unit ||
          typeof item.price !== "number" ||
          item.price <= 0
        ) {
          return res.status(400).json({
            status: "Error",
            message:
              "Semua item harus memiliki foodProductId, quantity (>0), unit, dan price (>0)",
          });
        }
      }

      updateFields.items = items;
    } else {
      updateFields.items = [];
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        status: "Error",
        message: "Tidak ada data yang diperbarui",
      });
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateFields,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        status: "Error",
        message: "Pengeluaran tidak ditemukan",
      });
    }

    // notifikasi
    await createNotification(
      req.user.id,
      "Pengeluaran Diperbarui",
      `Pengeluaran pada tanggal ${date} sebesar Rp${expense.amount} telah diperbarui`
    );

    res.status(200).json({
      status: "Success",
      message: "Pengeluaran berhasil diperbarui",
      expense,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengubah data pengeluaran",
      error: err.message,
    });
  }
};

// hapus pengeluaran
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({
        status: "Error",
        message: "Pengeluaran tidak ditemukan",
      });
    }

    // notifikasi
    await createNotification(
      userId,
      "Pengeluaran Dihapus",
      `Pengeluaran pada tanggal ${date} sebesar Rp${amount} pada kategori ${category} telah dihapus`
    );

    res.status(200).json({
      status: "Success",
      message: "Pengeluaran berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus data pengeluaran",
      error: err.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
};
