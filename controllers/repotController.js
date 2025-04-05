const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");

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

// helper untuk memastikan direktori penyimpanan laporan
const ensureReportsDirectory = () => {
  const reportsDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
};

// laporan laba rugi
const generateProfitLossReport = async (req, res) => {
  try {
    // ambil data transaksi berdasarkan rentang waktu
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal mulai dan akhir diperlukan",
      });
    }

    // ambil transaksi penjualan
    const sales = await Transaction.find({
      userId: req.user.id,
      type: "Sale",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // ambil data pengeluaran
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // hitung total pendapatan dan pengeluaran
    const totalIncome = sales.reduce((sum, trx) => sum + trx.amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const profitOrLoss = totalIncome - totalExpense;

    // buat laporan dalam bentuk pdf
    const htmlContent = `
     <html>
    <head><style> body { font-family: Arial; } </style></head>
    <body>
      <h1>Laporan Laba Rugi</h1>
      <p>Periode: ${startDate} - ${endDate}</p>
      <p>Total Pendapatan: Rp ${totalIncome.toLocaleString()}</p>
      <p>Total Pengeluaran: Rp ${totalExpense.toLocaleString()}</p>
      <p><strong>Laba / Rugi: Rp ${profitOrLoss.toLocaleString()}</strong></p>
    </body>
    </html>`;

    const reportsDir = ensureReportsDirectory();
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

    // ambil transaksi penjualan (arus kas masuk)
    const sales = await Transaction.find({
      userId: req.user.id,
      type: "Sale",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // ambil pengeluaran (arus kas keluar)
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: newDate(endDate) },
    });

    const cashInFlow = sales.reduce((sum, trx) => sum + trx.amount, 0);
    const cashOutFlow = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endingBalance = cashInFlow - cashOutFlow;

    // buat laporan html
    const htmlContent = `
    <html>
      <head><style> body { font-family: Arial; } </style></head>
      <body>
        <h1>Laporan Arus Kas</h1>
        <p>Periode: ${startDate} - ${endDate}</p>
        <p>Arus Kas Masuk: Rp ${cashInflow.toLocaleString()}</p>
        <p>Arus Kas Keluar: Rp ${cashOutflow.toLocaleString()}</p>
        <p><strong>Saldo Akhir: Rp ${endingBalance.toLocaleString()}</strong></p>
      </body>
    </html>`;

    const reportsDir = ensureReportsDirectory();
    const filePath = path.join(reportsDir, "arus_kas.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Laporan_Arus_Kas.pdf", (err) => {
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

// laporan ringakasan keuangan
const generateFinancialSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal mulai dan akhir diperlukan",
      });
    }

    // ambil transaksi penjualan
    const sales = await Transaction.find({
      userId: req.user.id,
      type: "Sale",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // ambil data pengeluaran
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    const totalIncome = sales.reduce((sum, trx) => sum + trx.amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const profitOrLoss = totalIncome - totalExpense;
    const netCashFlow = totalIncome - totalExpense;

    // buat laporan html
    const htmlContent = `
    <html>
      <head><style> body { font-family: Arial; } </style></head>
      <body>
        <h1>Ringkasan Keuangan</h1>
        <p>Periode: ${startDate} - ${endDate}</p>
        <p>Total Pendapatan: Rp ${totalIncome.toLocaleString()}</p>
        <p>Total Pengeluaran: Rp ${totalExpense.toLocaleString()}</p>
        <p><strong>Laba / Rugi: Rp ${profitOrLoss.toLocaleString()}</strong></p>
        <p><strong>Arus Kas Bersih: Rp ${netCashFlow.toLocaleString()}</strong></p>
      </body>
      </html>`;
    const reportsDir = ensureReportsDirectory();
    const filePath = path.join(reportsDir, "ringkasan_keuangan.pdf");
    await generatePDF(htmlContent, filePath);

    res.downlaod(filePath, "Ringkasan_Keuangan.pdf", (err) => {
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

module.exports = {
  generateProfitLossReport,
  generateCashFlowReport,
  generateFinancialSummaryReport,
};
