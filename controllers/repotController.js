const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Debt = require("../models/DebtReceivable");

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

// fungsi format tanggal
const formatDate = (date) => {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
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

    const totalPendapatan = sales.reduce((sum, trx) => sum + trx.amount, 0);

    // total beban operasional
    const totalBebanOperasional = expenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    const labaKotor = totalPendapatan - totalBebanOperasional;
    const labaUsaha = labaKotor - totalBebanOperasional;

    const htmlContent = `
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 50px 30px 80px 30px;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      color: #333;
      counter-reset: page;
      margin: 0;
    }
    header {
      text-align: center;
      margin: 30px 0 20px 0;
    }
    header h1 {
      font-size: 22px;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    header p {
      font-size: 14px;
      color: #666;
    }
    footer {
      position: fixed;
      bottom: 0px;
      left: 30px;
      right: 30px;
      height: 40px;
      font-size: 10px;
      color: #555;
      background: #fff;
      border-top: 1px solid #ccc;
      padding: 5px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -1px 2px rgba(0,0,0,0.05);
    }
    .pageNumber::after {
      counter-increment: page;
      content: "Halaman " counter(page);
    }
    main {
      padding: 0 30px;
      padding-bottom: 100px;
      box-sizing: border-box;
      min-height: 100%;
    }
    h2 {
      font-size: 16px;
      font-weight: bold;
      color: #34495e;
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 30px;
    }
    th, td {
      padding: 8px;
      font-size: 12px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    tfoot td {
      font-weight: bold;
      background-color: #ecf0f1;
    }
    .total-row td {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    thead th:last-child,
    tbody td:last-child,
    tfoot td:last-child {
      text-align: right;
    }
  </style>
</head>
<body>

<header>
  <h1>Laporan Laba Rugi</h1>
  <p>Periode: ${formatDate(start)} - ${formatDate(new Date(endDate))}</p>
</header>

<footer>
  <div>UMKM Kotamobagu Timur</div>
  <div>${new Date().toLocaleString("id-ID")}</div>
  <div class="pageNumber"></div>
</footer>

<main>
  <h2>Ringkasan Keuangan</h2>
  <table>
    <tr><td><strong>Total Pendapatan</strong></td><td>: Rp ${totalPendapatan.toLocaleString()}</td></tr>
    <tr><td><strong>Laba Kotor</strong></td><td>: Rp ${labaKotor.toLocaleString()}</td></tr>
    <tr><td><strong>Beban Operasional</strong></td><td>: Rp ${totalBebanOperasional.toLocaleString()}</td></tr>
    <tr><td><strong>Laba Usaha (Bersih)</strong></td><td>: Rp ${labaUsaha.toLocaleString()}</td></tr>
  </table>

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
          <td>${formatDate(new Date(trx.date))}</td>
          <td>${trx.customerName || "-"}</td>
          <td>Rp ${trx.amount.toLocaleString()}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2">Total Pendapatan</td>
        <td>Rp ${totalPendapatan.toLocaleString()}</td>
      </tr>
    </tfoot>
  </table>

  <h2>Detail Beban Operasional</h2>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Kategori</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${expenses
        .map(
          (exp) => `
        <tr>
          <td>${formatDate(new Date(exp.date))}</td>
          <td>${exp.category || "-"}</td>
          <td>Rp ${exp.amount.toLocaleString()}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2">Total Beban Operasional</td>
        <td>Rp ${totalBebanOperasional.toLocaleString()}</td>
      </tr>
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

// laporan posisi keuangan (neraca)
const generateFinancialPositionReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ status: "Error", message: "Tanggal diperlukan" });
    }

    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const userId = req.user.id;

    // Transaksi penjualan (pendapatan)
    const sales = await Transaction.find({ userId, date: { $lt: nextDate } });
    const totalPendapatan = sales.reduce((sum, trx) => sum + trx.amount, 0);

    // Pengeluaran
    const expenses = await Expense.find({ userId, date: { $lt: nextDate } });
    const totalPengeluaran = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Piutang (Aset)
    const receivables = await Debt.find({
      userId,
      type: "Piutang",
      status: "Belum Lunas",
      dueDate: { $lt: nextDate },
    });
    const totalPiutang = receivables.reduce((sum, p) => sum + p.amount, 0);

    // Kas (Pendapatan - Pengeluaran)
    const kas = totalPendapatan - totalPengeluaran;

    // Total Aset
    const aset = kas + totalPiutang;

    // Kewajiban (Utang)
    const payables = await Debt.find({
      userId,
      type: "Hutang",
      status: "Belum Lunas",
      dueDate: { $lt: nextDate },
    });
    console.log("PAYABLES:", payables);
    const totalHutang = payables.reduce((sum, h) => sum + h.amount, 0);

    // Ekuitas
    const ekuitas = aset - totalHutang;

    // HTML konten untuk PDF
    const htmlContent = `
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 50px 30px 80px 30px;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      color: #333;
      counter-reset: page;
      margin: 0;
    }

    header {
      text-align: center;
      margin: 30px 0 20px 0;
    }

    header h1 {
      font-size: 22px;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    header p {
      font-size: 14px;
      color: #666;
    }

    footer {
      position: fixed;
      bottom: 0px;
      left: 30px;
      right: 30px;
      height: 40px;
      font-size: 10px;
      color: #555;
      background: #fff;
      border-top: 1px solid #ccc;
      padding: 5px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -1px 2px rgba(0,0,0,0.05);
    }

    .pageNumber::after {
      counter-increment: page;
      content: "Halaman " counter(page);
    }

    main {
      padding: 0 30px;
      padding-bottom: 100px;
      box-sizing: border-box;
      min-height: 100%;
    }

    h2 {
      font-size: 16px;
      font-weight: bold;
      color: #34495e;
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
      margin-top: 30px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 30px;
    }

    th, td {
      padding: 10px;
      font-size: 12px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }

    th {
      color: white;
      font-weight: bold;
    }

    tfoot td {
      font-weight: bold;
      color: white;
      background-color: #3498db;
    }

    tbody td:last-child,
    tfoot td:last-child {
      text-align: right;
    }
  </style>
</head>
<body>

  <header>
    <h1>Laporan Posisi Keuangan</h1>
    <p>Per Tanggal: ${new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}</p>
  </header>

  <footer>
    <div>UMKM Kotamobagu Timur</div>
    <div>${new Date().toLocaleString("id-ID")}</div>
    <div class="pageNumber"></div>
  </footer>

  <main>
    <h2>Aset</h2>
    <table>
      <tbody>
        <tr><td>Kas</td><td>Rp ${kas.toLocaleString("id-ID")}</td></tr>
        <tr><td>Piutang</td><td>Rp ${totalPiutang.toLocaleString(
          "id-ID"
        )}</td></tr>
      </tbody>
      <tfoot>
        <tr><td>Total Aset</td><td>Rp ${aset.toLocaleString("id-ID")}</td></tr>
      </tfoot>
    </table>

    <h2>Kewajiban</h2>
    <table>
      <tbody>
        <tr><td>Hutang</td><td>Rp ${totalHutang.toLocaleString(
          "id-ID"
        )}</td></tr>
      </tbody>
      <tfoot>
        <tr><td>Total Kewajiban</td><td>Rp ${totalHutang.toLocaleString(
          "id-ID"
        )}</td></tr>
      </tfoot>
    </table>

    <h2>Ekuitas</h2>
    <table>
      <tbody>
        <tr><td>Ekuitas Pemilik</td><td>Rp ${ekuitas.toLocaleString(
          "id-ID"
        )}</td></tr>
      </tbody>
      <tfoot>
        <tr><td>Total Ekuitas</td><td>Rp ${ekuitas.toLocaleString(
          "id-ID"
        )}</td></tr>
      </tfoot>
    </table>
  </main>

</body>
</html>
`;

    const filePath = path.join(ensureReportsDirectory(), "posisi_keuangan.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Laporan_Posisi_Keuangan.pdf");
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal membuat laporan",
      error: err.message,
    });
  }
};

