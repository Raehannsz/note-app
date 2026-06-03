// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_LABELS = [
  { id: 'kerja',   name: 'Kerja',   color: '#1a6fa0' },
  { id: 'pribadi', name: 'Pribadi', color: '#2d6a4f' },
  { id: 'belanja', name: 'Belanja', color: '#c05621' },
  { id: 'ide',     name: 'Ide',     color: '#6b46c1' },
  { id: 'penting', name: 'Penting', color: '#c0392b' },
];

const SWATCH_COLORS = [
  '#2d6a4f','#1a6fa0','#6b46c1','#c05621','#c0392b',
  '#b7791f','#065f46','#1e3a5f','#4a1d96','#7f1d1d',
  '#374151','#0f766e','#b45309','#be185d','#1d4ed8',
];

const MAX_CHARS = 5000;

// ─── State ────────────────────────────────────────────────────────────────────
let notes   = [];
let labels  = [];
let currentEditIndex = null;
let currentView      = 'grid';
let searchQuery      = '';
let activeFilter     = 'all'; // 'all' | 'pinned' | labelId
let currentSort      = 'newest';
let isMobile         = false;
let panelType        = 'text';   // panel input type
let sheetType        = 'text';
let editType         = 'text';
let selectedLabelPanel = null;
let selectedLabelSheet = null;
let selectedLabelEdit  = null;
let newLabelColor      = SWATCH_COLORS[0];

// ─── Load ─────────────────────────────────────────────────────────────────────
function loadData() {
  try {
    const n = localStorage.getItem('notes');
    notes = n ? JSON.parse(n).map((note, i) => ({
      id: note.id || Date.now() + i,
      title: note.title || '',
      content: note.content || '',
      type: note.type || 'text',
      items: note.items || [],
      pinned: note.pinned || false,
      labelId: note.labelId || null,
      createdAt: note.createdAt || Date.now(),
      updatedAt: note.updatedAt || note.createdAt || Date.now(),
    })) : [];
  } catch { notes = []; }

  try {
    const l = localStorage.getItem('labels');
    labels = l ? JSON.parse(l) : [...DEFAULT_LABELS];
  } catch { labels = [...DEFAULT_LABELS]; }
}
loadData();

// ─── PWA: Service Worker ──────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('SW:', r.scope))
      .catch(e => console.warn('SW fail:', e));
  });
}

// ─── PWA: Install Banner ──────────────────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  if (!localStorage.getItem('installDismissed'))
    document.getElementById('installBanner').style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('installBanner').style.display = 'none';
  showToast('Aplikasi berhasil dipasang! 🎉', 'success');
});

// ─── Offline / Online ─────────────────────────────────────────────────────────
function updateOnlineStatus() {
  const badge = document.getElementById('offlineBadge');
  if (!badge) return;
  if (!navigator.onLine) {
    badge.style.display = 'flex';
    showToast('Kamu sedang offline. Data tersimpan lokal.', 'info');
  } else {
    badge.style.display = 'none';
  }
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} toast-show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('toast-show'), 2800);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(type) {
  document.getElementById(type + 'Overlay').classList.add('active');
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const el = document.querySelector(`#${type}Overlay input, #${type}Overlay textarea`);
    if (el) el.focus();
  }, 100);
}
function closeModal(type) {
  document.getElementById(type + 'Overlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

// ─── Sheet (mobile FAB) ───────────────────────────────────────────────────────
function openSheet() {
  document.getElementById('formSheet').classList.add('active');
  document.getElementById('sheetOverlay').classList.add('active');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('sheetTitle')?.focus(), 320);
}
function closeSheet() {
  document.getElementById('formSheet').classList.remove('active');
  document.getElementById('sheetOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

// ─── Mobile detection ─────────────────────────────────────────────────────────
function checkMobile() {
  isMobile = window.innerWidth <= 900;
  const fab = document.getElementById('fab');
  const panel = document.getElementById('inputPanel');
  if (fab) fab.style.display = isMobile ? 'flex' : 'none';
  if (panel) panel.style.display = isMobile ? 'none' : 'flex';
  document.getElementById('emptySubText').textContent = isMobile
    ? 'Ketuk tombol + di bawah untuk mulai menulis.'
    : 'Mulai tulis catatan pertamamu di sebelah kiri.';
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Click-outside modal
  ['editOverlay','viewOverlay','labelMgrOverlay','backupOverlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) closeModal(id.replace('Overlay',''));
    });
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['edit','view','labelMgr','backup'].forEach(closeModal);
      closeSheet();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const id = document.activeElement?.id;
      if (['noteTitle','noteContent'].includes(id)) addNote();
      if (['editTitle','editContent'].includes(id)) saveEditedNote();
      if (['sheetTitle','sheetContent'].includes(id)) addNoteFromSheet();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    }
  });

  // Theme
  applyTheme(localStorage.getItem('theme') || 'light');

  // Grid / sort
  const savedCols = localStorage.getItem('gridCols') || '3';
  document.getElementById('gridSelector').value = savedCols;
  currentSort = localStorage.getItem('sortMode') || 'newest';
  document.getElementById('sortSelector').value = currentSort;

  // View
  setView(localStorage.getItem('viewMode') || 'grid', false);

  // Install banner btns
  document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('installBanner').style.display = 'none';
    if (outcome === 'dismissed') localStorage.setItem('installDismissed','1');
  });
  document.getElementById('installDismiss')?.addEventListener('click', () => {
    document.getElementById('installBanner').style.display = 'none';
    localStorage.setItem('installDismissed','1');
  });

  // Swipe sheet
  setupSheetSwipe();

  // Mobile check
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Online status
  updateOnlineStatus();

  // Init label pickers & filter bar
  renderLabelPickers();
  renderLabelFilterBar();
  renderLabelManagerList();

  // New label color picker
  renderNewLabelColorPicker();

  renderNotes();
});

