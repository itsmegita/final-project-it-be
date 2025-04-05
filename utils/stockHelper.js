const FoodProduct = require("../models/FoodProduct");
const Menu = require("../models/Menu");

// Konversi satuan ke unit terkecil
const unitConversion = {
  kg: 1000, // 1 kg = 1000 gram
  gram: 1, // 1 gram tetap 1 gram
  liter: 1000, // 1 liter = 1000 ml
  ml: 1, // 1 ml tetap 1 ml
  pcs: 1, // 1 pcs tetap 1 pcs
};

// Fungsi untuk mengurangi stok bahan baku
const reduceStock = async (orderItems) => {
  for (const order of orderItems) {
    const menu = await Menu.findById(order.menuId).populate(
      "ingredients.foodProductId"
    );

    if (!menu) {
      throw new Error(`Menu dengan ID ${order.menuId} tidak ditemukan`);
    }

    for (const ingredient of menu.ingredients) {
      const foodProduct = await FoodProduct.findById(ingredient.foodProductId);

      if (!foodProduct) {
        throw new Error(
          `Bahan baku dengan ID ${ingredient.foodProductId} tidak ditemukan`
        );
      }

      // Konversi jumlah ke satuan bahan baku
      const menuIngredientQty = ingredient.quantity * order.quantity; // Total bahan baku yang dibutuhkan (dalam satuan kecil)
      const foodProductQty =
        menuIngredientQty / unitConversion[foodProduct.unit]; // Konversi ke satuan besar

      if (foodProduct.stock < foodProductQty) {
        throw new Error(`Stok ${foodProduct.name} tidak mencukupi`);
      }

      foodProduct.stock -= foodProductQty;
      await foodProduct.save();
    }
  }
};

module.exports = { reduceStock };
