const path = require("path");
const fs = require("fs");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Debt = require("../models/DebtReceivable");
const { generatePDF } = require("../utils/generatePDF");
const { formatDate } = require("../utils/formatDate");
const { ensureReportsDirectory } = require("../utils/ensureReportsDirectory");

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

    const hppExpenses = expenses.filter(
      (exp) => exp.category?.toLowerCase() === "bahan baku"
    );
    const operasionalExpenses = expenses.filter(
      (exp) => exp.category?.toLowerCase() !== "bahan baku"
    );

    const totalHPP = hppExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalBebanOperasional = operasionalExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    const labaKotor = totalPendapatan - totalHPP;
    const labaUsaha = labaKotor - totalBebanOperasional;
    const labaBersih = labaUsaha;

    const htmlContent = `
<html>
<head>
  <style>
    @page { size: A4; margin: 50px 30px 80px 30px; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 0; }
    header { text-align: center; margin: 30px 0 20px 0; }
    header h1 { font-size: 22px; color: #2c3e50; margin-bottom: 5px; }
    header p { font-size: 14px; color: #666; }
    footer {
      position: fixed; bottom: 0; left: 30px; right: 30px;
      height: 40px; font-size: 10px; color: #555;
      border-top: 1px solid #ccc; padding: 5px 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    main { padding: 0 30px 100px 30px; box-sizing: border-box; }
    h2 { font-size: 16px; color: #34495e; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .total-row td { font-weight: bold; background-color: #f9f9f9; }
    thead th:last-child, tbody td:last-child, tfoot td:last-child { text-align: right; }
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
  <h2>Ringkasan Laba Rugi (SAK EMKM)</h2>
  <table>
    <tr><td>Pendapatan</td><td>Rp ${totalPendapatan.toLocaleString()}</td></tr>
    <tr><td>Harga Pokok Penjualan (HPP)</td><td>(Rp ${totalHPP.toLocaleString()})</td></tr>
    <tr><td><strong>Laba Kotor</strong></td><td><strong>Rp ${labaKotor.toLocaleString()}</strong></td></tr>
    <tr><td>Beban Usaha</td><td>(Rp ${totalBebanOperasional.toLocaleString()})</td></tr>
    <tr><td><strong>Laba Usaha / Bersih</strong></td><td><strong>Rp ${labaBersih.toLocaleString()}</strong></td></tr>
  </table>

  <h2>Detail Pendapatan</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Pelanggan</th><th>Total</th></tr></thead>
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
      <tr class="total-row"><td colspan="2">Total Pendapatan</td><td>Rp ${totalPendapatan.toLocaleString()}</td></tr>
    </tfoot>
  </table>

  <h2>Detail HPP (Bahan Baku)</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Total</th></tr></thead>
    <tbody>
      ${hppExpenses
        .map(
          (exp) => `
        <tr>
          <td>${formatDate(new Date(exp.date))}</td>
          <td>${exp.description || exp.category || "-"}</td>
          <td>Rp ${exp.amount.toLocaleString()}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr class="total-row"><td colspan="2">Total HPP</td><td>Rp ${totalHPP.toLocaleString()}</td></tr>
    </tfoot>
  </table>

  <h2>Detail Beban Usaha</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Kategori</th><th>Total</th></tr></thead>
    <tbody>
      ${operasionalExpenses
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
      <tr class="total-row"><td colspan="2">Total Beban Usaha</td><td>Rp ${totalBebanOperasional.toLocaleString()}</td></tr>
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

// laporan posisi keuangan (neraca)
const generateFinancialPositionReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        status: "Error",
        message: "Tanggal diperlukan",
      });
    }

    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const userId = req.user.id;

    // Transaksi penjualan (pendapatan masuk kas)
    const sales = await Transaction.find({
      userId,
      date: { $lt: nextDate },
    });
    const totalPendapatan = sales.reduce((sum, trx) => sum + trx.amount, 0);

    // Pengeluaran kas
    const expenses = await Expense.find({
      userId,
      date: { $lt: nextDate },
    });
    const totalPengeluaran = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Piutang (Aset)
    const receivables = await Debt.find({
      userId,
      type: "Piutang",
      status: "Belum Lunas",
      dueDate: { $lt: nextDate },
    });
    const totalPiutang = receivables.reduce((sum, r) => sum + r.amount, 0);

    // utang usaha (belum lunas)
    const payables = await Debt.find({
      userId,
      type: "Hutang",
      status: "Belum Lunas",
      dueDate: { $lt: nextDate },
    });
    const totalHutang = payables.reduce((sum, p) => sum + p.amount, 0);

    // kas dan setara kas
    const kas = totalPendapatan - totalPengeluaran;

    // total aset
    const totalAset = kas + totalPiutang;

    // ekuitas
    const ekuitas = totalAset - totalHutang;

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

    .neraca-container {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }

    .column {
      width: 48%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    th, td {
      padding: 10px;
      font-size: 12px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }

    tfoot td {
      font-weight: bold;
      background-color: #f0f0f0;
    }

    tbody td:last-child,
    tfoot td:last-child {
      text-align: right;
    }

    .persamaan-akuntansi {
      margin-top: 40px;
    }

    .persamaan-akuntansi table {
      width: 100%;
    }

    .persamaan-akuntansi td {
      padding: 8px 10px;
      border-bottom: 1px solid #ddd;
    }

    .persamaan-akuntansi td:last-child {
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
    <div class="neraca-container">
      <div class="column">
        <h2>ASET</h2>
        <table>
          <tbody>
            <tr><td>Kas dan Setara Kas</td><td>Rp ${kas.toLocaleString(
              "id-ID"
            )}</td></tr>
            <tr><td>Piutang Usaha</td><td>Rp ${totalPiutang.toLocaleString(
              "id-ID"
            )}</td></tr>
          </tbody>
          <tfoot>
            <tr><td>Total Aset</td><td>Rp ${totalAset.toLocaleString(
              "id-ID"
            )}</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="column">
        <h2>LIABILITAS & EKUITAS</h2>
        <table>
          <tbody>
            <tr><td>Utang Usaha</td><td>Rp ${totalHutang.toLocaleString(
              "id-ID"
            )}</td></tr>
            <tr><td>Modal Pemilik</td><td>Rp ${ekuitas.toLocaleString(
              "id-ID"
            )}</td></tr>
          </tbody>
          <tfoot>
            <tr><td>Total Liabilitas & Ekuitas</td><td>Rp ${(
              totalHutang + ekuitas
            ).toLocaleString("id-ID")}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="persamaan-akuntansi">
      <h2>Persamaan Akuntansi</h2>
      <table>
       <tr><td>Total Aset</td><td>Rp ${totalAset.toLocaleString(
         "id-ID"
       )}</td></tr>
       <tr><td>Total Liabilitas + Ekuitas</td><td>Rp ${(
         totalHutang + ekuitas
       ).toLocaleString("id-ID")}</td></tr>
       </table>
    </div>
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

// buku besar
const generateLedgerReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ status: "Error", message: "startDate dan endDate diperlukan" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ status: "Error", message: "Format tanggal tidak valid" });
    }

    const userId = req.user.id;

    const sales = await Transaction.find({
      userId,
      date: { $gte: start, $lte: end },
    }).populate("orderItems.menuItem");

    const expenses = await Expense.find({
      userId,
      date: { $gte: start, $lte: end },
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
        <h1>Buku Besar</h1>
        <p>Periode: ${formatDate(start)} - ${formatDate(end)}</p>
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

    const filePath = path.join(ensureReportsDirectory(), "buku_besar.pdf");
    await generatePDF(htmlContent, filePath);

    res.download(filePath, "Buku_Besar.pdf");
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Gagal membuat laporan buku besar",
      error: err.message,
    });
  }
};

module.exports = {
  generateProfitLossReport,
  generateFinancialPositionReport,
  generateDailyCashBookReport,
  generateLedgerReport,
};
