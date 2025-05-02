const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "Error",
        message: "Unauthorized - No Token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        status: "Error",
        message: "Unauthorized - User Not Found",
      });
    }

    next();
  } catch (err) {
    res.status(401).json({
      status: "Error",
      message: "Invalid Token",
      error: err.message,
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    return res.status(403).json({
      status: "Error",
      message: "Akses hanya untuk admin",
    });
  }
};

module.exports = { protect, isAdmin };