// ─── Swipe sheet ──────────────────────────────────────────────────────────────
function setupSheetSwipe() {
  const sheet = document.getElementById('formSheet');
  if (!sheet) return;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('.modal-handle,.sheet-header')) { startY = e.touches[0].clientY; dragging = true; }
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (!dragging) return; dragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    sheet.style.transform = '';
    if (dy > 100) closeSheet();
  });
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.className = theme + '-theme';
  const m = document.getElementById('metaThemeColor');
  if (m) m.content = theme === 'dark' ? '#1a1917' : '#2d6a4f';
}
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next); localStorage.setItem('theme', next);
}

// ─── Char Count ───────────────────────────────────────────────────────────────
function updateCharCount(textareaId, counterId) {
  const ta = document.getElementById(textareaId);
  const ct = document.getElementById(counterId);
  if (!ta || !ct) return;
  const len = ta.value.length;
  ct.textContent = `${len.toLocaleString('id')} / ${MAX_CHARS.toLocaleString('id')} karakter`;
  ct.classList.toggle('char-count-warn', len > MAX_CHARS * 0.9);
  ct.classList.toggle('char-count-over', len > MAX_CHARS);
}

// ─── Note Type Toggle ─────────────────────────────────────────────────────────
function setPanelType(t) {
  panelType = t;
  _setTypeUI('panel', t);
}
function setSheetType(t) {
  sheetType = t;
  _setTypeUI('sheet', t);
}
function setEditType(t) {
  editType = t;
  _setTypeUI('edit', t);
}
function _setTypeUI(prefix, t) {
  const isText = t === 'text';
  document.getElementById(`${prefix}Type${isText ? 'Text' : 'Checklist'}`)?.classList.add('active');
  document.getElementById(`${prefix}Type${isText ? 'Checklist' : 'Text'}`)?.classList.remove('active');

  if (prefix === 'panel') {
    document.getElementById('panelTextArea').style.display = isText ? '' : 'none';
    document.getElementById('panelChecklistArea').style.display = isText ? 'none' : '';
    if (!isText && document.getElementById('panelChecklistItems').children.length === 0) addChecklistItem('panel');
  } else if (prefix === 'sheet') {
    document.getElementById('sheetTextArea').style.display = isText ? '' : 'none';
    document.getElementById('sheetChecklistArea').style.display = isText ? 'none' : '';
    if (!isText && document.getElementById('sheetChecklistItems').children.length === 0) addChecklistItem('sheet');
  } else if (prefix === 'edit') {
    document.getElementById('editContent').closest('.textarea-wrap').style.display = isText ? '' : 'none';
    document.getElementById('editCharCount').style.display = isText ? '' : 'none';
    document.getElementById('editChecklistEditor').style.display = isText ? 'none' : '';
  }
}

