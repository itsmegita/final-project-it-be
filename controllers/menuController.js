const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const { createNotification } = require("../utils/notificationHelper");

// tambah menu baru
const createMenu = async (req, res) => {
  try {
    const { name, category, price, description, image } = req.body;

    // validasi
    if (!name || name.length < 3 || name.length > 100) {
      return res.status(400).json({
        status: "Error",
        message: "Nama menu harus antara 3-100 karakter",
      });
    }

    if (!category || !["Makanan", "Minuman", "Lainnya"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus Makanan, Minuman, atau lainnya",
      });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus berupa angka dan tidak boleh negatif",
      });
    }

    if (image && !image.startsWith("http")) {
      return res.status(400).json({
        status: "Error",
        message: "URL gambar tidak valid",
      });
    }

    const newMenu = new Menu({
      userId: req.user.id,
      name,
      category,
      price,
      description,
      image,
    });
    await newMenu.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Menu baru ditambahkan",
      `Menu '${name}' berhasil ditambahkan`
    );

    res.status(201).json({
      status: "Success",
      message: "Menu berhasil ditambahkan",
      data: newMenu,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menambahkan menu",
      error: err.message,
    });
  }
};

// ambil semua menu
const getMenus = async (req, res) => {
  try {
    const menus = await Menu.find({ userId: req.user.id });

    if (!menus.length) {
      return res.status(200).json({
        status: "Success",
        message: "Belum ada menu yang tersedia",
        data: [],
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Berhasil mengambil semua menu",
      data: menus,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil menu",
      error: err.message,
    });
  }
};

// ambil menu berdasarkan id
const getMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID menu tidak valid",
      });
    }

    const menu = await Menu.findOne({ _id: id, userId: req.user.id });

    if (!menu) {
      return res.status(404).json({
        status: "Error",
        message: "Menu tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "Success",
      message: `Berhasil mengambil data menu dengan id ${req.params.id}`,
      data: menu,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal mengambil menu",
      error: err.message,
    });
  }
};

// update menu
const updateMenu = async (req, res) => {
  try {
    const { name, category, price, description, image } = req.body;
    const { id } = req.params;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID menu tidak valid",
      });
    }

    const menu = await Menu.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!menu) {
      return res.status(404).json({
        status: "Error",
        message: "Menu tidak ditemukan",
      });
    }

    // validasi data yang di update
    if (name && (name.length < 3 || name.length > 100)) {
      return res.status(400).json({
        status: "Error",
        message: "Nama menu harus antara 3 - 100 karakter",
      });
    }
    if (category && !["Makanan", "Minuman", "Lainnya"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus berupa Makanan, Minuman, atau Lainnya",
      });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus angka dan tidak boleh negatif",
      });
    }
    if (image && !image.startsWith("http")) {
      return res.status(400).json({
        status: "Error",
        message: "URL gambar tidak valid",
      });
    }

    // update data
    menu.name = name || menu.name;
    menu.category = category || menu.category;
    menu.price = price !== undefined ? price : menu.price;
    menu.description = description || menu.description;
    menu.image = image || menu.image;

    await menu.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Menu diperbarui",
      `Menu '${menu.name}' berhasil diperbarui`
    );

    res.status(200).json({
      status: "Success",
      message: "Menu berhasil diperbarui",
      data: menu,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui menu",
      error: err.message,
    });
  }
};

// hapus menu
const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // validasi id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID menu tidak valid",
      });
    }

    const menu = await Menu.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!menu) {
      return res.status(404).json({
        status: "Error",
        message: "Menu tidak ditemukan",
      });
    }

    await menu.deleteOne();

    // notifikasi
    await createNotification(
      req.user.id,
      "Menu dihapus",
      `Menu '${menu.name}' berhasil dihapus`
    );

    res.status(200).json({
      status: "Success",
      message: "Menu berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal menghapus menu",
      error: err.message,
    });
  }
};

module.exports = {
  createMenu,
  getMenus,
  getMenu,
  updateMenu,
  deleteMenu,
};
