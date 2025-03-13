const fs = require("fs");
const Transaction = require("../models/Transaction");
const { exportToCSV } = require("../utils/exportToCSV");

// buat transaksi baru
const createTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const userId = req.user.id;

    // validasi input dasar
    if (!type || !amount || !category) {
      return res.status(400).json({
        status: "Error",
        message: "Data transaksi tidak lengkap",
      });
    }

    // membuat transaksi baru
    const transaction = new Transaction({
      userId,
      type,
      amount,
      category,
      description,
      date: date || new Date(),
    });

    await transaction.save();
    res.status(201).json({
      status: "Success",
      message: "Transaksi berhasil dibuat",
      transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat membuat transaksi",
      error: err.message,
    });
  }
};

// get semua transaksi
const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      sort,
      page = 1,
      limit = 10,
    } = req.query;
    const userId = req.user.id;
    let filter = { userId };

    // filter berdasarkan jenis transaksi
    if (type) filter.type = type;

    // filter berdasarkan kategori
    if (category) filter.category = category;

    // filter berdasarkan rentang tanggal
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }

    // sorting descending (terbaru duluan)
    let sortOption = { date: -1 };
    // sorting ascending (terlama duluan)
    if (sort === "oldest") {
      sortOption = { date: 1 };
    }

    // pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // query ke database dengan filter, sorting, dan pagination
    const transactions = await Transaction.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    // total jumlah transaksi untuk pagination
    const totalTransactions = await Transaction.countDocuments(filter);

    res.status(200).json({
      status: "Success",
      message: "Data transaksi berhasil diambil",
      total: totalTransactions,
      page: pageNumber,
      limit: limitNumber,
      transactions,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat mengambil transaksi",
      error: err.message,
    });
  }
};

// get 1 transaksi by id
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction)
      return res.status(404).json({
        status: "Error",
        message: "Transaksi tidak ditemukan",
      });

    res.status(200).json({
      status: "Success",
      message: `Transaksi dengan id ${req.params.id} ditemukan`,
      transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: `Terjadi kesalahan saat mengambil transaksi dengan id ${req.params.id}`,
      error: err.message,
    });
  }
};

// update transaksi
const updateTransaction = async (req, res, next) => {
  try {
    const updateFields = {};

    // looping hanya memasukkan field yang dikirim dalam request body
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined && req.body[key] !== "") {
        updateFields[key] = req.body[key];
      }
    });

    // jika tidak ada field yang dikirim, hentikan proses
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        status: "Error",
        message: "Tidak ada data yang diperbarui",
      });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateFields },
      { new: true }
    );

    if (!transaction)
      return res.status(404).json({
        status: "Error",
        message: "Transaksi tidak ditemukan",
      });

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil diperbarui",
      transaction,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat memperbarui transaksi",
      error: err.message,
    });
  }
};

// delete transaksi
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction)
      return res.status(404).json({
        status: "Error",
        message: "Transaksi tidak ditemukan",
      });

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan",
      err,
    });
  }
};

// export transaction ke csv
const exportTransactionsToCSV = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).lean();

    if (!transactions.length) {
      return res.status(404).json({
        status: "Error",
        message: "Tidak ada transaksi untuk diekspor",
      });
    }

    const fileName = `transactions-${Date.now()}.csv`;
    const filePath = await exportToCSV(transactions, fileName);

    console.log(`📂 File CSV tersedia di: ${filePath}`);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("❌ Kesalahan saat mengunduh CSV:", err);
        res.status(500).json({
          status: "Error",
          message: "Terjadi kesalahan saat mengunduh CSV",
        });
      }
      // Jangan langsung hapus file, beri delay 5 detik untuk memastikan berhasil di-download
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("⚠️ Gagal menghapus file:", err);
          else console.log("🗑️ File CSV dihapus setelah diunduh.");
        });
      }, 30 * 60 * 1000);
    });
  } catch (err) {
    console.error("❌ Terjadi kesalahan server:", err);
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactionsToCSV,
};
