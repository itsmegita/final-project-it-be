const fs = require("fs");
const path = require("path");
const fastCsv = require("fast-csv");

const exportToCSV = (data, fileName) => {
  return new Promise((resolve, reject) => {
    const exportsDir = path.join(__dirname, "../exports");

    // Pastikan folder `exports/` ada
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
      console.log(`📂 Folder '${exportsDir}' dibuat.`);
    }

    const filePath = path.join(exportsDir, fileName);
    const ws = fs.createWriteStream(filePath, { encoding: "utf8" });

    // Tambahkan BOM agar Excel bisa membaca UTF-8 dengan baik
    ws.write("\uFEFF");

    const csvStream = fastCsv.format({ headers: true });

    csvStream
      .pipe(ws)
      .on("finish", () => {
        console.log(`✅ CSV berhasil diekspor: ${filePath}`);
        resolve(filePath);
      })
      .on("error", (err) => {
        console.error("❌ Gagal menulis CSV:", err);
        reject(err);
      });

    data.forEach((row) => csvStream.write(row));

    csvStream.end();
  });
};

module.exports = { exportToCSV };
