const path = require("path");

const imageToPDF = require("./imageConverter");

const mergePDFs = require("./pdfMerger");

const { isImage } = require("./helpers");

async function generatePrintablePDF(files, outputFile) {

    const pdfFiles = [];

    for (const file of files) {

        if (isImage(file)) {

            console.log("Converting image:", file);

            const pdf = await imageToPDF(file);

            pdfFiles.push(pdf);

        }

        else {

            pdfFiles.push(file);

        }

    }

    console.log("Merging PDFs...");

    await mergePDFs(pdfFiles, outputFile);

    console.log("Layout Engine Complete");

    return outputFile;

}

module.exports = generatePrintablePDF;