require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("email atau password admin belum diatur di .env");
    process.exit(1);
  }

  // koneksi ke database
  await mongoose.connect(process.env.DATABASE);

  // cek apakah admin sudah ada
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log("Admin sudah ada");
    process.exit();
  }

  // buat admin baru
  const admin = new User({
    name: "Admin",
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: "admin",
    isVerified: true,
  });

  await admin.save();
  console.log("Admin berhasil dibuat");
  process.exit();
};

createAdmin().catch((err) => {
  console.error("Gagal membuat admin: ", err);
  process.exit(1);
});
