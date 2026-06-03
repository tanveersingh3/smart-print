const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Smart Print server is running!' });
});

// Submit a print job
app.post('/api/jobs', upload.single('file'), async (req, res) => {
  try {
    const { name, whatsapp, color, sides, copies, urgent, paid } = req.body;
    const db = admin.firestore();

    // Get next token number
    const counter = await db.collection('meta').doc('counter').get();
    const token = (counter.exists ? counter.data().value : 0) + 1;
    await db.collection('meta').doc('counter').set({ value: token });

    // Save job
    const job = {
      token: String(token).padStart(2, '0'),
      name, whatsapp, color, sides,
      copies: parseInt(copies),
      urgent: urgent === 'true',
      paid: paid === 'true',
      fileName: req.file ? req.file.originalname : 'unknown',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('jobs').add(job);
    res.json({ success: true, token: job.token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pending jobs
app.get('/api/jobs', async (req, res) => {
  const db = admin.firestore();
  const snap = await db.collection('jobs')
    .where('status', '==', 'pending')
    .orderBy('createdAt').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

// Approve a job
app.patch('/api/jobs/:id/approve', async (req, res) => {
  const db = admin.firestore();
  await db.collection('jobs').doc(req.params.id).update({ status: 'approved' });
  res.json({ success: true });
});

// Reject a job
app.patch('/api/jobs/:id/reject', async (req, res) => {
  const db = admin.firestore();
  await db.collection('jobs').doc(req.params.id).update({ status: 'rejected' });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Smart Print server running on port ${PORT}`));