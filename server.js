require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

// koneksi ke database
connectDB()
  .then(() => {
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Gagal menghubungkan ke database:", err.message);
    process.exit(1);
  });
