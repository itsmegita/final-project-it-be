const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Menu = require("../models/Menu");
const FoodProduct = require("../models/FoodProduct");
const { createNotification } = require("../utils/notificationHelper");

// tambah menu baru
const createMenu = async (req, res) => {
  try {
    const { name, category, price, ingredients } = req.body;

    // Validasi nama
    if (!name || name.length < 3 || name.length > 100) {
      return res.status(400).json({
        status: "Error",
        message: "Nama menu harus antara 3-100 karakter",
      });
    }

    // Validasi kategori
    if (!category || !["Makanan", "Minuman"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus Makanan atau Minuman",
      });
    }

    // Validasi harga
    if (price === undefined || isNaN(price) || price < 0) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus berupa angka dan tidak boleh negatif",
      });
    }

    // Validasi bahan baku
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        status: "Error",
        message: "Ingredients harus berupa array dan tidak boleh kosong",
      });
    }

    const allowedUnits = ["gram", "kg", "ml", "liter", "pcs"];
    const updatedIngredients = [];

    for (let item of ingredients) {
      if (!item.foodProductId) {
        return res.status(400).json({
          status: "Error",
          message: "Setiap bahan baku harus memiliki ID atau nama",
        });
      }

      let foodProduct;
      if (ObjectId.isValid(item.foodProductId)) {
        foodProduct = await FoodProduct.findById(item.foodProductId);
      } else {
        foodProduct = await FoodProduct.findOne({ name: item.foodProductId });
      }

      if (!foodProduct) {
        return res.status(400).json({
          status: "Error",
          message: `Bahan baku '${item.foodProductId}' tidak ditemukan`,
        });
      }

      if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          status: "Error",
          message: "Jumlah bahan baku harus valid dan lebih dari 0",
        });
      }

      if (!item.unit || !allowedUnits.includes(item.unit)) {
        return res.status(400).json({
          status: "Error",
          message: `Unit tidak valid atau tidak tersedia untuk bahan baku '${foodProduct.name}'`,
        });
      }

      updatedIngredients.push({
        foodProductId: foodProduct._id,
        quantity: item.quantity,
        unit: item.unit,
      });
    }

    // Simpan menu
    const newMenu = new Menu({
      userId: req.user.id,
      name,
      category,
      price,
      ingredients: updatedIngredients,
    });

    await newMenu.save();

    // Notifikasi
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
    const menus = await Menu.find({
      userId: req.user.id,
      isDeleted: false,
    }).populate("ingredients.foodProductId", "name");

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

    const menu = await Menu.findOne({
      _id: id,
      userId: req.user.id,
      isDeleted: false,
    });

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

    // validasi ID menu
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID menu tidak valid",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!menu) {
      return res.status(404).json({
        status: "Error",
        message: "Menu tidak ditemukan",
      });
    }

    // validasi nama
    if (name && (name.length < 3 || name.length > 100)) {
      return res.status(400).json({
        status: "Error",
        message: "Nama menu harus antara 3 - 100 karakter",
      });
    }

    // validasi kategori
    if (category && !["Makanan", "Minuman"].includes(category)) {
      return res.status(400).json({
        status: "Error",
        message: "Kategori harus berupa Makanan atau Minuman",
      });
    }

    // validasi harga
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({
        status: "Error",
        message: "Harga harus angka dan tidak boleh negatif",
      });
    }

    const allowedUnits = ["gram", "kg", "ml", "liter", "pcs"];
    let updatedIngredients = [];

    // proses update ingredients
    if (ingredients) {
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          status: "Error",
          message: "Ingredients harus berupa array dan tidak boleh kosong",
        });
      }

      // kembalikan stok dari ingredients lama
      for (const oldIng of menu.ingredients) {
        const foodProduct = await FoodProduct.findOne({
          _id: oldIng.foodProductId,
          userId: req.user.id,
        });
        if (foodProduct) {
          foodProduct.stock += oldIng.quantity;
          await foodProduct.save();
        }
      }

      // proses validasi & update stok ingredients baru
      for (const item of ingredients) {
        if (!item.foodProductId) {
          return res.status(400).json({
            status: "Error",
            message: "Setiap bahan baku harus memiliki ID atau nama",
          });
        }

        let foodProduct;
        if (mongoose.Types.ObjectId.isValid(item.foodProductId)) {
          foodProduct = await FoodProduct.findOne({
            _id: item.foodProductId,
            userId: req.user.id,
          });
        } else {
          foodProduct = await FoodProduct.findOne({
            name: item.foodProductId,
            userId: req.user.id,
          });
        }

        if (!foodProduct) {
          return res.status(400).json({
            status: "Error",
            message: `Bahan baku '${item.foodProductId}' tidak ditemukan`,
          });
        }

        if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({
            status: "Error",
            message: "Jumlah bahan baku harus valid dan lebih dari 0",
          });
        }

        if (!item.unit || !allowedUnits.includes(item.unit)) {
          return res.status(400).json({
            status: "Error",
            message: `Unit tidak valid atau tidak tersedia untuk bahan baku '${foodProduct.name}'`,
          });
        }

        if (foodProduct.stock < item.quantity) {
          return res.status(400).json({
            status: "Error",
            message: `Stok '${foodProduct.name}' tidak cukup`,
          });
        }

        // kurangi stok
        foodProduct.stock -= item.quantity;
        await foodProduct.save();

        updatedIngredients.push({
          foodProductId: foodProduct._id,
          quantity: item.quantity,
          unit: item.unit,
        });
      }
    }

    // update menu
    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      {
        name: name || menu.name,
        category: category || menu.category,
        price: price || menu.price,
        ingredients: updatedIngredients.length
          ? updatedIngredients
          : menu.ingredients,
      },
      { new: true }
    );

    // notifikasi
    await createNotification(
      req.user.id,
      "Menu diperbarui",
      `Menu '${name}' berhasil diperbarui`
    );

    res.status(200).json({
      status: "Success",
      message: "Menu berhasil diperbarui",
      data: updatedMenu,
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal memperbarui menu",
      error: err.message,
    });
  }
};

// delete menu
const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // validasi ID menu
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "Error",
        message: "ID menu tidak valid",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!menu) {
      return res.status(404).json({
        status: "Error",
        message: "Menu tidak ditemukan",
      });
    }

    const menuName = menu.name;

    // soft delete
    menu.isDeleted = true;
    await menu.save();

    // notifikasi
    await createNotification(
      req.user.id,
      "Menu dihapus",
      `Menu '${menuName}' berhasil dihapus`
    );

    res.status(200).json({
      status: "Success",
      message: `Menu dengan id ${id} berhasil dihapus`,
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
