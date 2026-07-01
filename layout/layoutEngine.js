// ============================================================
// layoutEngine.js
//
// Implements the "Correct Workflow" from the SmartPrint
// image-printing redesign:
//   1. Upload images
//   2. Apply Images Per Sheet (compose onto sheets)
//   3. Convert composed sheets to a single print-ready PDF
//
// Adobe Reader can only print PDFs, not raw PNG/JPG — this
// module is what makes that possible without touching the
// print agent at all.
// ============================================================

const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// A4 at 150 DPI — good print quality without huge file sizes
const PAGE_WIDTH = 1240;   // px
const PAGE_HEIGHT = 1754;  // px
const MARGIN = 30;         // px, outer margin on the sheet
const GAP = 16;            // px, gap between images on a sheet

// Layout definitions: how many columns/rows for each "per sheet" option
const GRID_LAYOUTS = {
  1: { cols: 1, rows: 1 },
  2: { cols: 1, rows: 2 },
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  9: { cols: 3, rows: 3 },
  12: { cols: 3, rows: 4 }
};

/**
 * Composes a batch of images onto a single sheet (as a PNG buffer)
 * using the given grid layout. Empty cells are left blank, matching
 * the "img3 placed, 4th cell blank" behavior from the workflow diagram.
 */
async function composeSheet(imagePaths, cols, rows) {
  const usableWidth = PAGE_WIDTH - MARGIN * 2;
  const usableHeight = PAGE_HEIGHT - MARGIN * 2;

  const cellWidth = Math.floor((usableWidth - GAP * (cols - 1)) / cols);
  const cellHeight = Math.floor((usableHeight - GAP * (rows - 1)) / rows);

  // Start with a blank white sheet
  const compositeOps = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = MARGIN + col * (cellWidth + GAP);
    const y = MARGIN + row * (cellHeight + GAP);

    // Resize each image to fit inside its cell, preserving aspect ratio,
    // centered, on a white background (so it looks like a clean print tile)
    const resizedBuffer = await sharp(imagePaths[i])
      .rotate() // auto-orient based on EXIF
      .resize(cellWidth, cellHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    compositeOps.push({ input: resizedBuffer, left: x, top: y });
  }

  const sheetBuffer = await sharp({
    create: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite(compositeOps)
    .png()
    .toBuffer();

  return sheetBuffer;
}

/**
 * Main entry point. Takes an array of uploaded image file paths and the
 * chosen images-per-sheet value, and returns a Buffer containing a
 * print-ready PDF — one page per composed sheet.
 *
 * Example: 3 images, imagesPerSheet=4 -> 1 PDF page with 3 images + 1 blank cell
 * Example: 9 images, imagesPerSheet=4 -> 3 PDF pages (4 + 4 + 1)
 */
async function generatePrintablePDF(imagePaths, imagesPerSheet) {
  if (!imagePaths || imagePaths.length === 0) {
    throw new Error('No images provided to compose');
  }

  const layout = GRID_LAYOUTS[imagesPerSheet] || GRID_LAYOUTS[1];
  const { cols, rows } = layout;
  const perSheet = cols * rows;

  const pdfDoc = await PDFDocument.create();

  // Split images into batches, one batch per sheet
  for (let start = 0; start < imagePaths.length; start += perSheet) {
    const batch = imagePaths.slice(start, start + perSheet);
    const sheetPngBuffer = await composeSheet(batch, cols, rows);

    const pngImage = await pdfDoc.embedPng(sheetPngBuffer);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = generatePrintablePDF;