// buku kas harian
const generateDailyCashBookReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ status: "Error", message: "Tanggal diperlukan" });
    }

    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const userId = req.user.id;

    const sales = await Transaction.find({
      userId,
      date: { $gte: targetDate, $lt: nextDate },
    }).populate("orderItems.menuItem");

    const expenses = await Expense.find({
      userId,
      date: { $gte: targetDate, $lt: nextDate },
    });

    const htmlContent = `
    <html>
    <head>
      <style>
        @page {
          size: A4;
          margin: 50px 30px 80px 30px;
        }

        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          color: #333;
          counter-reset: page;
          margin: 0;
        }

        header {
          text-align: center;
          margin: 30px 0 20px 0;
        }

        header h1 {
          font-size: 22px;
          color: #2c3e50;
          margin-bottom: 5px;
        }

        header p {
          font-size: 14px;
          color: #666;
        }

        footer {
          position: fixed;
          bottom: 0px;
          left: 30px;
          right: 30px;
          height: 40px;
          font-size: 10px;
          color: #555;
          background: #fff;
          border-top: 1px solid #ccc;
          padding: 5px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 -1px 2px rgba(0,0,0,0.05);
        }

        .pageNumber::after {
          counter-increment: page;
          content: "Halaman " counter(page);
        }

        main {
          padding: 0 30px;
          padding-bottom: 100px;
          box-sizing: border-box;
          min-height: 100%;
        }

        h2 {
          font-size: 16px;
          font-weight: bold;
          color: #34495e;
          border-bottom: 2px solid #ddd;
          padding-bottom: 5px;
          margin-top: 30px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 30px;
        }

        th, td {
          padding: 8px;
          font-size: 12px;
          border-bottom: 1px solid #ddd;
          text-align: left;
        }

        th {
          background-color: #3498db;
          color: white;
          font-weight: bold;
        }

        tfoot td {
          font-weight: bold;
          background-color: #ecf0f1;
        }

        thead th:last-child,
        tbody td:last-child,
        tfoot td:last-child {
          text-align: right;
        }
      </style>
    </head>
    <body>

      <header>
        <h1>Buku Kas Harian</h1>
        <p>Tanggal: ${formatDate(new Date(date))}</p>
      </header>

      <footer>
        <div>UMKM Kotamobagu Timur</div>
        <div>${new Date().toLocaleString("id-ID")}</div>
        <div class="pageNumber"></div>
      </footer>

      <main>
        <h2>Pemasukan</h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Keterangan</th><th>Jumlah</th></tr>
          </thead>
          <tbody>
            ${sales
              .map(
                (trx) => `
                <tr>
                  <td>${formatDate(new Date(trx.date))}</td>
                  <td>
                    Penjualan (${trx.customerName || "-"})<br/>
                    ${trx.orderItems
                      .map(
                        (item) => `- ${item.menuItem.name} x${item.quantity}`
                      )
                      .join("<br/>")}
                  </td>
                  <td>Rp ${trx.amount.toLocaleString("id-ID")}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Total Pemasukan</td>
              <td>Rp ${sales
                .reduce((sum, trx) => sum + trx.amount, 0)
                .toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>

        <h2>Pengeluaran</h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Kategori</th><th>Jumlah</th></tr>
          </thead>
          <tbody>
            ${expenses
              .map(
                (exp) => `
                <tr>
                  <td>${formatDate(new Date(exp.date))}</td>
                  <td>${exp.category || "-"}</td>
                  <td>Rp ${exp.amount.toLocaleString("id-ID")}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Total Pengeluaran</td>
              <td>Rp ${expenses
                .reduce((sum, e) => sum + e.amount, 0)
                .toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>
      </main>
    </body>
    </html>
    `;

    const filePath = path.join(ensureReportsDirectory(), "buku_kas_harian.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Buku_Kas_Harian.pdf");
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
  generateFinancialPositionReport,
  generateDailyCashBookReport,
  generateCashFlowReport,
  generateFinancialSummaryReport,
};
