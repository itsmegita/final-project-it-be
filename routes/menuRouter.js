const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createMenu,
  getMenus,
  getMenu,
  updateMenu,
  deleteMenu,
} = require("../controllers/menuController");

const router = express.Router();

router.post("/", protect, createMenu);
router.get("/", protect, getMenus);
router.get("/:id", protect, getMenu);
router.patch("/:id", protect, updateMenu);
router.delete("/:id", protect, deleteMenu);

module.exports = router;
