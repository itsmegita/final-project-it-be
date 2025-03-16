const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createFoodProduct,
  getFoodProducts,
  getFoodProduct,
  updateFoodProduct,
  deleteFoodProduct,
} = require("../controllers/foodProductController");

const router = express.Router();

router.post("/", protect, createFoodProduct);
router.get("/", protect, getFoodProducts);
router.get("/:id", protect, getFoodProduct);
router.patch("/:id", protect, updateFoodProduct);
router.delete("/:id", protect, deleteFoodProduct);

module.exports = router;
