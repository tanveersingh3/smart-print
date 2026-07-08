// submit-test-jobs.js
// Submits N random test print jobs to your SmartPrint backend,
// spread out at random intervals over a time window you choose.
//
// Usage:
//   node submit-test-jobs.js
//   (it will then ask you: how many jobs? over how many minutes?)
//
// Requires Node 18+ (built-in fetch, FormData, Blob).

const readline = require("readline");

const BACKEND_URL = "https://smart-print-production.up.railway.app";

// ---- random data pools ----
const NAMES = [
  "Aarav Sharma", "Priya Verma", "Rohan Mehta", "Ananya Singh",
  "Karan", "Isha", "Vivek", "Sneha Nair",
  "Aditya", "Meera Joshi", "Arjun Malhotra", "Divya",
];

function randomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

function randomWhatsapp() {
  // Indian mobile: starts 6-9, 10 digits
  const first = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
  let rest = "";
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return `+91 ${first}${rest.slice(0, 4)} ${rest.slice(4)}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---- minimal valid PDF generator (no deps) ----
function buildDummyPdf(pageCount) {
  const objs = [];
  objs.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  const kids = [];
  for (let i = 0; i < pageCount; i++) kids.push(`${3 + i * 2} 0 R`);
  objs.push(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>\nendobj`);

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    objs.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R >>\nendobj`
    );
    const text = `Test Page ${i + 1}`;
    const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
    objs.push(
      `${contentObjNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objs) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

async function submitOneJob(index) {
  const pages = randomInt(1, 8);
  const name = randomName();
  const whatsapp = randomWhatsapp();
  const color = randomChoice(["bw", "bw", "bw", "color"]); // mostly bw, some color
  const sides = randomChoice(["single", "double"]);
  const copies = randomInt(1, 3);
  const urgent = Math.random() < 0.2; // 20% urgent

  const pdfBuffer = buildDummyPdf(pages);
  const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });

  const formData = new FormData();
  formData.append("name", name);
  formData.append("whatsapp", whatsapp);
  formData.append("color", color);
  formData.append("sides", sides);
  formData.append("copies", String(copies));
  formData.append("urgent", String(urgent));
  formData.append("paid", "false");
  formData.append("pages", String(pages));
  formData.append("colorRanges", JSON.stringify([]));
  formData.append("fileType", "doc");
  formData.append("imgPerSheet", "1");
  formData.append("file", fileBlob, `test-job-${index}.pdf`);

  console.log(
    `[${index}] Submitting: ${name} | ${whatsapp} | ${pages}p | ${color} | ${sides} | x${copies}${urgent ? " | URGENT" : ""}`
  );

  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      console.error(`[${index}] FAILED:`, data.error || data);
      return;
    }
    console.log(`[${index}] OK -> token: ${data.token}`);
  } catch (err) {
    console.error(`[${index}] ERROR:`, err.message);
  }
}

// Generate (count - 1) random gaps between jobs that sum to windowMs total,
// so all `count` jobs land at random-but-spread-out times within the window.
function randomGapsSummingTo(windowMs, count) {
  if (count <= 1) return [];
  const cuts = [];
  for (let i = 0; i < count - 1; i++) cuts.push(Math.random() * windowMs);
  cuts.sort((a, b) => a - b);
  const gaps = [];
  let prev = 0;
  for (const c of cuts) {
    gaps.push(c - prev);
    prev = c;
  }
  return gaps; // length = count - 1
}

// ---- interactive prompt ----
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const countAnswer = await ask("How many jobs do you want to submit? ");
  const count = parseInt(countAnswer) || 1;

  const minutesAnswer = await ask("Over how many minutes should they be spread? (0 = submit all immediately) ");
  const windowMinutes = parseFloat(minutesAnswer) || 0;

  console.log(`\nSubmitting ${count} test job(s) to ${BACKEND_URL} ...\n`);

  if (windowMinutes > 0) {
    const windowMs = windowMinutes * 60 * 1000;
    const gaps = randomGapsSummingTo(windowMs, count);
    console.log(`Spreading ${count} jobs at random intervals across ${windowMinutes} minute(s)...\n`);
    for (let i = 1; i <= count; i++) {
      await submitOneJob(i);
      if (i < count) {
        const gap = gaps[i - 1];
        console.log(`   ...waiting ${(gap / 1000).toFixed(1)}s before next job\n`);
        await new Promise((r) => setTimeout(r, gap));
      }
    }
  } else {
    for (let i = 1; i <= count; i++) {
      await submitOneJob(i);
    }
  }

  console.log("\nDone.");
}

main();