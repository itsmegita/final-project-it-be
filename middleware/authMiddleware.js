const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    console.log("Headers yang diterima:", req.headers); // Tambahkan ini untuk debug

    const token = req.header("Authorization")?.split(" ")[1];

    console.log("Token yang diterima:", token); // Lihat apakah token dikirim atau tidak

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User Not Found" });
    }

    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = protect;
