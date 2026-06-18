const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB   = path.join(__dirname, 'data', 'items.json');

// ── ensure folders exist ──
['uploads', 'data'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d);
});
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');

// ── middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));          // serves index.html, style.css, script.js
app.use('/uploads', express.static('uploads'));

// ── multer storage ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm)/;
    cb(null, allowed.test(file.mimetype));
  }
});

// ── helpers ──
function readDB()       { return JSON.parse(fs.readFileSync(DB)); }
function writeDB(data)  { fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

// ── API routes ──

// GET all items
app.get('/api/items', (req, res) => {
  res.json(readDB());
});

// POST upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category, name } = req.body;
  const isVideo = req.file.mimetype.startsWith('video/');
  const item = {
    id:       req.file.filename.split('.')[0],
    name:     name || req.file.originalname.replace(/\.[^.]+$/, ''),
    src:      '/uploads/' + req.file.filename,
    type:     isVideo ? 'video' : 'image',
    category: category || 'design',
    createdAt: Date.now()
  };
  const db = readDB();
  db.push(item);
  writeDB(db);
  res.json(item);
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  let db = readDB();
  const item = db.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(__dirname, item.src);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db = db.filter(i => i.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
