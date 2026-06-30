// layout/pdfMerger.js

const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

async function mergePDFs(files, outputPath) {

    const merged = await PDFDocument.create();

    for (const file of files) {

        const bytes = fs.readFileSync(file);

        const pdf = await PDFDocument.load(bytes);

        const copiedPages = await merged.copyPages(
            pdf,
            pdf.getPageIndices()
        );

        copiedPages.forEach(page => merged.addPage(page));

    }

    const mergedBytes = await merged.save();

    fs.writeFileSync(outputPath, mergedBytes);

    return outputPath;

}

module.exports = mergePDFs;