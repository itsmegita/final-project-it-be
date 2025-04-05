const fs = require("fs");
const Transaction = require("../models/Transaction");
const Menu = require("../models/Menu");
const FoodProduct = require("../models/FoodProduct");
const { exportToCSV } = require("../utils/exportToCSV");
const { createNotification } = require("../utils/notificationHelper");
const mongoose = require("mongoose");

// konversi satuan ke unit terkecil
const unitConversion = {
  kg: 1000,
  gram: 1,
  liter: 1000,
  ml: 1,
  pcs: 1,
};

// konversi stok ke unit terkecil
const convertToSmallestUnit = (amount, unit) => {
  return amount * (unitConversion[unit] || 1);
};

// konversi kembali ke unit asli
const convertToBaseUnit = (amount, unit) => {
  return amount / (unitConversion[unit] || 1);
};

// buat transaksi baru
const createTransaction = async (req, res) => {
  try {
    const { type, orderItems, transactionDate } = req.body;

    if (!type || !["Sale", "Purchase"].includes(type)) {
      return res
        .status(400)
        .json({ status: "Error", message: "Jenis transaksi tidak valid" });
    }

    // Validasi orderItems
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res
        .status(400)
        .json({ status: "Error", message: "orderItems tidak boleh kosong" });
    }

    for (const item of orderItems) {
      if (
        !item.menuItem ||
        !item.menuItemType ||
        !["Menu", "FoodProduct"].includes(item.menuItemType)
      ) {
        return res.status(400).json({
          status: "Error",
          message: "menuItem dan menuItemType harus valid",
        });
      }

      const model = item.menuItemType === "Menu" ? Menu : FoodProduct;
      const menuItemData = await model.findById(item.menuItem);

      if (!menuItemData) {
        return res.status(404).json({
          status: "Error",
          message: `ID ${item.menuItem} tidak ditemukan`,
        });
      }

      // Jika Sale, kurangi stok bahan baku berdasarkan resep
      if (type === "Sale") {
        for (const ingredient of menuItemData.ingredients) {
          const foodProduct = await FoodProduct.findById(
            ingredient.foodProduct
          );
          if (foodProduct) {
            foodProduct.stock -= ingredient.quantity * item.quantity;
            await foodProduct.save();
          }
        }
      }

      // Jika Purchase, tambahkan stok bahan baku
      if (type === "Purchase") {
        const foodProduct = await FoodProduct.findById(item.menuItem);
        if (foodProduct) {
          foodProduct.stock += item.quantity;
          await foodProduct.save();
        }
      }
    }

    const newTransaction = new Transaction({
      type,
      orderItems,
      transactionDate,
    });

    await newTransaction.save();

    res.status(201).json({
      status: "Success",
      message: "Transaksi berhasil dibuat",
      transaction: newTransaction,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

// get semua transaksi
const getTransactions = async (req, res) => {
  try {
    const {
      type,
      sortBy = "transactionDate",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const options = {
      sort: { [sortBy]: order === "desc" ? -1 : 1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit),
    };
    const transactions = await Transaction.find(filter, null, options).populate(
      "orderItems.menuItem"
    );
    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      status: "Success",
      message: "Data transaksi berhasil diambil",
      data: transactions,
      total,
      page,
      limit,
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
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      "orderItems.menuItem"
    );
    if (!transaction) {
      return res.status(404).json({
        status: "Error",
        message: "Transaction not found",
      });
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

// update transaksi
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, orderItems, transactionDate } = req.body;

    // 🛑 Ambil transaksi lama
    const existingTransaction = await Transaction.findById(id);
    if (!existingTransaction) {
      return res
        .status(404)
        .json({ status: "Error", message: "Transaksi tidak ditemukan" });
    }

    // 🔄 Rollback stok dari transaksi lama
    for (const oldItem of existingTransaction.orderItems) {
      if (oldItem.menuItemType === "Menu") {
        const menuData = await Menu.findById(oldItem.menuItem);
        if (menuData) {
          for (const ingredient of menuData.ingredients) {
            const foodProduct = await FoodProduct.findById(
              ingredient.foodProduct
            );
            if (foodProduct) {
              // Jika transaksi lama adalah Sale, stok harus dikembalikan
              if (existingTransaction.type === "Sale") {
                foodProduct.stock += ingredient.quantity * oldItem.quantity;
              }
              // Jika transaksi lama adalah Purchase, stok harus dikurangi
              else if (existingTransaction.type === "Purchase") {
                foodProduct.stock -= ingredient.quantity * oldItem.quantity;
              }
              await foodProduct.save();
            }
          }
        }
      } else if (oldItem.menuItemType === "FoodProduct") {
        const foodProduct = await FoodProduct.findById(oldItem.menuItem);
        if (foodProduct) {
          // Jika transaksi lama adalah Sale, stok dikembalikan
          if (existingTransaction.type === "Sale") {
            foodProduct.stock += oldItem.quantity;
          }
          // Jika transaksi lama adalah Purchase, stok dikurangi
          else if (existingTransaction.type === "Purchase") {
            foodProduct.stock -= oldItem.quantity;
          }
          await foodProduct.save();
        }
      }
    }

    // 🆕 Update transaksi dengan data baru
    existingTransaction.type = type || existingTransaction.type;
    existingTransaction.orderItems =
      orderItems || existingTransaction.orderItems;
    existingTransaction.transactionDate =
      transactionDate || existingTransaction.transactionDate;
    await existingTransaction.save();

    // 🔄 Update stok berdasarkan transaksi yang sudah diperbarui
    for (const newItem of existingTransaction.orderItems) {
      if (
        !newItem.menuItem ||
        !newItem.menuItemType ||
        !["Menu", "FoodProduct"].includes(newItem.menuItemType)
      ) {
        return res.status(400).json({
          status: "Error",
          message: "menuItem dan menuItemType harus valid",
        });
      }

      const model = newItem.menuItemType === "Menu" ? Menu : FoodProduct;
      const menuItemData = await model.findById(newItem.menuItem);

      if (!menuItemData) {
        return res.status(404).json({
          status: "Error",
          message: `ID ${newItem.menuItem} tidak ditemukan`,
        });
      }

      if (existingTransaction.type === "Sale") {
        // Jika transaksi baru adalah Sale, stok dikurangi
        if (newItem.menuItemType === "Menu") {
          for (const ingredient of menuItemData.ingredients) {
            const foodProduct = await FoodProduct.findById(
              ingredient.foodProduct
            );
            if (foodProduct) {
              foodProduct.stock -= ingredient.quantity * newItem.quantity;
              await foodProduct.save();
            }
          }
        } else if (newItem.menuItemType === "FoodProduct") {
          const foodProduct = await FoodProduct.findById(newItem.menuItem);
          if (foodProduct) {
            foodProduct.stock -= newItem.quantity;
            await foodProduct.save();
          }
        }
      }

      if (existingTransaction.type === "Purchase") {
        // Jika transaksi baru adalah Purchase, stok ditambahkan
        const foodProduct = await FoodProduct.findById(newItem.menuItem);
        if (foodProduct) {
          foodProduct.stock += newItem.quantity;
          await foodProduct.save();
        }
      }
    }

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil diperbarui",
      transaction: existingTransaction,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

// delete transaksi
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
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // 🔄 Rollback stok sebelum menghapus transaksi
    for (const item of transaction.orderItems) {
      if (!item.menuItem || !item.menuItemType) continue;

      if (item.menuItemType === "Menu") {
        const menu = await Menu.findById(item.menuItem);
        if (!menu) continue;

        for (const ingredient of menu.ingredients) {
          const foodProduct = await FoodProduct.findById(
            ingredient.foodProduct
          );
          if (!foodProduct) continue;

          if (transaction.type === "Sale") {
            // Jika transaksi adalah penjualan, stok dikembalikan
            foodProduct.stock += ingredient.quantity * item.quantity;
          } else if (transaction.type === "Purchase") {
            // Jika transaksi adalah pembelian, stok dikurangi
            foodProduct.stock -= ingredient.quantity * item.quantity;
          }

          await foodProduct.save();
        }
      } else if (item.menuItemType === "FoodProduct") {
        const foodProduct = await FoodProduct.findById(item.menuItem);
        if (!foodProduct) continue;

        if (transaction.type === "Sale") {
          // Jika transaksi adalah penjualan, stok dikembalikan
          foodProduct.stock += item.quantity;
        } else if (transaction.type === "Purchase") {
          // Jika transaksi adalah pembelian, stok dikurangi
          foodProduct.stock -= item.quantity;
        }

        await foodProduct.save();
      }
    }

    // 🚮 Hapus transaksi setelah stok diperbaiki
    await transaction.deleteOne();

    res.status(200).json({
      status: "Success",
      message: "Transaksi berhasil dihapus dan stok diperbarui",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat menghapus transaksi",
      error: err.message,
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

    console.log(`File CSV tersedia di: ${filePath}`);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Kesalahan saat mengunduh CSV:", err);
        res.status(500).json({
          status: "Error",
          message: "Terjadi kesalahan saat mengunduh CSV",
        });
      }
      // Jangan langsung hapus file, beri delay untuk memastikan berhasil di-download
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Gagal menghapus file:", err);
          else console.log("File CSV dihapus setelah diunduh.");
        });
      }, 30 * 60 * 1000);
    });
  } catch (err) {
    console.error("Terjadi kesalahan server:", err);
    res.status(500).json({
      status: "Error",
      message: "Gagal mengekspor file csv",
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
