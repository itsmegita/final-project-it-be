const Expense = require("../models/Expense");
const FoodProduct = require("../models/FoodProduct");
const { createNotification } = require("../utils/notificationHelper");
const mongoose = require("mongoose");

// buat pengeluaran baru
const createExpense = async (req, res) => {
  try {
    const { category, description, date, paymentMethod, items } = req.body;
    const userId = req.user.id;

    if (!category || !paymentMethod) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori dan metode pembayaran harus diisi",
      });
    }

    let amount = req.body.amount;
    let newItems = items || [];

    if (category === "Bahan Baku") {
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
          typeof item.price !== "number" ||
          item.price <= 0
        ) {
          return res.status(400).json({
            status: "Error",
            message:
              "Semua item harus memiliki foodProductId, quantity (>0), dan price (>0)",
          });
        }
      }

      // Hitung total amount berdasarkan item
      amount = 0;
      newItems = items.map((item) => {
        const total = item.quantity * item.price;
        amount += total;

        return {
          foodProductId: item.foodProductId,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
        };
      });
    } else {
      // Jika bukan kategori Bahan Baku, amount harus diisi manual
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          status: "Error",
          message: "Jumlah pengeluaran harus berupa angka positif",
        });
      }
    }

    const expense = new Expense({
      userId,
      category,
      amount,
      description,
      date: date || new Date(),
      paymentMethod,
      items: category === "Bahan Baku" ? newItems : [],
    });

    await expense.save();

    // Update stok jika kategori Bahan Baku
    if (category === "Bahan Baku" && newItems.length > 0) {
      for (const item of newItems) {
        await FoodProduct.findByIdAndUpdate(
          item.foodProductId,
          { $inc: { stock: item.quantity } },
          { new: true }
        );
      }
    }

    // Buat notifikasi
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

// get semua pengeluaran
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
    const { category, description, date, paymentMethod, items, amount } =
      req.body;
    const userId = req.user.id;

    const oldExpense = await Expense.findOne({ _id: req.params.id, userId });
    if (!oldExpense) {
      return res.status(404).json({
        status: "Error",
        message: "Pengeluaran tidak ditemukan",
      });
    }

    let newCategory = category || oldExpense.category;
    let newDescription =
      description !== undefined ? description : oldExpense.description;
    let newDate = date ? new Date(date) : oldExpense.date;
    let newPaymentMethod = paymentMethod || oldExpense.paymentMethod;
    let newAmount = oldExpense.amount;
    let newItems = [...oldExpense.items];

    if (newCategory === "Bahan Baku") {
      // Validasi: jika items kosong atau tidak dikirim, maka gagal
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: "Error",
          message: "Harap isi minimal satu item bahan baku",
        });
      }

      // Rollback stok bahan baku dari old items
      for (const oldItem of oldExpense.items) {
        await FoodProduct.findByIdAndUpdate(
          oldItem.foodProductId,
          { $inc: { stock: -oldItem.quantity } },
          { new: true }
        );
      }

      // Update atau tambah item satu per satu
      const updatedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const oldItem = oldExpense.items[i];

        const foodProductId =
          item.foodProductId || (oldItem ? oldItem.foodProductId : null);
        if (!foodProductId) {
          return res.status(400).json({
            status: "Error",
            message: `Item ke-${i + 1} tidak punya foodProductId`,
          });
        }

        const quantity =
          item.quantity !== undefined ? item.quantity : oldItem?.quantity;
        const price = item.price !== undefined ? item.price : oldItem?.price;
        const unit = item.unit !== undefined ? item.unit : oldItem?.unit;

        if (
          typeof quantity !== "number" ||
          quantity <= 0 ||
          typeof price !== "number" ||
          price <= 0 ||
          typeof unit !== "string"
        ) {
          return res.status(400).json({
            status: "Error",
            message: `Item ke-${
              i + 1
            } harus punya quantity (>0), price (>0), dan unit (string)`,
          });
        }

        updatedItems.push({
          foodProductId,
          quantity,
          price,
          unit,
          total: quantity * price,
        });
      }

      newItems = updatedItems;
      newAmount = newItems.reduce((acc, item) => acc + item.total, 0);

      // Update stok bahan baku berdasarkan newItems
      for (const item of newItems) {
        await FoodProduct.findByIdAndUpdate(
          item.foodProductId,
          { $inc: { stock: item.quantity } },
          { new: true }
        );
      }
    } else {
      // Kalau bukan kategori Bahan Baku
      newItems = [];
      if (amount !== undefined) {
        if (typeof amount !== "number" || amount <= 0) {
          return res.status(400).json({
            status: "Error",
            message: "Jumlah pengeluaran harus berupa angka positif",
          });
        }
        newAmount = amount;
      }
    }

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        category: newCategory,
        description: newDescription,
        date: newDate,
        paymentMethod: newPaymentMethod,
        amount: newAmount,
        items: newItems,
      },
      { new: true }
    );

    await createNotification(
      userId,
      "Pengeluaran Diperbarui",
      `Pengeluaran sebesar Rp${newAmount} dengan kategori ${newCategory} telah diperbarui`
    );

    res.status(200).json({
      status: "Success",
      message: "Pengeluaran berhasil diperbarui",
      expense: updatedExpense,
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
    const userId = req.user.id;

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId,
    });

    if (!expense) {
      return res.status(404).json({
        status: "Error",
        message: "Pengeluaran tidak ditemukan",
      });
    }

    // Kalau kategori Bahan Baku, kembalikan stok dulu
    if (expense.category === "Bahan Baku" && expense.items.length > 0) {
      for (const item of expense.items) {
        await FoodProduct.findByIdAndUpdate(
          item.foodProductId,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
      }
    }

    // Hapus pengeluaran setelah stok dikembalikan
    await Expense.deleteOne({ _id: expense._id });

    const expenseDate = expense.date.toISOString().split("T")[0];
    const expenseAmount = expense.amount;
    const expenseCategory = expense.category;

    // Notifikasi
    await createNotification(
      userId,
      "Pengeluaran Dihapus",
      `Pengeluaran pada tanggal ${expenseDate} sebesar Rp${expenseAmount} dengan kategori ${expenseCategory} telah dihapus`
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
