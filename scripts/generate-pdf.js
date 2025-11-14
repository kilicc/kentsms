const markdownpdf = require("markdown-pdf");
const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "../API_DOCUMENTATION_EN.md");
const outputFile = path.join(__dirname, "../API_DOCUMENTATION_EN.pdf");

console.log("📄 Generating PDF from markdown...");
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputFile}`);

const options = {
  paperFormat: "A4",
  paperOrientation: "portrait",
  paperBorder: "2cm",
  renderDelay: 1000,
  cssPath: path.join(__dirname, "pdf-styles.css"),
};

markdownpdf(options)
  .from(inputFile)
  .to(outputFile, function () {
    console.log("✅ PDF generated successfully!");
    console.log(`📁 Output file: ${outputFile}`);
  });

