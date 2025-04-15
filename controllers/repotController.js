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

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const sales = await Transaction.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end },
    }).populate({
      path: "orderItems.menuItem",
      populate: { path: "ingredients.foodProductId" },
    });

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end },
    });

    const totalPendapatan = sales.reduce((sum, trx) => sum + trx.amount, 0);

    let totalHPP = 0;
    for (const trx of sales) {
      for (const item of trx.orderItems) {
        if (item.menuItem && item.menuItem.ingredients) {
          for (const i of item.menuItem.ingredients) {
            if (i.ingredient && i.ingredient.price && i.usedQty) {
              totalHPP += item.quantity * i.usedQty * i.ingredient.price;
            }
          }
        }
      }
    }

    const labaKotor = totalPendapatan - totalHPP;
    const totalBebanOperasional = expenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const labaUsaha = labaKotor - totalBebanOperasional;

    const htmlContent = `
<html>
<head>
  <style>
    @page {
      margin: 100px 40px 80px 40px;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      color: #333;
    }
    header {
      text-align: center;
      margin-bottom: 30px;
    }
    header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    header p {
      font-size: 14px;
      margin-bottom: 20px;
      font-weight: bold;
    }
    footer {
      position: fixed;
      bottom: 60px;
      left: 0;
      right: 0;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
    }
    .pageNumber:before {
      content: "Halaman " counter(page);
    }
    main {
      margin-top: 20px;
    }
    h2 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
    tfoot td {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .summary {
      margin-top: 30px;
      font-size: 14px;
    }
    .summary p {
      margin: 6px 0;
    }
    .summary p span {
      font-weight: bold;
    }
  </style>
</head>
<body>

  <header>
    <h1>Laporan Laba Rugi</h1>
    <p>Periode: ${startDate} - ${endDate}</p>
  </header>

  <footer>
    <div>UMKM Kotamobagu Timur</div>
    <div>${new Date().toLocaleString("id-ID")}</div>
    <div class="pageNumber"></div>
  </footer>

  <main>
    <h2>Ringkasan Laporan</h2>
    <div class="summary">
      <p><span>Total Pendapatan Usaha:</span> Rp ${totalPendapatan.toLocaleString()}</p>
      <p><span>Total HPP:</span> Rp ${totalHPP.toLocaleString()}</p>
      <p><span>Laba Kotor:</span> Rp ${labaKotor.toLocaleString()}</p>
      <p><span>Total Beban Operasional:</span> Rp ${totalBebanOperasional.toLocaleString()}</p>
      <p><span>Laba Usaha (Bersih):</span> Rp ${labaUsaha.toLocaleString()}</p>
    </div>

    <h2>Detail Pendapatan</h2>
    <table>
      <thead>
        <tr><th>Tanggal</th><th>Pelanggan</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${sales
          .map(
            (trx) => `
          <tr>
            <td>${new Date(trx.date).toLocaleDateString()}</td>
            <td>${trx.customerName || "-"}</td>
            <td>Rp ${trx.amount.toLocaleString()}</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr><td colspan="2">Total Pendapatan</td><td>Rp ${totalPendapatan.toLocaleString()}</td></tr>
      </tfoot>
    </table>

    <h2>Detail Beban Operasional</h2>
    <table>
      <thead>
        <tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${expenses
          .map(
            (exp) => `
          <tr>
            <td>${new Date(exp.date).toLocaleDateString()}</td>
            <td>${exp.category || "-"}</td>
            <td>${exp.description || "-"}</td>
            <td>Rp ${exp.amount.toLocaleString()}</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr><td colspan="3">Total Beban Operasional</td><td>Rp ${totalBebanOperasional.toLocaleString()}</td></tr>
      </tfoot>
    </table>
  </main>

</body>
</html>
`;

    const reportsDir = ensureReportsDirectory();
    const filePath = path.join(reportsDir, "laba_rugi.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Laporan_Laba_Rugi.pdf", (err) => {
      if (err) {
        return res.status(500).json({
          status: "Error",
          message: "Gagal mengunduh laporan",
        });
      }
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
    console.log("Logged in user:", req.user.id);

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal mulai dan akhir diperlukan",
      });
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // Cek data tanpa filter tanggal (debugging)
    const rawSales = await Transaction.find({ userId: req.user.id });
    const rawExpenses = await Expense.find({ userId: req.user.id });
    console.log("Total Sales (tanpa filter tanggal):", rawSales.length);
    console.log("Total Expenses (tanpa filter tanggal):", rawExpenses.length);
    console.log(
      "Sample Sales Dates:",
      rawSales.slice(0, 5).map((s) => s.date)
    );
    console.log(
      "Sample Expense Dates:",
      rawExpenses.slice(0, 5).map((e) => e.date)
    );

    // Filter berdasarkan rentang tanggal
    const sales = await Transaction.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end },
    });

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end },
    });

    console.log("Start Date:", start.toISOString());
    console.log("End Date:", end.toISOString());
    console.log(
      "Filtered Sales Dates:",
      sales.map((s) => s.date)
    );
    console.log(
      "Filtered Expenses Dates:",
      expenses.map((e) => e.date)
    );

    const cashInflow = sales.reduce((sum, trx) => sum + trx.amount, 0);
    const cashOutflow = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endingBalance = cashInflow - cashOutflow;

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
      if (err) {
        return res.status(500).json({
          status: "Error",
          message: "Gagal mengunduh laporan",
        });
      }
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const sales = await Transaction.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end },
    });

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end },
    });

    const totalIncome = sales.reduce((sum, trx) => sum + trx.amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const profitOrLoss = totalIncome - totalExpense;
    const netCashFlow = totalIncome - totalExpense;

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

    res.download(filePath, "Ringkasan_Keuangan.pdf", (err) => {
      if (err) {
        return res.status(500).json({
          status: "Error",
          message: "Gagal mengunduh laporan",
        });
      }
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
