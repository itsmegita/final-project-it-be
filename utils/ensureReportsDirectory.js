const path = require("path");
const fs = require("fs");

const ensureReportsDirectory = () => {
  const reportsDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
};

module.exports = {
  ensureReportsDirectory,
};
