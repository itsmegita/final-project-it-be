const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Menu = require("../models/Menu");
const FoodProduct = require("../models/FoodProduct");
const { createNotification } = require("../utils/notificationHelper");

// tambah menu baru
const createMenu = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debugging log
    const { name, category, price, ingredients } = req.body;

    // validasi
    if (!name || name.length < 3 || name.length > 100) {
      return res.status(400).json({
        status: "Error",
        message: "Nama menu harus antara 3-100 karakter",
      });
    }

    if (!category || !["Makanan", "Minuman"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus Makanan atau Minuman",
      });
    }

    if (!price || isNaN(price) || price < 0) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus berupa angka dan tidak boleh negatif",
      });
    }

    if (
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Ingredients harus berupa array dan tidak boleh kosong",
      });
    }

    // proses pencarain id bahan baku
    const updatedIngredients = [];
    for (let item of ingredients) {
      let foodProduct;

      if (!item.foodProductId) {
        return res.status(400).json({
          status: "Error",
          message: "Setiap bahan baku harus memiliki nama",
        });
      }

      // jika foodproduct adalah objectid yang valid, cari berdasarkan id
      if (ObjectId.isValid(item.foodProductId)) {
        foodProduct = await FoodProduct.findById(item.foodProductId);
      } else {
        // jika bukan obejctid, cari berdasarkan nama bahan baku
        foodProduct = await FoodProduct.findOne({ name: item.foodProductId });
      }

      // jika bahan baku tidak ditemukan
      if (!foodProduct) {
        return res.status(400).json({
          status: "Error",
          message: `Bahan baku '${item.foodProductId}' tidak ditemukan di database`,
        });
      }

      // tambahkan ke array ingredients dengan id yang benar
      updatedIngredients.push({
        foodProductId: foodProduct._id,
        quantity: item.quantity,
      });
    }

    // simpan ke database
    const newMenu = new Menu({
      userId: req.user.id,
      name,
      category,
      price,
      ingredients: updatedIngredients,
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
    const menus = await Menu.find({ userId: req.user.id }).populate(
      "ingredients.foodProductId",
      "name"
    );

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
    const { name, category, price, ingredients } = req.body;
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
    if (ingredients && !Array.isArray(ingredients)) {
      return res.status(400).json({
        status: "Error",
        message: "Ingredients harus berupa array",
      });
    }

    // simpan ingredients lama untuk rollback jika ada perubahan
    const oldIngredients = menu.ingredients || [];

    // proses update ingredients dan update stok bahan baku
    if (ingredients) {
      // kembalikan stok dari ingredients lama
      for (const oldIng of oldIngredients) {
        const foodProduct = await FoodProduct.findOne({
          _id: oldIng.foodProductId,
          userId: req.user.id,
        });

        if (foodProduct) {
          foodProduct.stock += oldIng.quantity;
          await foodProduct.save();
        }
      }

      // kurangi stok berdasarkan ingredients baru
      for (const newIng of ingredients) {
        let foodProduct = await FoodProduct.findOne({
          _id: newIng.foodProductId,
          userOd: req.user.id,
        });

        // jika foodProductId tidak ada, cari berdasarkan nama bahan baku
        if (!foodProduct) {
          foodProduct = await FoodProduct.findOne({
            name: newIng.name,
            userId: req.user.id,
          });
        }

        // jika bahan baku ditemukan, kurangi stok
        if (foodProduct) {
          if (foodProduct.stock < newIng.quantity) {
            return res.status(400).json({
              status: "Error",
              message: `Stock ${foodProduct.name} tidak cukup`,
            });
          }

          foodProduct.stock -= newIng.quantity;
          await foodProduct.save();
        } else {
          return res.status(400).json({
            status: "Error",
            message: `Bahan baku ${newIng.name} tidak ditemukan`,
          });
        }
      }
    }

    // update data
    menu.name = name || menu.name;
    menu.category = category || menu.category;
    menu.price = price !== undefined ? price : menu.price;
    menu.ingredients = ingredients || menu.ingredients;

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
