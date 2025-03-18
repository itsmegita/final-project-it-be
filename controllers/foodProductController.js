const mongoose = require("mongoose");
const FoodProduct = require("../models/FoodProduct");
const { createNotification } = require("../utils/notificationHelper");

// tambah bahan baku baru
const createFoodProduct = async (req, res) => {
  try {
    const { name, category, stock, unit, price } = req.body;

    // validasi input
    if (!name || name.length < 3 || name.length > 100) {
      return res.status(400).json({
        status: "Error",
        message: "Nama harus antara 3 - 100 karakter",
      });
    }
    if (!category || !["Bahan Pokok", "Bumbu", "Minuman"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus berupa Bahan Pokok, Bumbu,  atau Minuman",
      });
    }
    if (stock === undefined || isNaN(stock) || stock < 0) {
      return res.status(400).json({
        status: "Error",
        message: "Stock harus berupa angka dan tidak boleh negatif",
      });
    }
    if (!unit || !["Kg", "Gram", "Liter", "Mililiter", "Pcs"].includes(unit)) {
      return res.status(400).json({
        status: "Error",
        message: "Unit harus: Kg, Gram, Liter, Mililiter, atau Pcs",
      });
    }
    if (price === undefined || isNaN(price) || price < 0) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus berupa angka dan tidak boleh negatif",
      });
    }

    // simpan ke database
    const newFoodproduct = new FoodProduct({
      userId: req.user.id,
      name,
      category,
      stock,
      unit,
      price,
    });
    await newFoodproduct.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Bahan Baku baru ditambahkan",
      `Bahan baku ${name} berhasil ditambahkan sebanyak ${stock} ${unit}`
    );

    res.status(201).json({
      status: "Success",
      message: "Food product berhasil ditambahkan",
      data: newFoodproduct,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menambahkan food product",
      error: err.message,
    });
  }
};

// mengambil semua data bahan baku
const getFoodProducts = async (req, res) => {
  try {
    const foodProducts = await FoodProduct.find({ userId: req.user.id });

    res.status(200).json({
      status: "Success",
      message: foodProducts.length
        ? "Berhasil mengambil semua food product"
        : "Belum ada food product yang tersedia",
      data: foodProducts,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil food products",
      error: err.message,
    });
  }
};

// mengambil data bahan baku berdasarkan user id
const getFoodProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID Food product tidak valid",
      });
    }

    const foodProduct = await FoodProduct.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!foodProduct) {
      return res.status(404).json({
        status: "Error",
        message: "Food product tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: `Berhasil mengambil data food product dengan id ${id}`,
      data: foodProduct,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil food product",
      error: err.message,
    });
  }
};

// update data bahan baku
const updateFoodProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, stock, unit, price, description } = req.body;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID food product tidak valid",
      });
    }

    const foodProduct = await FoodProduct.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!foodProduct) {
      return res.status(404).json({
        status: "Error",
        message: "Food product tidak ditemukan",
      });
    }

    // validasi data jika ada perubahan
    if (name && (name.length < 3 || name.length > 100)) {
      return res.status(400).json({
        status: "Error",
        message: "Nama harus antara 3 - 100 karakter",
      });
    }
    if (
      category &&
      !["Bahan Pokok", "Bumbu", "Minuman", "Lainnya"].includes(category)
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus: Bahan Pokok, Bumbu, Minuman, atau Lainnya",
      });
    }
    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({
        status: "Error",
        message: "Stock harus berupa angka dan tidak boleh negatif",
      });
    }
    if (unit && !["Kg", "Gram", "Liter", "Mililiter", "Pcs"].includes(unit)) {
      return res.status(400).json({
        status: "Error",
        message: "Unit harus: Kg, Gram, Liter, Mililiter, atau Pcs",
      });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus berupa angka dan tidak boleh negatif",
      });
    }
    if (description && description.length > 500) {
      return res.status(400).json({
        status: "Error",
        message: "Deskripsi maksimal 500 karakter",
      });
    }

    // update data
    foodProduct.name = name || foodProduct.name;
    foodProduct.category = category || foodProduct.category;
    foodProduct.stock = stock !== undefined ? stock : foodProduct.stock;
    foodProduct.unit = unit || foodProduct.unit;
    foodProduct.price = price !== undefined ? price : foodProduct.price;
    foodProduct.description = description || foodProduct.description;

    await foodProduct.save();

    // notifikasi
    await Notification.create({
      userId: req.user.id,
      message: `Bahan baku ${foodProduct.name} berhasil diperbarui`,
    });

    res.status(200).json({
      status: "Success",
      message: `Food product dengan id ${req.params.id} berhasil diperbarui`,
      data: foodProduct,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui food product",
      error: err.message,
    });
  }
};

// hapus data bahan baku
const deleteFoodProduct = async (req, res) => {
  try {
    const id = req.params.id;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID food product tidak valid",
      });
    }

    // cari food prodsuct berdasarkan id dan userid
    const foodProduct = await FoodProduct.findOne({
      _id: id,
      userId: req.user.id,
    });

    // jika tidak ditemukan
    if (!foodProduct) {
      return res.status(404).json({
        status: "Error",
        message: "Food product tidak ditemukan atau tidak memiliki akses",
      });
    }

    // hapus food product
    await foodProduct.deleteOne();

    // notifikasi
    await Notification.create({
      userId: req.user.id,
      message: `Bahan baku ${foodProduct.name} berhasil dihapus`,
    });

    res.status(200).json({
      status: "Success",
      message: `Berhasil menghapus food product dengan id ${req.params.id}`,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus food products",
      error: err.message,
    });
  }
};

module.exports = {
  createFoodProduct,
  getFoodProducts,
  getFoodProduct,
  updateFoodProduct,
  deleteFoodProduct,
};
