console.log("===== SMART PRINT BUILD v2 =====");
console.log("OpenRouter Key Length:", process.env.OPENROUTER_API_KEY?.length);
console.log(process.env);
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config();
console.log("OpenRouter Key Length:", process.env.OPENROUTER_API_KEY?.length);

console.log(
    "Starts With:",
    process.env.OPENROUTER_API_KEY?.substring(0,8)
);

// ============================================================
// FIREBASE INIT
// ============================================================
let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
  serviceAccount = require('./serviceAccount.json');
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// ============================================================
// AI HELPERS — OpenRouter with model fallback
// ============================================================

// Text models — tries each one until one works
const TEXT_MODELS = [
  "openrouter/auto",
  "openrouter/free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free"
];

// Vision models — tries each one until one works
const VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openrouter/auto'
];

async function callOpenRouter(model, messages) {

    for (let attempt = 1; attempt <= 3; attempt++) {

        try {
            console.log("========== OpenRouter Debug ==========");
            console.log("Model:", model);
            console.log("Key exists:", !!process.env.OPENROUTER_API_KEY);
            console.log("Key prefix:", process.env.OPENROUTER_API_KEY?.substring(0, 8));
            console.log("Authorization:", `Bearer ${process.env.OPENROUTER_API_KEY?.substring(0, 15)}...`);
            console.log("======================================");

            const res = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                      "Content-Type": "application/json",
                      "Referer": process.env.RAILWAY_PUBLIC_DOMAIN
                          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
                          : "http://localhost:3000",
                      "X-Title": "SmartPrint"
                  },
                    body: JSON.stringify({
                        model,
                        messages
                    })
                }
            );

            const data = await res.json();

            if (res.ok) {
                return data;
            }

            console.log(`Attempt ${attempt} failed for ${model}`);

            console.log(data);

            if (attempt < 3) {

                await new Promise(r => setTimeout(r, 1500));

                continue;

            }

            return {
                error: data.error
            };

        }

        catch (err) {

            console.log(err.message);

            if (attempt < 3) {

                await new Promise(r => setTimeout(r, 1500));

                continue;

            }

            return {
                error: {
                    message: err.message
                }
            };

        }

    }

}

async function askAI(prompt) {

    let lastError = "Unknown error";

    for (const model of TEXT_MODELS) {

        console.log("\nTrying:", model);

        const data = await callOpenRouter(model, [
            {
                role: "user",
                content: prompt
            }
        ]);

        if (data.error) {

            console.log("Failed:", model);

            lastError = data.error.message || lastError;

            continue;

        }

        console.log("Success:", model);

        return data.choices[0].message.content.trim();

    }

    throw new Error(lastError);

}

async function askAIVision(prompt, imageBase64, mimeType) {
  for (const model of VISION_MODELS) {
    try {
      console.log('Trying vision model:', model);
      const data = await callOpenRouter(model, [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }]);
      if (data.error) {
        console.log('Vision model', model, 'error:', data.error.code, '-', data.error.message?.substring(0, 80));
        continue;
      }
      const text = data.choices[0].message.content.trim();
      console.log('Vision success with model:', model);
      return text;
    } catch (e) {
      console.log('Vision model', model, 'threw:', e.message);
      continue;
    }
  }
  throw new Error('All vision AI models are currently unavailable. Please try again in a minute.');
}

function cleanJSON(text) {
  // Extract JSON from response — handles markdown fences and extra text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  return text.replace(/```json|```/g, '').trim();
}
async function getActualPageCount(filePath) {

    try {

        const ext = path.extname(filePath).toLowerCase();

        if (ext === ".pdf") {

            const bytes = fs.readFileSync(filePath);

            const pdf = await PDFDocument.load(bytes);

            return pdf.getPageCount();

        }

        return 1;

    } catch (err) {

        console.log("Page Count Error:", err.message);

        return 1;

    }

}

