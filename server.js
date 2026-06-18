const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// On Render, use the persistent disk mount path; locally use __dirname
const BASE    = process.env.RENDER ? '/opt/render/project/src' : __dirname;
const UPLOADS = path.join(BASE, 'uploads');
const DB      = path.join(BASE, 'data', 'items.json');

// ── ensure folders exist ──
[UPLOADS, path.join(BASE, 'data')].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');

// ── middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS));

// ── multer storage ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm)/;
    cb(null, allowed.test(file.mimetype));
  }
});

// ── helpers ──
function readDB()      { return JSON.parse(fs.readFileSync(DB)); }
function writeDB(data) { fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

// ── API routes ──
app.get('/api/items', (req, res) => {
  res.json(readDB());
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category, name } = req.body;
  const isVideo = req.file.mimetype.startsWith('video/');
  const item = {
    id:        req.file.filename.split('.')[0],
    name:      name || req.file.originalname.replace(/\.[^.]+$/, ''),
    src:       '/uploads/' + req.file.filename,
    type:      isVideo ? 'video' : 'image',
    category:  category || 'design',
    createdAt: Date.now()
  };
  const db = readDB();
  db.push(item);
  writeDB(db);
  res.json(item);
});

app.delete('/api/items/:id', (req, res) => {
  let db = readDB();
  const item = db.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(UPLOADS, path.basename(item.src));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db = db.filter(i => i.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
