const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── storage paths ──
// On Render use the mounted persistent disk, locally use project folder
const BASE        = process.env.RENDER ? '/opt/render/project/src' : __dirname;
const UPLOADS_DIR = path.join(BASE, 'uploads');
const DATA_DIR    = path.join(BASE, 'data');
const ITEMS_FILE  = path.join(DATA_DIR, 'items.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');

// ── ensure all directories + files exist ──
[UPLOADS_DIR, DATA_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
if (!fs.existsSync(ITEMS_FILE))   fs.writeFileSync(ITEMS_FILE,   '[]');
if (!fs.existsSync(PROFILE_FILE)) fs.writeFileSync(PROFILE_FILE, '{}');

// ── middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));       // serves index.html, style.css, script.js
app.use('/uploads', express.static(UPLOADS_DIR));   // serves uploaded files

// ── multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const uid = Date.now() + '-' + Math.floor(Math.random() * 1e9);
    cb(null, uid + path.extname(file.originalname).toLowerCase());
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)|^video\/(mp4|quicktime|webm|x-msvideo)/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only images and videos are allowed'));
  }
});

// ── DB helpers ──
function readItems()       { try { return JSON.parse(fs.readFileSync(ITEMS_FILE)); } catch(e) { return []; } }
function writeItems(data)  { fs.writeFileSync(ITEMS_FILE, JSON.stringify(data, null, 2)); }
function readProfile()     { try { return JSON.parse(fs.readFileSync(PROFILE_FILE)); } catch(e) { return {}; } }
function writeProfile(data){ fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2)); }

function deleteFile(src) {
  if (!src) return;
  const fp = path.join(UPLOADS_DIR, path.basename(src));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

// ─────────────────────────────────────────
//  API ROUTES
// ─────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── PORTFOLIO ITEMS ──

// GET all items
app.get('/api/items', (req, res) => {
  res.json(readItems());
});

// POST upload portfolio file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category = 'design', name } = req.body;
  const isVideo = req.file.mimetype.startsWith('video/');
  const item = {
    id:        path.parse(req.file.filename).name,
    name:      (name || req.file.originalname).replace(/\.[^.]+$/, ''),
    src:       '/uploads/' + req.file.filename,
    type:      isVideo ? 'video' : 'image',
    category,
    createdAt: Date.now()
  };
  const items = readItems();
  items.push(item);
  writeItems(items);
  res.json(item);
});

// DELETE portfolio item
app.delete('/api/items/:id', (req, res) => {
  let items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  deleteFile(item.src);
  writeItems(items.filter(i => i.id !== req.params.id));
  res.json({ ok: true });
});

// ── PROFILE PHOTO ──

// GET profile
app.get('/api/profile', (req, res) => {
  res.json(readProfile());
});

// POST / update profile photo
app.post('/api/profile', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const existing = readProfile();
  if (existing.src) deleteFile(existing.src);   // remove old profile photo
  const profile = { src: '/uploads/' + req.file.filename, updatedAt: Date.now() };
  writeProfile(profile);
  res.json(profile);
});

// ── catch-all: serve index.html for any unmatched route ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── error handler ──
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Uploads stored in: ${UPLOADS_DIR}`);
  console.log(`✓ Data stored in:    ${DATA_DIR}`);
});
