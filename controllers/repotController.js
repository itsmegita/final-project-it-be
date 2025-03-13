const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Transaction = require("../models/Transaction");

// fungsi untuk membuat pdf dengan puppeteer
const generatePDF = async (htmlContent, outputFilePath) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outputFilePath,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
  });

  await browser.close();
};

// laporan laba rugi
const generateProfitLossReport = async (req, res) => {
  try {
    // ambil data transaksi berdasarkan rentang waktu
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // hitung total pendapatan dan pengeluaran
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((trx) => {
      if (trx.type === "income") totalIncome += trx.amount;
      if (trx.type === "expense") totalExpense += trx.amount;
    });
    const profitOrLoss = totalIncome - totalExpense;

    // buat dokumen pdf
    const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Laporan Laba Rugi</h1>
      <h2>Periode: ${startDate} - ${endDate}</h2>
      <div class="summary">
        <p><strong>Total Pendapatan:</strong> Rp ${totalIncome.toLocaleString()}</p>
        <p><strong>Total Pengeluaran:</strong> Rp ${totalExpense.toLocaleString()}</p>
        <p><strong>Keuntungan / Kerugian:</strong> Rp ${profitOrLoss.toLocaleString()}</p>
      </div>
      <table>
        <tr><th>No</th><th>Kategori</th><th>Jumlah (Rp)</th><th>Deskripsi</th></tr>
        ${transactions
          .map(
            (trx, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${trx.category}</td>
              <td>${trx.amount.toLocaleString()}</td>
              <td>${trx.description}</td>
            </tr>
          `
          )
          .join("")}
        </table>
    </body>
    </html>`;

    // pastikan bahwa folder reports ada
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir))
      fs.mkdirSync(reportsDir, { recursive: true });
    const filePath = path.join(reportsDir, "laba_rugi.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Laporan_Laba_Rugi.pdf", (err) => {
      if (err)
        res.status(500).json({
          status: "Error",
          message: "Gagal mengunduh laporan",
        });
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal membuat laporan",
      error: err.message,
    });
  }
};

// laporan arus kas
const generateCashFlowReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal mulai dan akhir diperlukan",
      });
    }

    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.amount;
      } else if (transaction.type === "expense") {
        totalExpense += transaction.amount;
      }
    });

    const netCashFlow = totalIncome - totalExpense;

    // pdf
    const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Laporan Arus Kas</h1>
      <h2>Periode: ${startDate} - ${endDate}</h2>
      <div class="summary">
        <p><strong>Total Pendapatan:</strong> Rp ${totalIncome.toLocaleString()}</p>
        <p><strong>Total Pengeluaran:</strong> Rp ${totalExpense.toLocaleString()}</p>
        <p><strong>Arus Kas Bersih:</strong> Rp ${netCashFlow.toLocaleString()}</p>
      </div>
      <table>
        <tr><th>No</th><th>Kategori</th><th>Jumlah (Rp)</th><th>Deskripsi</th></tr>
        ${transactions
          .map(
            (trx, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${trx.category}</td>
              <td>${trx.amount.toLocaleString()}</td>
              <td>${trx.description}</td>
            </tr>
          `
          )
          .join("")}
        </table>
    </body>
    </html>`;

    const filePath = path.join(__dirname, "../reports/arus_kas.pdf");
    await generatePDF(htmlContent, filePath);
    res.download(filePath, "Laporan_Arus_Kas.pdf");
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat membuat laporan arus kas",
      error: err.message,
    });
  }
};

// laporan rekapitulasi transaksi
const getTransactionSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Parameter startDate dan endDate wajib diisi",
      });
    }

    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        status: "Error",
        message: "Tidak ada transaksi dalam periode ini",
      });
    }

    // kelompokkan transaksi berdasarkan kategori
    const summary = {};
    let totalAmount = 0;
    transactions.forEach((trx) => {
      if (!summary[trx.category]) {
        summary[trx.category] = 0;
      }
      summary[trx.category] += trx.amount;
      totalAmount += trx.amount;
    });

    // buat file pdf
    const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Laporan Rekapitulasi Transaksi</h1>
      <h2>Periode: ${startDate} - ${endDate}</h2>
      <table>
        <tr><th>Kategori</th><th>Total (Rp)</th></tr>
        ${Object.keys(summary)
          .map(
            (category) => `
            <tr>
              <td>${category}</td>
              <td>${summary[category].toLocaleString()}</td>
            </tr>`
          )
          .join("")}
        </table>
    </body>
    </html>`;

    const filePath = path.join(
      __dirname,
      "../reports/rekapitulasi_transaksi.pdf"
    );
    await generatePDF(htmlContent, filePath);
    res.download(filePath, "Rekapitulasi_Transaksi.pdf");
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat membuat laporan rekapitulasi transaksi",
      error: err.message,
    });
  }
};

const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // filter berdasarkan tanggal
    const filter = { userId: req.user.id };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // ambil semua transaksi yang sesuai filter
    const transactions = await Transaction.find(filter);

    // hitung total pemasukan dan pengeluaran
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.type === "income") {
        totalIncome += tx.amount;
      } else if (tx.type === "expense") {
        totalExpense += tx.amount;
      }
    });

    const balance = totalIncome - totalExpense;

    res.status(200).json({
      status: "Success",
      message: "Ringkasan keuangan berhasil diambil",
      summary: {
        totalIncome,
        totalExpense,
        balance,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat mengambil ringkasan keuangan",
      error: err.message,
    });
  }
};

module.exports = {
  generateProfitLossReport,
  generateCashFlowReport,
  getTransactionSummaryReport,
  getFinancialSummary,
};
