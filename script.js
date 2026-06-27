// ── HARDCODED PORTFOLIO ITEMS ──
const ITEMS = {
  design: [
    { id: '1',  name: 'Active On All',          src: 'images/ACTIVE-ON ALL.jpg',                              type: 'image' },
    { id: '2',  name: 'Bi-Weekly',               src: 'images/BI-WEEKLY.jpg',                                  type: 'image' },
    { id: '3',  name: 'BN Media',                src: 'images/BN MEDIA.jpg',                                   type: 'image' },
    { id: '4',  name: 'BNM',                     src: 'images/BNM.jpg',                                        type: 'image' },
    { id: '5',  name: 'Friday',                  src: 'images/Friday (4).png',                                 type: 'image' },
    { id: '6',  name: 'From Streets Screen',     src: 'images/FROM STREETS SCREEN (1080 x 1080 px).png',       type: 'image' },
    { id: '7',  name: 'Future Media',            src: 'images/FUTURE MEDIA.jpg',                               type: 'image' },
    { id: '8',  name: 'Inauguration Bor Rwanda', src: 'images/INNAUGURATION.BOR RWANDA.jpg',                   type: 'image' },
    { id: '9',  name: 'Marial',                  src: 'images/MARIAL.jpg',                                     type: 'image' },
    { id: '10', name: 'Untitled Presentation',   src: 'images/Untitled (1080 x 1080 px) (Presentation).png',  type: 'image' },
  ],
  photo: [],
  video: []
};

// ── NAV TOGGLE ──
function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('navToggle').classList.toggle('open');
  document.getElementById('navOverlay').classList.toggle('open');
}
function closeNav() {
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('navToggle').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('open');
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
  const grid     = document.getElementById('folderGrid');
  const filtered = ITEMS[currentFolder] || [];
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No items in this folder yet.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(item => `
    <div class="media-card" data-id="${item.id}">
      <img src="${item.src}" alt="${item.name}" loading="lazy">
      <div class="overlay"><span class="overlay-title">${item.name}</span></div>
    </div>
  `).join('');
  grid.querySelectorAll('.media-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card.dataset.id));
  });
}

// ── LIGHTBOX ──
function openLightbox(id) {
  const all  = [...ITEMS.design, ...ITEMS.photo, ...ITEMS.video];
  const item = all.find(i => i.id === id);
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
