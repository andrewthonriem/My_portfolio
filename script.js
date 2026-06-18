const API = '';  // same origin — empty means relative URLs

// ── NAV TOGGLE ──
function toggleNav() {
  const links   = document.getElementById('navLinks');
  const toggle  = document.getElementById('navToggle');
  const overlay = document.getElementById('navOverlay');
  links.classList.toggle('open');
  toggle.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeNav() {
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('navToggle').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('open');
}

// ── STATE ──
let items = [];
let selectedCategory = null;
let isAdmin = false;
const ADMIN_PASS = 'andrew2024';

// ── LOAD ITEMS FROM SERVER ──
async function loadItems() {
  try {
    const res = await fetch(API + '/api/items');
    items = await res.json();
  } catch(e) {
    console.error('Could not load items', e);
    items = [];
  }
  renderFolderCounts();
}

// ── PROFILE PHOTO ──
async function loadProfile() {
  try {
    const res = await fetch(API + '/api/profile');
    const data = await res.json();
    if (data.src) setProfileAvatar(data.src);
  } catch(e) {}
}
function setProfileAvatar(src) {
  document.getElementById('profileAvatar').innerHTML = `<img src="${src}" alt="Profile">`;
}
document.getElementById('profileInput').addEventListener('change', async function() {
  if (!this.files[0]) return;
  const formData = new FormData();
  formData.append('file', this.files[0]);
  try {
    const res  = await fetch(API + '/api/profile', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.src) setProfileAvatar(data.src);
  } catch(e) { console.error('Profile upload failed', e); }
  this.value = '';
});

// ── ADMIN AUTH ──
function toggleAdmin() {
  if (isAdmin) { logout(); return; }
  document.getElementById('loginModal').classList.add('open');
  setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}
function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('open');
  document.getElementById('adminPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}
function doLogin() {
  const val = document.getElementById('adminPassword').value;
  if (val === ADMIN_PASS) {
    isAdmin = true;
    closeLoginModal();
    document.getElementById('upload').classList.add('admin-visible');
    document.getElementById('profileChangeBtn').classList.add('admin-visible');
    const btn = document.getElementById('adminBtn');
    btn.textContent = 'Logout';
    btn.classList.add('logged-in');
    renderFolderCounts();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}
function logout() {
  isAdmin = false;
  document.getElementById('upload').classList.remove('admin-visible');
  document.getElementById('profileChangeBtn').classList.remove('admin-visible');
  const btn = document.getElementById('adminBtn');
  btn.textContent = 'Admin Login';
  btn.classList.remove('logged-in');
  renderFolderCounts();
}

// ── FOLDER COUNTS + COVERS ──
const PLACEHOLDERS = { design: 'GD', photo: 'PH', video: 'VD' };
function renderFolderCounts() {
  ['design', 'photo', 'video'].forEach(cat => {
    const catItems = items.filter(i => i.category === cat);
    const n = catItems.length;
    document.getElementById('count-' + cat).textContent = n + ' item' + (n !== 1 ? 's' : '');
    const thumbEl = document.getElementById('thumb-' + cat);
    const first = catItems.find(i => i.type === 'image') || catItems[0];
    if (first && first.type === 'image') {
      thumbEl.outerHTML = `<img class="folder-card-thumb" id="thumb-${cat}" src="${first.src}" alt="${cat} cover">`;
    } else if (first && first.type === 'video') {
      thumbEl.outerHTML = `<video class="folder-card-thumb" id="thumb-${cat}" src="${first.src}" muted preload="metadata"></video>`;
    } else {
      thumbEl.outerHTML = `<div class="folder-card-placeholder" id="thumb-${cat}">${PLACEHOLDERS[cat]}</div>`;
    }
  });
}

// ── FOLDER VIEW ──
const FOLDER_LABELS = { design: 'Graphic Design', photo: 'Photography', video: 'Videos' };
let currentFolder = null;
function openFolder(cat) {
  currentFolder = cat;
  document.getElementById('folderViewTitle').textContent = FOLDER_LABELS[cat];
  renderFolderGrid();
  document.getElementById('folderView').classList.add('open');
  window.scrollTo(0, 0);
}
function closeFolder() {
  document.getElementById('folderView').classList.remove('open');
  currentFolder = null;
}
function renderFolderGrid() {
  const grid = document.getElementById('folderGrid');
  const filtered = items.filter(i => i.category === currentFolder);
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No items in this folder yet.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(item => {
    const isVideo = item.type === 'video';
    const delBtn = isAdmin
      ? `<button class="delete-btn" onclick="deleteItem('${item.id}',event)" title="Remove">✕</button>`
      : '';
    return `<div class="media-card" data-id="${item.id}">
      ${isVideo
        ? `<video src="${item.src}" muted preload="metadata"></video><span class="video-badge">Video</span>`
        : `<img src="${item.src}" alt="${item.name}" loading="lazy">`}
      <div class="overlay"><span class="overlay-title">${item.name}</span></div>
      ${delBtn}
    </div>`;
  }).join('');
  grid.querySelectorAll('.media-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card.dataset.id));
  });
}

// ── CATEGORY SELECT ──
function setCategory(cat, btn) {
  selectedCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const labels = { design: 'Graphic Design', photo: 'Photography', video: 'Video' };
  document.getElementById('catNote').textContent = 'Category set: ' + labels[cat];
}

// ── UPLOAD ──
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(fileList) {
  if (!selectedCategory) { alert('Please select a category first.'); return; }
  const files = Array.from(fileList);
  if (!files.length) return;
  const progress = document.getElementById('uploadProgress');
  const fill     = document.getElementById('progressFill');
  const status   = document.getElementById('uploadStatus');
  progress.style.display = 'block';
  let done = 0;
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', selectedCategory);
    formData.append('name', file.name.replace(/\.[^.]+$/, ''));
    try {
      const res  = await fetch(API + '/api/upload', { method: 'POST', body: formData });
      const item = await res.json();
      items.push(item);
    } catch(e) {
      console.error('Upload failed', e);
    }
    done++;
    fill.style.width = (done / files.length * 100) + '%';
    status.textContent = `Uploaded ${done} of ${files.length} file${files.length > 1 ? 's' : ''}`;
  }
  renderFolderCounts();
  if (currentFolder === selectedCategory) renderFolderGrid();
  setTimeout(() => { progress.style.display = 'none'; fill.style.width = '0%'; }, 2000);
  fileInput.value = '';
}

// ── DELETE ──
async function deleteItem(id, e) {
  e.stopPropagation();
  if (!confirm('Remove this item?')) return;
  try {
    await fetch(API + '/api/items/' + id, { method: 'DELETE' });
    items = items.filter(i => i.id !== id);
    renderFolderCounts();
    renderFolderGrid();
  } catch(e) {
    console.error('Delete failed', e);
  }
}

// ── LIGHTBOX ──
function openLightbox(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const content = document.getElementById('lightboxContent');
  content.innerHTML = item.type === 'video'
    ? `<video src="${item.src}" controls autoplay style="max-width:85vw;max-height:80vh;border-radius:4px;"></video>`
    : `<img src="${item.src}" alt="${item.name}" style="max-width:85vw;max-height:80vh;border-radius:4px;">`;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightboxContent').innerHTML = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeFolder(); }
});

// ── INIT ──
loadProfile();
loadItems();
