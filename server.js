const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
  serviceAccount = require('./serviceAccount.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// Store uploads in /uploads folder, keep original filename
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const unique = Date.now() + '_' + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({ storage });

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Smart Print server is running!' });
});

// Submit print job
app.post('/api/jobs', upload.single('file'), async (req, res) => {
  try {
    const { name, whatsapp, color, sides, copies,
            urgent, paid, pages, colorRanges } = req.body;
    const db = admin.firestore();

    // File URL on Railway
    let fileUrl = '';
    let fileName = 'unknown';
    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN + '/uploads/' + req.file.filename
        : 'http://localhost:8080/uploads/' + req.file.filename;
    }

    // Get next token
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
      fileName,
      fileUrl,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('jobs').add(job);
    res.json({ success: true, token: job.token, fileUrl, fileName });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const db = admin.firestore();
    const snap = await db.collection('jobs')
      .where('status', '==', 'pending')
      .orderBy('createdAt').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve job
app.patch('/api/jobs/:id/approve', async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection('jobs').doc(req.params.id)
            .update({ status: 'approved' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject job
app.patch('/api/jobs/:id/reject', async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection('jobs').doc(req.params.id)
            .update({ status: 'rejected' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All other routes serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Smart Print server running on port ${PORT}`));