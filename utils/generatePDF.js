const puppeteer = require("puppeteer");

const generatePDF = async (htmlContent, outputFilePath) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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

module.exports = {
  generatePDF,
};
