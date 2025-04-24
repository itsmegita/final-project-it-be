const fs = require("fs");
const Transaction = require("../models/Transaction");
const Menu = require("../models/Menu");
const FoodProduct = require("../models/FoodProduct");
const { createNotification } = require("../utils/notificationHelper");
const mongoose = require("mongoose");

const convertToBaseUnit = (quantity, fromUnit, toUnit) => {
  const conversion = {
    gram: { kg: (qty) => qty / 1000 },
    kg: { gram: (qty) => qty * 1000 },
    ml: { liter: (qty) => qty / 1000 },
    liter: { ml: (qty) => qty * 1000 },
    pcs: { pcs: (qty) => qty },
  };
  if (fromUnit === toUnit) return quantity;
  const converter = conversion[fromUnit]?.[toUnit];
  if (!converter)
    throw new Error(`Konversi dari ${fromUnit} ke ${toUnit} tidak didukung`);
  return converter(quantity);
};

const createTransaction = async (req, res) => {
  try {
    const { orderItems, date, customerName } = req.body;

    // Validasi dasar
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        status: "Error",
        message:
          "Daftar pesanan (orderItems) wajib diisi dan harus berupa array.",
      });
    }

    let totalAmount = 0;
    const stockChanges = [];

    // Proses setiap item pesanan
    for (const item of orderItems) {
      const { menuItem, quantity, price } = item;

      if (!menuItem || !quantity || !price) {
        return res.status(400).json({
          status: "Error",
          message:
            "Setiap item pesanan harus memiliki menuItem, quantity, dan price.",
        });
      }

      const menuData = await Menu.findOne({
        _id: menuItem,
        deletedAt: { $exists: false },
      });
      if (!menuData) {
        return res.status(404).json({
          status: "Error",
          message: `Menu dengan ID '${menuItem}' tidak ditemukan atau sudah dihapus.`,
        });
      }

      totalAmount += price * quantity;

      // Periksa stok bahan baku
      for (const ingredient of menuData.ingredients) {
        const foodProduct = await FoodProduct.findById(
          ingredient.foodProductId
        );
        if (!foodProduct) continue;

        if (!ingredient.unit || !foodProduct.unit) {
          return res.status(400).json({
            status: "Error",
            message: `Unit tidak tersedia untuk bahan baku '${foodProduct.name}'.`,
          });
        }

        let totalUsed;
        try {
          totalUsed = convertToBaseUnit(
            ingredient.quantity * quantity,
            ingredient.unit,
            foodProduct.unit
          );
        } catch (err) {
          return res.status(400).json({
            status: "Error",
            message: err.message,
          });
        }

        const remainingStock = foodProduct.stock - totalUsed;

        if (remainingStock < 0) {
          return res.status(400).json({
            status: "Error",
            message: `Stok '${foodProduct.name}' tidak mencukupi untuk menu '${menuData.name}'.`,
          });
        }

        stockChanges.push({ foodProduct, newStock: remainingStock });
      }
    }

    // Simpan perubahan stok
    for (const change of stockChanges) {
      change.foodProduct.stock = change.newStock;
      await change.foodProduct.save();
    }

    // Simpan transaksi
    const newTransaction = new Transaction({
      userId: req.user.id,
      customerName: customerName?.trim() || "Pelanggan Umum",
      date: date || new Date(),
      orderItems,
      amount: totalAmount,
    });

    await newTransaction.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Transaksi baru ditambahkan",
      `Transaksi baru pada tanggal ${date} dengan customer '${customerName}' berhasil ditambahkan`
    );

    return res.status(201).json({
      status: "Success",
      message: "Transaksi berhasil dibuat.",
      transaction: newTransaction,
    });
  } catch (err) {
    console.error("Create Transaction Error:", err);
    return res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan pada server.",
      error: err.message,
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 5, month, year } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 5, 1);

    if (month && (isNaN(month) || month < 1 || month > 12)) {
      return res.status(400).json({
        status: "Error",
        message: "Parameter 'month' harus antara 1 sampai 12",
      });
    }

    if (year && isNaN(year)) {
      return res.status(400).json({
        status: "Error",
        message: "Parameter 'year' harus berupa angka",
      });
    }

    const filter = {};
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    // Total income untuk semua transaksi yang terfilter
    const totalIncomeResult = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, totalIncome: { $sum: "$amount" } } }
    ]);
    const totalIncome = totalIncomeResult[0]?.totalIncome || 0;

    // Mengambil transaksi dengan pagination
    const totalCount = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("orderItems.menuItem");

    return res.status(200).json({
      status: "Success",
      data: {
        transactions,
        totalIncome,
        totalData: totalCount,
        pagination: {
          totalPages: Math.ceil(totalCount / limitNum),
          currentPage: pageNum,
        },
      },
    });
  } catch (error) {
    console.error("Error getTransactions:", error);
    return res.status(500).json({
      status: "Error",
      message: "Gagal mengambil transaksi",
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      "orderItems.menuItem"
    );
    if (!transaction) {
      return res
        .status(404)
        .json({ status: "Error", message: "Transaction not found" });
    }
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

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderItems, date, customerName } = req.body;

    const existingTransaction = await Transaction.findById(id);
    if (!existingTransaction) {
      return res
        .status(404)
        .json({ status: "Error", message: "Transaksi tidak ditemukan" });
    }

    // Kembalikan stok bahan baku dari transaksi lama
    for (const oldItem of existingTransaction.orderItems) {
      const menuData = await Menu.findById(oldItem.menuItem);
      if (menuData) {
        for (const ingredient of menuData.ingredients) {
          const foodProduct = await FoodProduct.findById(
            ingredient.foodProductId
          );
          if (foodProduct) {
            const restored = convertToBaseUnit(
              ingredient.quantity * oldItem.quantity,
              ingredient.unit,
              foodProduct.unit
            );
            foodProduct.stock += restored;
            await foodProduct.save();
          }
        }
      }
    }

    // Perbarui data transaksi
    existingTransaction.orderItems =
      orderItems || existingTransaction.orderItems;
    existingTransaction.date = date || existingTransaction.date;
    existingTransaction.customerName =
      customerName || existingTransaction.customerName;

    // Kurangi stok sesuai transaksi baru
    for (const item of existingTransaction.orderItems) {
      const menuItemData = await Menu.findById(item.menuItem);
      if (!menuItemData) continue;

      for (const ingredient of menuItemData.ingredients) {
        const foodProduct = await FoodProduct.findById(
          ingredient.foodProductId
        );
        if (!foodProduct) continue;

        const used = convertToBaseUnit(
          ingredient.quantity * item.quantity,
          ingredient.unit,
          foodProduct.unit
        );
        foodProduct.stock -= used;
        if (foodProduct.stock < 0)
          return res.status(400).json({
            status: "Error",
            message: `Stok ${foodProduct.name} tidak cukup.`,
          });
        await foodProduct.save();
      }
    }

    // Hitung ulang total amount
    existingTransaction.amount = existingTransaction.orderItems.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    // Simpan transaksi yang sudah diperbarui
    await existingTransaction.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Transaksi diperbarui",
      `Transaksi pada customer '${customerName}' berhasil diperbarui`
    );

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil diperbarui",
      transaction: existingTransaction,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        status: "Error",
        message: `Tidak menemukan transaksi dengan id ${id}`,
      });
    }

    const transactionName = transaction.customerName;
    const transactionDate = transaction.date.toISOString().split("T")[0];

    // Restore stok
    for (const item of transaction.orderItems) {
      const menuData = await Menu.findById(item.menuItem);
      if (menuData) {
        for (const ingredient of menuData.ingredients) {
          const foodProduct = await FoodProduct.findById(
            ingredient.foodProductId
          );
          if (foodProduct) {
            const restored = convertToBaseUnit(
              ingredient.quantity * item.quantity,
              ingredient.unit,
              foodProduct.unit
            );
            foodProduct.stock += restored;
            await foodProduct.save();
          }
        }
      }
    }

    await Transaction.findByIdAndDelete(id);

    // notifikasi
    await createNotification(
      req.user.id,
      "Transaksi dihapus",
      `Transaksi pada customer '${transactionName}' pada tanggal '${transactionDate}' berhasil dihapus`
    );

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus transaksi",
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
};
