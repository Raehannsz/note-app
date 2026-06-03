// ─── State ───────────────────────────────────────────────────────────────────
let notes = [];
let currentEditIndex = null;
let currentView = 'grid';
let searchQuery = '';
let isMobile = false;

// ─── Load Notes ───────────────────────────────────────────────────────────────
function loadNotes() {
  const raw = localStorage.getItem('notes');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map((note, i) => ({
      id: note.id || Date.now() + i,
      title: note.title || '',
      content: note.content || '',
      pinned: note.pinned || false,
      createdAt: note.createdAt || Date.now(),
    }));
  } catch {
    return [];
  }
}

notes = loadNotes();

// ─── PWA: Service Worker ──────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW failed:', err));
  });
}

// ─── PWA: Install Banner ──────────────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Tampilkan banner hanya jika belum pernah ditolak
  if (!localStorage.getItem('installDismissed')) {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
  }
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  showToast('Aplikasi berhasil dipasang! 🎉', 'success');
});

function setupInstallBanner() {
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('installDismiss');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('installBanner').style.display = 'none';
      if (outcome === 'dismissed') localStorage.setItem('installDismissed', '1');
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      document.getElementById('installBanner').style.display = 'none';
      localStorage.setItem('installDismissed', '1');
    });
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} toast-show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast-show'), 2800);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(type) {
  const overlay = document.getElementById(type + 'Overlay');
  overlay.classList.add('active');
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const first = overlay.querySelector('input, textarea, button.btn-ghost');
    if (first) first.focus();
  }, 80);
}

function closeModal(type) {
  document.getElementById(type + 'Overlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

// ─── Mobile Sheet (FAB → slide-up form) ──────────────────────────────────────
function openSheet() {
  const sheet = document.getElementById('formSheet');
  const overlay = document.getElementById('sheetOverlay');
  sheet.classList.add('active');
  overlay.classList.add('active');
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const titleInput = document.getElementById('sheetTitle');
    if (titleInput) titleInput.focus();
  }, 300);
}

function closeSheet() {
  document.getElementById('formSheet').classList.remove('active');
  document.getElementById('sheetOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

function addNoteFromSheet() {
  const title = document.getElementById('sheetTitle').value.trim();
  const content = document.getElementById('sheetContent').value.trim();
  if (_addNote(title, content)) {
    document.getElementById('sheetTitle').value = '';
    document.getElementById('sheetContent').value = '';
    closeSheet();
  }
}

// ─── Detect mobile ────────────────────────────────────────────────────────────
function checkMobile() {
  isMobile = window.innerWidth <= 900;
  const fab = document.getElementById('fab');
  const inputPanel = document.getElementById('inputPanel');
  const emptySubText = document.getElementById('emptySubText');

  if (fab) fab.style.display = isMobile ? 'flex' : 'none';
  if (inputPanel) inputPanel.style.display = isMobile ? 'none' : 'flex';
  if (emptySubText) {
    emptySubText.textContent = isMobile
      ? 'Ketuk tombol + di bawah untuk mulai menulis.'
      : 'Mulai tulis catatan pertamamu di sebelah kiri.';
  }

  // Di mobile default 2 kolom, desktop 3
  if (isMobile && !localStorage.getItem('gridColsSet')) {
    const sel = document.getElementById('gridSelector');
    if (sel && !localStorage.getItem('gridCols')) {
      sel.value = '2';
      localStorage.setItem('gridCols', '2');
    }
  }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Modal overlay click-outside
  ['editOverlay', 'viewOverlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) closeModal(id.replace('Overlay', ''));
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('edit');
      closeModal('view');
      closeSheet();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const active = document.activeElement;
      if (['noteTitle', 'noteContent'].includes(active?.id)) addNote();
      if (['editTitle', 'editContent'].includes(active?.id)) saveEditedNote();
      if (['sheetTitle', 'sheetContent'].includes(active?.id)) addNoteFromSheet();
    }
  });

  // Tema
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Grid
  const savedCols = localStorage.getItem('gridCols') || '3';
  const sel = document.getElementById('gridSelector');
  if (sel) sel.value = savedCols;

  // View mode
  const savedView = localStorage.getItem('viewMode') || 'grid';
  setView(savedView, false);

  // Mobile detection
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Swipe-down to close sheet
  setupSheetSwipe();

  // PWA install banner
  setupInstallBanner();

  // Handle #new shortcut dari PWA shortcut
  if (window.location.hash === '#new') {
    setTimeout(() => {
      if (isMobile) openSheet();
      else document.getElementById('noteTitle')?.focus();
    }, 200);
  }

  renderNotes();
});

// ─── Swipe gesture untuk sheet ───────────────────────────────────────────────
function setupSheetSwipe() {
  const sheet = document.getElementById('formSheet');
  if (!sheet) return;
  let startY = 0;
  let isDragging = false;

  sheet.addEventListener('touchstart', (e) => {
    // Hanya drag dari handle
    if (e.target.closest('.modal-handle') || e.target.closest('.sheet-header')) {
      startY = e.touches[0].clientY;
      isDragging = true;
    }
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      sheet.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: true });

  sheet.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    sheet.style.transform = '';
    if (dy > 100) closeSheet();
  });
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.className = theme + '-theme';
  const meta = document.getElementById('metaThemeColor');
  if (meta) meta.content = theme === 'dark' ? '#1a1917' : '#2d6a4f';
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function getNoteColorClass(index) {
  return ['note-color-1','note-color-2','note-color-3','note-color-4','note-color-5'][index % 5];
}

