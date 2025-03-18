const Menu = require("../models/Menu");
const FoodProduct = require("../models/FoodProduct");

const updateStockOnTransaction = async (items, isReverting = false) => {
  try {
    for (const item of items) {
      const menu = await Menu.findById(item.menuId).populate(
        "ingredients.foodProductId"
      );
      if (!menu)
        throw new Error(`Menu dengan id ${item.menuId} tidak ditemukan`);

      for (const ingredient of menu.ingredients) {
        const foodProduct = await FoodProduct.findById(
          ingredient.foodProductId
        );
        if (foodProduct) {
          let changeAmount =
            ingredient.quantity * item.quantity * (isReverting ? 1 : -1);

          // Konversi dari gram ke kg jika stok foodProduct dalam kg
          if (foodProduct.unit === "kg") {
            changeAmount /= 1000; // ubah dari gram ke kilogram
          }

          // Cegah stok negatif
          if (foodProduct.stock + changeAmount < 0) {
            throw new Error(
              `Stok ${foodProduct.name} tidak cukup! Tersedia: ${foodProduct.stock}${foodProduct.unit}`
            );
          }

          foodProduct.stock += changeAmount;
          await foodProduct.save();
        }
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  updateStockOnTransaction,
};