// ─── Checklist Editor ─────────────────────────────────────────────────────────
function addChecklistItem(prefix, text = '', checked = false) {
  const containerId = prefix === 'panel' ? 'panelChecklistItems'
    : prefix === 'sheet' ? 'sheetChecklistItems' : 'editChecklistItems';
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'checklist-row';
  row.draggable = true;
  row.innerHTML = `
    <input type="checkbox" class="cl-check" ${checked ? 'checked' : ''}/>
    <input type="text" class="cl-input field" value="${escapeAttr(text)}" placeholder="Item..." autocapitalize="sentences"/>
    <button class="cl-del icon-btn btn-danger-icon" onclick="this.closest('.checklist-row').remove()" aria-label="Hapus item">
      <i class="fa-solid fa-xmark"></i>
    </button>`;

  // Enter key → new item
  row.querySelector('.cl-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(prefix); }
  });

  container.appendChild(row);
  row.querySelector('.cl-input').focus();
}

function getChecklistItems(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} .checklist-row`)).map(row => ({
    text: row.querySelector('.cl-input').value.trim(),
    checked: row.querySelector('.cl-check').checked,
  })).filter(i => i.text);
}

function renderChecklistEditor(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const prefix = containerId.includes('panel') ? 'panel'
      : containerId.includes('sheet') ? 'sheet' : 'edit';
    addChecklistItem(prefix, item.text, item.checked);
  });
}

// ─── Label System ─────────────────────────────────────────────────────────────
function saveLabels() {
  localStorage.setItem('labels', JSON.stringify(labels));
}

function getLabelById(id) {
  return labels.find(l => l.id === id) || null;
}

function renderLabelPickers() {
  ['panelLabelPicker','sheetLabelPicker','editLabelPicker'].forEach(id => {
    const prefix = id.replace('LabelPicker','');
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = `<button class="label-chip ${!selectedLabel(prefix) ? 'active' : ''}" onclick="selectLabel('${prefix}', null)">Semua</button>`
      + labels.map(l => `
        <button class="label-chip ${selectedLabel(prefix) === l.id ? 'active' : ''}"
          style="--lc:${l.color}"
          onclick="selectLabel('${prefix}','${l.id}')">
          <span class="label-dot" style="background:${l.color}"></span>${escapeHTML(l.name)}
        </button>`).join('');
  });
}

function selectedLabel(prefix) {
  if (prefix === 'panel' || prefix === 'panelLabel') return selectedLabelPanel;
  if (prefix === 'sheet' || prefix === 'sheetLabel') return selectedLabelSheet;
  if (prefix === 'edit'  || prefix === 'editLabel')  return selectedLabelEdit;
  return null;
}

function selectLabel(prefix, id) {
  if (prefix === 'panel') selectedLabelPanel = id;
  else if (prefix === 'sheet') selectedLabelSheet = id;
  else if (prefix === 'edit')  selectedLabelEdit  = id;
  renderLabelPickers();
}

function renderLabelFilterBar() {
  const bar = document.getElementById('labelFilterBar');
  if (!bar) return;
  bar.innerHTML =
    `<button class="filter-chip ${activeFilter==='all' ? 'active' : ''}" onclick="setFilter('all')">Semua</button>` +
    `<button class="filter-chip ${activeFilter==='pinned' ? 'active' : ''}" onclick="setFilter('pinned')"><i class="fa-solid fa-thumbtack"></i> Dipin</button>` +
    labels.map(l => `
      <button class="filter-chip ${activeFilter===l.id ? 'active' : ''}"
        style="--lc:${l.color}"
        onclick="setFilter('${l.id}')">
        <span class="label-dot" style="background:${l.color}"></span>${escapeHTML(l.name)}
      </button>`).join('');
}

function setFilter(f) {
  activeFilter = f;
  renderLabelFilterBar();
  renderNotes();
}

function renderLabelManagerList() {
  const list = document.getElementById('labelList');
  if (!list) return;
  if (labels.length === 0) { list.innerHTML = '<p class="label-empty">Belum ada label.</p>'; return; }
  list.innerHTML = labels.map(l => `
    <div class="label-mgr-row">
      <span class="label-dot lg" style="background:${l.color}"></span>
      <span class="label-mgr-name">${escapeHTML(l.name)}</span>
      <span class="label-mgr-count">${notes.filter(n=>n.labelId===l.id).length} catatan</span>
      <button class="icon-btn btn-danger-icon" onclick="deleteLabel('${l.id}')" aria-label="Hapus label">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`).join('');
}

function renderNewLabelColorPicker() {
  const cp = document.getElementById('newLabelColorPicker');
  if (!cp) return;
  cp.innerHTML = SWATCH_COLORS.map(c => `
    <button class="swatch ${c===newLabelColor?'active':''}" style="background:${c}"
      onclick="pickNewLabelColor('${c}')" aria-label="Pilih warna ${c}"></button>`).join('');
}

function pickNewLabelColor(c) {
  newLabelColor = c;
  renderNewLabelColorPicker();
}

function createLabel() {
  const name = document.getElementById('newLabelName').value.trim();
  if (!name) { showToast('Nama label tidak boleh kosong!', 'error'); return; }
  if (labels.find(l => l.name.toLowerCase() === name.toLowerCase())) {
    showToast('Label sudah ada!', 'error'); return;
  }
  const id = 'label_' + Date.now();
  labels.push({ id, name, color: newLabelColor });
  saveLabels();
  document.getElementById('newLabelName').value = '';
  renderLabelManagerList();
  renderLabelPickers();
  renderLabelFilterBar();
  showToast(`Label "${name}" dibuat!`, 'success');
}

function deleteLabel(id) {
  const lbl = getLabelById(id);
  labels = labels.filter(l => l.id !== id);
  notes = notes.map(n => n.labelId === id ? { ...n, labelId: null } : n);
  saveLabels();
  saveNotesRaw();
  if (activeFilter === id) setFilter('all');
  renderLabelManagerList();
  renderLabelPickers();
  renderLabelFilterBar();
  renderNotes();
  showToast(`Label "${lbl?.name}" dihapus.`, 'warning');
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHTML(text);
  // Bold: **text** atau __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* atau _text_
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Code: `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // Newlines
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ─── Relative time ────────────────────────────────────────────────────────────
function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 60)  return 'Baru saja';
  if (m < 60)  return `${m} menit lalu`;
  if (h < 24)  return `${h} jam lalu`;
  if (d < 7)   return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function changeSort() {
  currentSort = document.getElementById('sortSelector').value;
  localStorage.setItem('sortMode', currentSort);
  renderNotes();
}

