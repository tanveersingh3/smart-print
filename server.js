const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
// AI HELPERS — OpenRouter
// ============================================================
async function askAI(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content.trim();
}

async function askAIVision(prompt, imageBase64, mimeType) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content.trim();
}

function cleanJSON(text) {
  return text.replace(/```json|```/g, '').trim();
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
      pages: parseInt(pages) || 0,
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

    const prompt = `You are a smart print settings advisor for a college print shop.
A student uploaded: name="${fileName}", type=${ext}, size=${fileSizeKB}KB.
Respond ONLY with this JSON, no markdown, fill in the values:
{"documentType":"what this document likely is","colorMode":"bw","orientation":"portrait","sides":"single","copies":1,"reasoning":{"colorMode":"reason","orientation":"reason","sides":"reason"},"costTip":"one tip","warning":null}`;

    const raw = await askAI(prompt);
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

    const prompt = `You are an OCR engine for a print shop. Extract ALL text from this image.
Respond ONLY with this JSON, no markdown:
{"extractedText":"all text from image","detectedOrientation":"portrait","confidence":"high","qualityIssues":[],"suggestedFixes":[],"hasHandwriting":false,"printReady":true}`;

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

      const prompt = `You are a print quality checker. Analyze this image for print-readiness.
Settings: color=${color || 'bw'}, sides=${sides || 'single'}, copies=${copies || 1}.
Respond ONLY with this JSON, no markdown:
{"issues":[],"warnings":[],"previewNotes":["describe what the print will look like"],"resolution":"high","recommendedOrientation":"portrait","willLookGoodBW":true,"estimatedPages":1,"overallScore":"good"}`;

      const raw = await askAIVision(prompt, base64Image, mimeType);
      const result = JSON.parse(cleanJSON(raw));

      const fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + file.filename
        : 'http://localhost:3000/uploads/' + file.filename;

      return res.json({ success: true, fileUrl, ...result });
    }

    const warnings = [];
    const previewNotes = [];
    if (fileSizeKB < 10) warnings.push('File is very small — may be empty or corrupt.');
    if (color === 'bw') previewNotes.push('Will print in grayscale.');
    if (sides === 'double') previewNotes.push('Double-sided enabled.');
    if (parseInt(copies) > 5) warnings.push(`${copies} copies requested — confirm before submitting.`);

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
    const totalPages = jobs.reduce((s, j) => s + (j.pages || 0), 0);
    const colorJobs = jobs.filter(j => j.color === 'color').length;
    const bwJobs = jobs.filter(j => j.color === 'bw').length;
    const urgentJobs = jobs.filter(j => j.urgent).length;
    const completedJobs = jobs.filter(j => j.status === 'done').length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length;
    const avgCopies = totalJobs > 0 ? (jobs.reduce((s, j) => s + (j.copies || 1), 0) / totalJobs).toFixed(1) : 0;
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
      peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
      colorVsBwRatio: totalJobs > 0 ? `${Math.round((colorJobs/totalJobs)*100)}% colour, ${Math.round((bwJobs/totalJobs)*100)}% B&W` : 'No data'
    };

    const summaryPrompt = `You are a business analyst for a print shop. Stats for last ${range} days: ${JSON.stringify(stats)}. Write 3-4 sentences summarizing key metrics and one actionable tip. Plain paragraph, no bullets.`;

    const aiSummary = await askAI(summaryPrompt);
    res.json({ success: true, stats, aiSummary, hourlyDistribution: hourBuckets });
  } catch (err) {
    console.error('Feature 4 error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 5: NATURAL LANGUAGE PRINT REQUESTS
// ============================================================
app.post('/api/ai/parse-request', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

    const prompt = `You are a print settings parser. Student said: "${text}"
Respond ONLY with this JSON, no markdown:
{"color":"bw","sides":"single","copies":1,"urgent":false,"orientation":"auto","understood":"printing 1 copy black and white single sided","missingInfo":[],"confidence":"high"}`;

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