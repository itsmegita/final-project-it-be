const mongoose = require("mongoose");
const Expense = require("./models/Expense"); // Sesuaikan dengan lokasi model Expense
const User = require("./models/User"); // Pastikan ada User untuk referensi userId

// Koneksi ke MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/TA-be", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

const categories = ["Listrik", "Sewa", "Gaji", "Bahan Baku", "Pajak", "Transportasi"];
const paymentMethods = ["Cash", "Transfer", "Credit", "E-Wallet"];

async function generateDummyExpenses() {
  try {
    // Ambil salah satu user sebagai referensi userId
    const user = await User.findOne();
    if (!user) {
      console.error("Tidak ada user ditemukan. Buat user terlebih dahulu.");
      return;
    }

    const expenses = [];
    for (let i = 0; i < 25; i++) {
      const expense = new Expense({
        userId: user._id,
        category: categories[Math.floor(Math.random() * categories.length)],
        amount: Math.floor(Math.random() * 500000) + 50000, // Nominal antara 50rb - 500rb
        description: `Pengeluaran dummy ke-${i + 1}`,
        date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      });
      expenses.push(expense);
    }

    await Expense.insertMany(expenses);
    console.log("25 Dummy Expenses berhasil dibuat!");
    mongoose.disconnect();
  } catch (error) {
    console.error("Gagal membuat dummy data:", error);
    mongoose.disconnect();
  }
}

generateDummyExpenses();
