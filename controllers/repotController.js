const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Transaction = require("../models/Transaction");

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

    // memastikan bahwa folder reports ada
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // buat dokumen pdf
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, "../reports/laba_rugi.pdf");
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // header
    doc.fontSize(16).text("Laporan Laba Rugi", { align: "center" });
    doc
      .fontSize(12)
      .text(`Periode: ${startDate} - ${endDate}`, { align: "center" });
    doc.moveDown();

    // ringkasan keuangan
    doc.fontSize(14).text("Ringkasan Keuangan:");
    doc
      .fontSize(12)
      .text(`Total Pendapatan: Rp.${totalIncome.toLocaleString()}`);
    doc
      .fontSize(12)
      .text(`Total Pengeluaran: Rp.${totalExpense.toLocaleString()}`);
    doc
      .fontSize(12)
      .text(`Keuntungan / Kerugian: Rp.${profitOrLoss.toLocaleString()}`, {
        underline: true,
      });
    doc.moveDown();

    // detail pendapatan
    doc.fontSize(14).text("Rincian Pendapatan:");
    transactions
      .filter((trx) => trx.type === "income")
      .forEach((trx, index) => {
        doc
          .fontSize(12)
          .text(
            `${index + 1}. ${
              trx.category
            }: Rp${trx.amount.toLocaleString()} - ${trx.description}`
          );
      });
    doc.moveDown();

    // detail pengeluaran
    doc.fontSize(14).text("Rincian Pengeluaran:");
    transactions
      .filter((trx) => trx.type === "expense")
      .forEach((trx, index) => {
        doc
          .fontSize(12)
          .text(
            `${index + 1}. ${
              trx.category
            }: Rp ${trx.amount.toLocaleString()} - ${trx.description}`
          );
      });

    // akhir pdf
    doc.end();

    stream.on("finish", () => {
      res.download(filePath, "Laporan_Laba_Rugi.pdf", (err) => {
        if (err)
          res
            .status(500)
            .json({ status: "Error", message: "Gagal mengunduh laporan" });
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

    const doc = new PDFDocument();
    const reportPath = path.join(__dirname, "../reports/arus_kas.pdf");
    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    // header
    doc.fontSize(16).text("Laporan Arus Kas", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Periode: ${startDate} - ${endDate}`, { align: "center" });
    doc.moveDown();

    // detail
    doc
      .fontSize(12)
      .text(`Total Pemasukan: RP.${totalIncome.toLocaleString()}`);
    doc.text(`Total Pengeluaran: Rp.${totalExpense.toLocaleString()}`);
    doc.text(`Arus kas bersih: Rp.${netCashFlow.toLocaleString()}`);

    doc.moveDown();
    doc.text("Rincian Transaksi:");
    transactions.forEach((trx, index) => {
      doc.text(
        `${index + 1}. ${trx.category} - Rp${trx.amount.toLocaleString()} (${
          trx.type
        })`
      );
    });

    doc.end();

    stream.on("finish", () => {
      res.download(reportPath, "arus_ks.pdf", (err) => {
        if (err) {
          console.error("Download error: ", err);
          res.status(500).json({
            status: "Error",
            message: "Gagal mengunduh laporan",
          });
        }
      });
    });
  } catch (err) {
    res.status(500).json({
      status: "Error",
      message: "Terjadi kesalahan saat membuat laporan arus kas",
      error: err.message,
    });
  }
};

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
    const doc = new PDFDocumnet({ margin: 50 });
    const filePath = path.joiin(
      __dirname,
      "../reports/rekapitulasi_transaksi.pdf"
    );
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // header
    doc
      .fontSize(16)
      .text("Laporan Rekapitulasi Transaksi", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Periode: ${startDate} - ${endDate}`, { align: "center" });
    doc.moveDown();

    // tabel
    doc.fontSize(12).text("Kategori", 50, doc.y, { bold: true });
    doc.text("Total", 300, doc.y, { bold: true });
    doc.text("Persentase", 450, doc.y, { bold: true });
    doc.moveDown();

    Object.keys(summary).forEach((category) => {
      doc.text(category, 50, doc.y);
      doc.text(`Rp ${summary[category].toLocaleString()}`, 300, doc.y);
      doc.text(
        `${((summary[category] / totalAmount) * 100).toFixed(2)}%`,
        450,
        doc.y
      );
      doc.moveDown();
    });

    // total keseluruhan
    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Total: Rp ${totalAmount.toLocaleString()}`, { align: "right" });

    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, "rekapitulasi_transaksi.pdf", (err) => {
        if (err) {
          console.error("Error saat mengunduh laporan:", err);
          res.status(500).json({
            status: "Error",
            message: "Gagal mengunduh laporan",
          });
        }
      });
    });
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