function getSortedFiltered() {
  // Filter
  let list = notes.filter(n => {
    if (activeFilter === 'pinned') return n.pinned;
    if (activeFilter !== 'all') return n.labelId === activeFilter;
    return true;
  });

  // Search
  if (searchQuery) {
    list = list.filter(n =>
      n.title.toLowerCase().includes(searchQuery) ||
      n.content.toLowerCase().includes(searchQuery) ||
      (n.items || []).some(i => i.text.toLowerCase().includes(searchQuery))
    );
  }

  // Sort (pinned always first if filter=all)
  const pinned   = list.filter(n => n.pinned);
  const unpinned = list.filter(n => !n.pinned);

  function applySort(arr) {
    switch (currentSort) {
      case 'oldest':  return [...arr].sort((a,b) => a.createdAt - b.createdAt);
      case 'az':      return [...arr].sort((a,b) => a.title.localeCompare(b.title,'id'));
      case 'za':      return [...arr].sort((a,b) => b.title.localeCompare(a.title,'id'));
      case 'updated': return [...arr].sort((a,b) => (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt));
      default:        return [...arr].sort((a,b) => b.createdAt - a.createdAt); // newest
    }
  }

  return activeFilter === 'pinned'
    ? applySort(list)
    : [...applySort(pinned), ...applySort(unpinned)];
}

// ─── Render ───────────────────────────────────────────────────────────────────
const NOTE_COLORS = ['note-color-1','note-color-2','note-color-3','note-color-4','note-color-5'];