function renderNotes(filteredList = null) {
  const container = document.getElementById('notes');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const statsBar = document.getElementById('statsBar');
  container.innerHTML = '';

  const isSearch = filteredList !== null;
  const displayList = filteredList ?? getSortedNotes();
  const pinnedCount = notes.filter(n => n.pinned).length;

  statsBar.textContent = notes.length > 0
    ? `${notes.length} catatan${pinnedCount > 0 ? ` · ${pinnedCount} dipin` : ''}`
    : '';

  if (notes.length === 0) {
    emptyState.style.display = '';
    noResults.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';

  if (isSearch && displayList.length === 0) {
    noResults.style.display = '';
    return;
  }
  noResults.style.display = 'none';

  const gridCols = localStorage.getItem('gridCols') || '3';
  container.style.setProperty('--grid-cols', gridCols);
  container.classList.toggle('notes-list-view', currentView === 'list');

  displayList.forEach((note) => {
    const originalIndex = notes.findIndex(n => n.id === note.id);
    const card = document.createElement('div');
    card.className = `note-card ${getNoteColorClass(originalIndex)} ${note.pinned ? 'is-pinned' : ''}`;
    card.dataset.id = note.id;

    const date = note.createdAt
      ? new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    const titleHTML = isSearch && searchQuery ? highlightMatch(note.title, searchQuery) : escapeHTML(note.title);
    const contentHTML = isSearch && searchQuery ? highlightMatch(note.content, searchQuery) : escapeHTML(note.content);

    card.innerHTML = `
      <div class="note-card-top">
        <div class="note-card-meta">
          ${note.pinned ? '<span class="pin-badge"><i class="fa-solid fa-thumbtack"></i></span>' : ''}
          <span class="note-date">${date}</span>
        </div>
        <div class="note-card-actions-top">
          <button class="icon-btn pin-btn ${note.pinned ? 'pinned' : ''}"
            onclick="togglePin(${originalIndex})"
            aria-label="${note.pinned ? 'Lepas pin' : 'Pin'}">
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
        <p class="note-preview">${contentHTML}</p>
      </div>`;

    card.querySelector('.note-card-body').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') viewNote(originalIndex);
    });

    container.appendChild(card);
  });
}

function getSortedNotes() {
  return [...notes.filter(n => n.pinned), ...notes.filter(n => !n.pinned)];
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
function _addNote(title, content) {
  if (!title && !content) { showToast('Judul dan isi tidak boleh kosong!', 'error'); return false; }
  if (!title) { showToast('Judul tidak boleh kosong!', 'error'); return false; }
  if (!content) { showToast('Isi catatan tidak boleh kosong!', 'error'); return false; }

  notes.unshift({ id: Date.now(), title, content, pinned: false, createdAt: Date.now() });
  saveNotes();
  clearSearch();
  showToast('Catatan ditambahkan!', 'success');
  return true;
}

function addNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (_addNote(title, content)) {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTitle').focus();
  }
}

function viewNote(index) {
  const note = notes[index];
  if (!note) return;
  document.getElementById('viewTitle').textContent = note.title;
  document.getElementById('viewContent').textContent = note.content;
  openModal('view');
}

function editNote(index) {
  const note = notes[index];
  if (!note) return;
  document.getElementById('editTitle').value = note.title;
  document.getElementById('editContent').value = note.content;
  currentEditIndex = index;
  openModal('edit');
}

function saveEditedNote() {
  if (currentEditIndex === null) return;
  const newTitle = document.getElementById('editTitle').value.trim();
  const newContent = document.getElementById('editContent').value.trim();
  if (!newTitle) { showToast('Judul tidak boleh kosong!', 'error'); document.getElementById('editTitle').focus(); return; }
  if (!newContent) { showToast('Isi tidak boleh kosong!', 'error'); document.getElementById('editContent').focus(); return; }

  const old = notes[currentEditIndex];
  if (old.title === newTitle && old.content === newContent) {
    showToast('Tidak ada perubahan.', 'info');
    closeModal('edit');
    return;
  }
  notes[currentEditIndex] = { ...old, title: newTitle, content: newContent };
  saveNotes();
  closeModal('edit');
  currentEditIndex = null;
  showToast('Catatan diubah.', 'info');
}

function deleteNote(index) {
  const note = notes[index];
  if (!note) return;
  const card = document.querySelector(`.note-card[data-id="${note.id}"]`);
  if (card) {
    card.classList.add('deleting');
    setTimeout(() => { notes.splice(index, 1); saveNotes(); showToast('Catatan dihapus.', 'warning'); }, 250);
  } else {
    notes.splice(index, 1); saveNotes(); showToast('Catatan dihapus.', 'warning');
  }
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
  if (!searchQuery) { renderNotes(); return; }
  const results = getSortedNotes().filter(n =>
    n.title.toLowerCase().includes(searchQuery) || n.content.toLowerCase().includes(searchQuery)
  );
  renderNotes(results);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('searchClear').style.display = 'none';
  renderNotes();
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function changeGridColumns() {
  const v = document.getElementById('gridSelector').value;
  localStorage.setItem('gridCols', v);
  localStorage.setItem('gridColsSet', '1');
  renderNotes();
}

function setView(mode, save = true) {
  currentView = mode;
  if (save) localStorage.setItem('viewMode', mode);
  document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('viewList').classList.toggle('active', mode === 'list');
  const sel = document.getElementById('gridSelector');
  if (sel) sel.style.visibility = mode === 'list' ? 'hidden' : 'visible';
  renderNotes();
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function highlightMatch(text, query) {
  if (!query) return escapeHTML(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark>$1</mark>');
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escapeHTML(text) {
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  searchQuery ? searchNotes() : renderNotes();
}