// ============================================================
// EXPRESS SETUP
// ============================================================
const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});
const upload = multer({ storage });
const uploadMultiple = multer({ storage }).array('images', 50); // up to 50 images per batch
const generatePrintablePDF = require("./layout/layoutEngine");

// ============================================================
// STATIC ROUTES
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.get('/operator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'operator.html')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => res.json({ message: 'Smart Print server is running!' }));

// ============================================================
// ORIGINAL: SUBMIT PRINT JOB
// ============================================================
app.post('/api/page-count', upload.single('file'), async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                error: "No file uploaded"
            });

        }

        const pages = await getActualPageCount(req.file.path);

        fs.unlink(req.file.path, () => {});

        res.json({
            success: true,
            pages
        });

    }

    catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

// ============================================================
// NEW: COMPOSE IMAGES → PDF
// Implements the "Correct Workflow" from the redesign diagram:
//   Upload Images -> Apply Images Per Sheet -> Compose Sheets
//   -> Convert to PDF -> print_ready.pdf
//
// This lets students upload PNG/JPG images and still get a file
// Adobe Reader (and the existing print_agent) can actually print,
// with zero changes needed to print_agent_v2.py.
// ============================================================
app.post('/api/compose-images', uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const imagesPerSheet = parseInt(req.body.imagesPerSheet) || 1;
    const imagePaths = req.files.map(f => f.path);

    console.log(`🖼️ Composing ${imagePaths.length} images, ${imagesPerSheet} per sheet...`);

    const pdfBuffer = await generatePrintablePDF(imagePaths, imagesPerSheet);

    // Save the composed PDF into uploads/ so it gets a public URL just
    // like any other uploaded file
    const pdfFileName = Date.now() + '_print_ready.pdf';
    const pdfPath = path.join(__dirname, 'uploads', pdfFileName);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Clean up the original uploaded images — we only need the PDF now
    imagePaths.forEach(p => fs.unlink(p, () => {}));

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    const fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + pdfFileName
      : 'http://localhost:3000/uploads/' + pdfFileName;

    console.log(`✅ Composed PDF ready: ${pdfFileName} (${pageCount} page${pageCount > 1 ? 's' : ''})`);

    res.json({
      success: true,
      fileUrl,
      fileName: pdfFileName,
      pages: pageCount,
      imagesComposed: imagePaths.length,
      imagesPerSheet
    });
  } catch (err) {
    console.error('Compose images error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/jobs', upload.single('file'), async (req, res) => {
  try {
    const { name, whatsapp, color, sides, copies, urgent, paid, pages, colorRanges } = req.body;
    const db = admin.firestore();

    let fileUrl = '';
    let fileName = 'unknown';
    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + req.file.filename
        : 'http://localhost:3000/uploads/' + req.file.filename;
    }

    const counter = await db.collection('meta').doc('counter').get();
    const token = (counter.exists ? counter.data().value : 0) + 1;
    await db.collection('meta').doc('counter').set({ value: token });

    const job = {
      token: String(token).padStart(2, '0'),
      name, whatsapp, color, sides,
      copies: parseInt(copies),
      urgent: urgent === 'true',
      paid: paid === 'true',
      pages: req.file
    ? await getActualPageCount(req.file.path)
    : parseInt(pages) || 1,
      colorRanges: colorRanges ? JSON.parse(colorRanges) : [],
      fileName, fileUrl,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('jobs').add(job);
    res.json({ success: true, token: job.token, fileUrl, fileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ORIGINAL: GET / APPROVE / REJECT JOBS
// ============================================================
app.get('/api/jobs', async (req, res) => {
  try {
    const db = admin.firestore();
    const snap = await db.collection('jobs').where('status', '==', 'pending').orderBy('createdAt').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/processing', async (req, res) => {
  try {
    await admin.firestore().collection('jobs').doc(req.params.id).update({ status: 'processing' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/jobs/:id/approve', async (req, res) => {
  try {
    await admin.firestore().collection('jobs').doc(req.params.id).update({ status: 'approved' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/jobs/:id/reject', async (req, res) => {
  try {
    await admin.firestore().collection('jobs').doc(req.params.id).update({ status: 'rejected' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// FEATURE 1: AI PRINT ASSISTANT
// ============================================================
app.post('/api/ai/analyze', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = file.originalname;
    const fileSizeKB = Math.round(file.size / 1024);
    const ext = path.extname(fileName).replace('.', '').toUpperCase();

    const prompt = `You are a print settings advisor for a college print shop.
A student uploaded: name="${fileName}", type=${ext}, size=${fileSizeKB}KB.
Based on the filename, recommend print settings.
Reply with ONLY a JSON object, absolutely no other text:
{"documentType":"assignment","colorMode":"bw","orientation":"portrait","sides":"single","copies":1,"reasoning":{"colorMode":"text documents print fine in B&W","orientation":"standard document format","sides":"single sided for easy reading"},"costTip":"Print B&W to save money","warning":null}`;

    const raw = await askAI(prompt);
    console.log("===== AI RAW RESPONSE =====");
    console.log(raw);
    console.log("===========================");
    const recommendation = JSON.parse(cleanJSON(raw));
    res.json({ success: true, recommendation });
  } catch (err) {
    console.error('Feature 1 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 2: OCR
// ============================================================
app.post('/api/ai/ocr', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!imageExts.includes(ext)) {
      return res.status(400).json({ error: 'OCR only supports image files (JPG, PNG, WEBP)' });
    }

    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    const prompt = `Extract ALL text from this image for a print shop OCR system.
Reply with ONLY a JSON object, no other text:
{"extractedText":"paste all text here","detectedOrientation":"portrait","confidence":"high","qualityIssues":[],"suggestedFixes":[],"hasHandwriting":false,"printReady":true}`;

    const raw = await askAIVision(prompt, base64Image, mimeType);
    const ocrResult = JSON.parse(cleanJSON(raw));

    const fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + file.filename
      : 'http://localhost:3000/uploads/' + file.filename;

    res.json({ success: true, fileUrl, originalName: file.originalname, ...ocrResult });
  } catch (err) {
    console.error('Feature 2 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 3: AI PRINT PREVIEW CHECK
// ============================================================
app.post('/api/ai/preview-check', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { color, sides, copies } = req.body;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const fileSizeKB = Math.round(file.size / 1024);

    if (isImage) {
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

      const prompt = `Analyze this image for print quality. Settings: color=${color || 'bw'}, sides=${sides || 'single'}, copies=${copies || 1}.
Reply with ONLY a JSON object, no other text:
{"issues":[],"warnings":[],"previewNotes":["describe print output here"],"resolution":"high","recommendedOrientation":"portrait","willLookGoodBW":true,"estimatedPages":1,"overallScore":"good"}`;

      const raw = await askAIVision(prompt, base64Image, mimeType);
      const result = JSON.parse(cleanJSON(raw));

      const fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + file.filename
        : 'http://localhost:3000/uploads/' + file.filename;

      return res.json({ success: true, fileUrl, ...result });
    }

    // For PDF/DOC — heuristic checks (no AI needed)
    const warnings = [];
    const previewNotes = [];
    if (fileSizeKB < 10) warnings.push('File is very small — may be empty or corrupt.');
    if (color === 'bw') previewNotes.push('Will print in grayscale. Colour charts will lose distinction.');
    if (sides === 'double') previewNotes.push('Double-sided enabled. Ensure even page count.');
    if (parseInt(copies) > 5) warnings.push(`${copies} copies — confirm before submitting.`);

    res.json({ success: true, issues: [], warnings, previewNotes, overallScore: 'good', fileType: ext.replace('.', '').toUpperCase() });
  } catch (err) {
    console.error('Feature 3 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 4: MERCHANT ANALYTICS
// ============================================================
app.get('/api/analytics', async (req, res) => {
  try {
    const db = admin.firestore();
    const { range = '7' } = req.query;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range));

    const snap = await db.collection('jobs').orderBy('createdAt', 'desc').get();
    const allJobs = snap.docs.map(d => d.data());

    const jobs = allJobs.filter(j => {
      if (!j.createdAt) return true;
      const ts = j.createdAt.toDate ? j.createdAt.toDate() : new Date(j.createdAt);
      return ts >= cutoff;
    });

    const totalJobs = jobs.length;
    const totalPages = jobs.reduce(
    (s,j)=>s+Number(j.pages||0),
    0
    );
    const colorJobs = jobs.filter(j => j.color === 'color').length;
    const bwJobs = jobs.filter(j => j.color === 'bw').length;
    const urgentJobs = jobs.filter(j => j.urgent).length;
    const completedJobs = jobs.filter(
    j =>
        j.status === "approved" ||
        j.status === "completed"
    ).length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length;
    const avgCopies = totalJobs > 0 ? (jobs.reduce((s, j) => s + Number(j.copies || 1), 0) / totalJobs).toFixed(1) : 0;
    const paidJobs = jobs.filter(j => j.paid).length;
    const unpaidJobs = totalJobs - paidJobs;

    const hourBuckets = Array(24).fill(0);
    jobs.forEach(j => { if (j.createdAt && j.createdAt.toDate) hourBuckets[j.createdAt.toDate().getHours()]++; });
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    const stats = {
      period: `Last ${range} days`,
      totalJobs, totalPages, colorJobs, bwJobs,
      urgentJobs, completedJobs, pendingJobs, rejectedJobs,
      avgCopies: parseFloat(avgCopies), paidJobs, unpaidJobs,
      peakHour:
      totalJobs
      ?
      `${peakHour}:00 - ${peakHour+1}:00`
      :
      "No data",
      colorVsBwRatio: totalJobs > 0
        ? `${Math.round((colorJobs / totalJobs) * 100)}% colour, ${Math.round((bwJobs / totalJobs) * 100)}% B&W`
        : 'No data'
    };

    const summaryPrompt = `You are a business analyst for a college print shop. Here are the stats: ${JSON.stringify(stats)}.
Write 3-4 sentences summarizing key metrics and one actionable tip for the shop owner.
Plain paragraph only, no bullets, no markdown, no JSON.`;

    
    let aiSummary;

    try{

        aiSummary = await askAI(summaryPrompt);

    }
    catch(err){

        console.log("Analytics AI failed:",err.message);

        aiSummary =
            "Print activity looks normal. Black & White jobs dominate the workload. Consider promoting double-sided printing to reduce paper usage and improve efficiency.";

}
    res.json({ success: true, stats, aiSummary, hourlyDistribution: hourBuckets });
  }
  catch (err) {

    console.log("\n========== ANALYTICS ERROR ==========");

    console.error(err);

    console.log("Stack:");

    console.log(err.stack);

    console.log("=====================================\n");

    res.status(500).json({

        success:false,

        error:err.message || "Analytics failed"

    });

}
});

// ============================================================
// FEATURE 5: NATURAL LANGUAGE PRINT REQUESTS
// ============================================================
app.post('/api/ai/parse-request', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

    const prompt = `You are a print settings parser for a college print shop.
Student said: "${text}"
Extract print settings from this request.
Reply with ONLY a JSON object, no other text:
{"color":"bw","sides":"single","copies":1,"urgent":false,"orientation":"auto","understood":"1 copy black and white single sided","missingInfo":[],"confidence":"high"}`;

    const raw = await askAI(prompt);
    const parsed = JSON.parse(cleanJSON(raw));
    res.json({ success: true, settings: parsed });
  } catch (err) {
    console.error('Feature 5 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FALLBACK
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Smart Print server running on port ${PORT}`));