function renderNotes() {
  const container  = document.getElementById('notes');
  const emptyState = document.getElementById('emptyState');
  const noResults  = document.getElementById('noResults');
  const statsBar   = document.getElementById('statsBar');
  container.innerHTML = '';

  const displayList = getSortedFiltered();
  const pinnedCount = notes.filter(n => n.pinned).length;

  statsBar.textContent = notes.length > 0
    ? `${notes.length} catatan${pinnedCount > 0 ? ` · ${pinnedCount} dipin` : ''}${activeFilter !== 'all' ? ` · filter aktif` : ''}`
    : '';

  if (notes.length === 0) { emptyState.style.display = ''; noResults.style.display = 'none'; return; }
  emptyState.style.display = 'none';

  if (displayList.length === 0) { noResults.style.display = ''; return; }
  noResults.style.display = 'none';

  const gridCols = localStorage.getItem('gridCols') || '3';
  container.style.setProperty('--grid-cols', gridCols);
  container.classList.toggle('notes-list-view', currentView === 'list');

  displayList.forEach(note => {
    const originalIndex = notes.findIndex(n => n.id === note.id);
    const label = note.labelId ? getLabelById(note.labelId) : null;
    const card  = document.createElement('div');
    card.className = `note-card ${NOTE_COLORS[originalIndex % 5]} ${note.pinned ? 'is-pinned' : ''}`;
    card.dataset.id = note.id;

    const timeLabel = note.updatedAt && note.updatedAt !== note.createdAt
      ? `Diubah ${relativeTime(note.updatedAt)}`
      : relativeTime(note.createdAt);

    // Preview content
    let previewHTML = '';
    if (note.type === 'checklist') {
      const items = note.items || [];
      const done  = items.filter(i => i.checked).length;
      previewHTML = `<div class="cl-preview">
        ${items.slice(0,4).map(i => `<span class="cl-prev-item ${i.checked?'checked':''}">
          <i class="fa-${i.checked?'solid':'regular'} fa-circle-check"></i> ${escapeHTML(i.text)}
        </span>`).join('')}
        ${items.length > 4 ? `<span class="cl-prev-more">+${items.length-4} lainnya</span>` : ''}
        <span class="cl-progress">${done}/${items.length}</span>
      </div>`;
    } else {
      const highlighted = searchQuery ? highlightMatch(note.content, searchQuery) : escapeHTML(note.content);
      previewHTML = `<p class="note-preview">${highlighted}</p>`;
    }

    const titleHTML = searchQuery ? highlightMatch(note.title, searchQuery) : escapeHTML(note.title);

    card.innerHTML = `
      <div class="note-card-top">
        <div class="note-card-meta">
          ${note.pinned ? '<span class="pin-badge"><i class="fa-solid fa-thumbtack"></i></span>' : ''}
          ${label ? `<span class="note-label-badge" style="background:${label.color}20;color:${label.color};border-color:${label.color}40">
            <span class="label-dot" style="background:${label.color}"></span>${escapeHTML(label.name)}
          </span>` : ''}
        </div>
        <div class="note-card-actions-top">
          <button class="icon-btn pin-btn ${note.pinned?'pinned':''}" onclick="togglePin(${originalIndex})" aria-label="${note.pinned?'Lepas pin':'Pin'}">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
          <button class="icon-btn" onclick="editNote(${originalIndex})" aria-label="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-btn btn-danger-icon" onclick="deleteNote(${originalIndex})" aria-label="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="note-card-body" onclick="viewNote(${originalIndex})" role="button" tabindex="0" aria-label="Lihat: ${escapeHTML(note.title)}">
        <h3 class="note-title">${titleHTML}</h3>
        ${previewHTML}
      </div>
      <div class="note-card-footer">
        <span class="note-time">${timeLabel}</span>
        ${note.type === 'checklist' ? '<span class="note-type-badge"><i class="fa-solid fa-list-check"></i></span>' : ''}
      </div>`;

    card.querySelector('.note-card-body').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') viewNote(originalIndex);
    });

    container.appendChild(card);
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
function _buildNote(title, type, content, items, labelId) {
  return { id: Date.now(), title, type, content, items, pinned: false, labelId: labelId || null, createdAt: Date.now(), updatedAt: Date.now() };
}

function _addNote(title, type, content, items, labelId) {
  if (!title) { showToast('Judul tidak boleh kosong!', 'error'); return false; }
  if (type === 'text' && !content) { showToast('Isi catatan tidak boleh kosong!', 'error'); return false; }
  if (type === 'checklist' && items.length === 0) { showToast('Tambahkan minimal satu item!', 'error'); return false; }
  if (content.length > MAX_CHARS) { showToast(`Maksimal ${MAX_CHARS.toLocaleString()} karakter!`, 'error'); return false; }
  notes.unshift(_buildNote(title, type, content, items, labelId));
  saveNotes(); clearSearch(); return true;
}

function addNote() {
  const title   = document.getElementById('noteTitle').value.trim();
  const content = panelType === 'text' ? document.getElementById('noteContent').value.trim() : '';
  const items   = panelType === 'checklist' ? getChecklistItems('panelChecklistItems') : [];
  if (_addNote(title, panelType, content, items, selectedLabelPanel)) {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('panelChecklistItems').innerHTML = '';
    updateCharCount('noteContent','panelCharCount');
    selectedLabelPanel = null;
    setPanelType('text');
    renderLabelPickers();
    document.getElementById('noteTitle').focus();
    showToast('Catatan ditambahkan!', 'success');
  }
}

function addNoteFromSheet() {
  const title   = document.getElementById('sheetTitle').value.trim();
  const content = sheetType === 'text' ? document.getElementById('sheetContent').value.trim() : '';
  const items   = sheetType === 'checklist' ? getChecklistItems('sheetChecklistItems') : [];
  if (_addNote(title, sheetType, content, items, selectedLabelSheet)) {
    document.getElementById('sheetTitle').value = '';
    document.getElementById('sheetContent').value = '';
    document.getElementById('sheetChecklistItems').innerHTML = '';
    updateCharCount('sheetContent','sheetCharCount');
    selectedLabelSheet = null;
    setSheetType('text');
    renderLabelPickers();
    closeSheet();
    showToast('Catatan ditambahkan!', 'success');
  }
}

function viewNote(index) {
  const note  = notes[index];
  if (!note) return;
  const label = note.labelId ? getLabelById(note.labelId) : null;

  document.getElementById('viewTitle').textContent = note.title;

  // Meta: label + timestamp
  const timeLabel = note.updatedAt && note.updatedAt !== note.createdAt
    ? `Diubah ${relativeTime(note.updatedAt)}` : `Dibuat ${relativeTime(note.createdAt)}`;
  document.getElementById('viewMeta').innerHTML = `
    ${label ? `<span class="view-label-chip" style="background:${label.color}20;color:${label.color};border-color:${label.color}40">
      <span class="label-dot" style="background:${label.color}"></span>${escapeHTML(label.name)}
    </span>` : ''}
    <span class="view-time">${timeLabel}</span>`;

  // Content
  const contentEl = document.getElementById('viewContent');
  if (note.type === 'checklist') {
    contentEl.innerHTML = `<div class="checklist-view">${
      (note.items||[]).map((item, i) => `
        <label class="cl-view-item ${item.checked?'checked':''}">
          <input type="checkbox" ${item.checked?'checked':''} onchange="toggleChecklistItem(${index},${i},this.checked)"/>
          <span>${escapeHTML(item.text)}</span>
        </label>`).join('')
    }</div>`;
  } else {
    contentEl.innerHTML = `<div class="markdown-content">${renderMarkdown(note.content)}</div>`;
  }

  openModal('view');
}

function toggleChecklistItem(noteIndex, itemIndex, checked) {
  if (!notes[noteIndex] || !notes[noteIndex].items[itemIndex]) return;
  notes[noteIndex].items[itemIndex].checked = checked;
  notes[noteIndex].updatedAt = Date.now();
  saveNotes();
  // Update view UI tanpa tutup modal
  const labels = document.querySelectorAll('.cl-view-item');
  if (labels[itemIndex]) labels[itemIndex].classList.toggle('checked', checked);
}

function editNote(index) {
  const note = notes[index];
  if (!note) return;
  document.getElementById('editTitle').value = note.title;
  currentEditIndex = index;
  editType = note.type || 'text';
  selectedLabelEdit = note.labelId || null;

  // Set type UI
  setEditType(editType);
  renderLabelPickers();

  // Highlight active label in edit picker
  if (editType === 'text') {
    document.getElementById('editContent').value = note.content;
    updateCharCount('editContent','editCharCount');
  } else {
    renderChecklistEditor('editChecklistItems', note.items || []);
  }
  openModal('edit');
}

function saveEditedNote() {
  if (currentEditIndex === null) return;
  const newTitle = document.getElementById('editTitle').value.trim();
  if (!newTitle) { showToast('Judul tidak boleh kosong!', 'error'); document.getElementById('editTitle').focus(); return; }

  let newContent = '', newItems = [];
  if (editType === 'text') {
    newContent = document.getElementById('editContent').value.trim();
    if (!newContent) { showToast('Isi catatan tidak boleh kosong!', 'error'); return; }
    if (newContent.length > MAX_CHARS) { showToast(`Maksimal ${MAX_CHARS.toLocaleString()} karakter!`, 'error'); return; }
  } else {
    newItems = getChecklistItems('editChecklistItems');
    if (newItems.length === 0) { showToast('Tambahkan minimal satu item!', 'error'); return; }
  }

  const old = notes[currentEditIndex];
  notes[currentEditIndex] = { ...old, title: newTitle, type: editType, content: newContent, items: newItems, labelId: selectedLabelEdit || null, updatedAt: Date.now() };
  saveNotes();
  closeModal('edit');
  currentEditIndex = null;
  showToast('Catatan diubah.', 'info');
}

function deleteNote(index) {
  const note = notes[index];
  if (!note) return;
  const card = document.querySelector(`.note-card[data-id="${note.id}"]`);
  const doDelete = () => { notes.splice(index, 1); saveNotes(); showToast('Catatan dihapus.', 'warning'); };
  if (card) { card.classList.add('deleting'); setTimeout(doDelete, 250); } else doDelete();
}

function togglePin(index) {
  if (index < 0 || index >= notes.length) return;
  notes[index].pinned = !notes[index].pinned;
  saveNotes();
  showToast(notes[index].pinned ? 'Catatan dipin.' : 'Pin dilepas.', 'info');
}

// ─── Search ───────────────────────────────────────────────────────────────────
function searchNotes() {
  searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
  document.getElementById('searchClear').style.display = searchQuery ? '' : 'none';
  renderNotes();
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('searchClear').style.display = 'none';
  renderNotes();
}

// ─── View & Layout ────────────────────────────────────────────────────────────
function changeGridColumns() {
  localStorage.setItem('gridCols', document.getElementById('gridSelector').value);
  renderNotes();
}
function setView(mode, save = true) {
  currentView = mode;
  if (save) localStorage.setItem('viewMode', mode);
  document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('viewList').classList.toggle('active', mode === 'list');
  document.getElementById('gridSelector').style.visibility = mode === 'list' ? 'hidden' : 'visible';
  renderNotes();
}

// ─── Backup & Restore ─────────────────────────────────────────────────────────
function exportNotes() {
  const data = { version: 2, exportedAt: new Date().toISOString(), notes, labels };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `catatan-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup berhasil diunduh!', 'success');
}

function importNotes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let importedNotes  = [];
      let importedLabels = [];

      if (data.version === 2) {
        importedNotes  = data.notes  || [];
        importedLabels = data.labels || [];
      } else if (Array.isArray(data)) {
        // Legacy: array of notes
        importedNotes = data;
      } else {
        showToast('Format file tidak valid!', 'error'); return;
      }

      // Merge labels (skip duplikat by id)
      importedLabels.forEach(l => { if (!labels.find(x => x.id === l.id)) labels.push(l); });

      // Merge notes (skip duplikat by id)
      let added = 0;
      importedNotes.forEach(n => {
        if (!notes.find(x => x.id === n.id)) {
          notes.push({ id: n.id || Date.now() + Math.random(), title: n.title||'', content: n.content||'',
            type: n.type||'text', items: n.items||[], pinned: n.pinned||false,
            labelId: n.labelId||null, createdAt: n.createdAt||Date.now(), updatedAt: n.updatedAt||Date.now() });
          added++;
        }
      });

      saveLabels(); saveNotesRaw();
      renderLabelPickers(); renderLabelFilterBar(); renderLabelManagerList(); renderNotes();
      showToast(`${added} catatan berhasil diimpor!`, 'success');
    } catch { showToast('Gagal membaca file!', 'error'); }
    event.target.value = ''; // reset input
  };
  reader.readAsText(file);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function highlightMatch(text, query) {
  if (!query) return escapeHTML(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark>$1</mark>');
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escapeHTML(text) {
  if (typeof text !== 'string') return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}
function escapeAttr(text) {
  return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function saveNotesRaw() { localStorage.setItem('notes', JSON.stringify(notes)); }
function saveNotes() { saveNotesRaw(); renderNotes(); }