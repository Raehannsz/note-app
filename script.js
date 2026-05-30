// ─── State ───────────────────────────────────────────────────────────────────
let notes = [];
let currentEditIndex = null;
let currentView = 'grid'; // 'grid' | 'list'
let searchQuery = '';

// Muat catatan dari localStorage dengan migrasi ke format ID unik
function loadNotes() {
  const raw = localStorage.getItem('notes');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // Migrasi: tambahkan id unik jika belum ada
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

// ─── Toast / Alert ────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} toast-show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast-show');
  }, 2800);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(type) {
  const overlay = document.getElementById(type + 'Overlay');
  overlay.classList.add('active');
  document.body.classList.add('modal-open');
  // Focus first input
  setTimeout(() => {
    const first = overlay.querySelector('input, textarea, button.btn-ghost');
    if (first) first.focus();
  }, 80);
}

function closeModal(type) {
  const overlay = document.getElementById(type + 'Overlay');
  overlay.classList.remove('active');
  document.body.classList.remove('modal-open');
}

// Tutup modal saat klik overlay
document.addEventListener('DOMContentLoaded', () => {
  ['editOverlay', 'viewOverlay'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) closeModal(id.replace('Overlay', ''));
    });
  });

  // Escape key tutup modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('edit');
      closeModal('view');
    }
    // Ctrl/Cmd + Enter untuk simpan catatan baru
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const active = document.activeElement;
      if (active.id === 'noteTitle' || active.id === 'noteContent') {
        addNote();
      }
    }
  });

  // Inisialisasi preferensi
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.className = savedTheme + '-theme';

  const savedCols = localStorage.getItem('gridCols') || '3';
  const sel = document.getElementById('gridSelector');
  if (sel) sel.value = savedCols;

  const savedView = localStorage.getItem('viewMode') || 'grid';
  setView(savedView, false); // false = jangan save ulang

  renderNotes();
});

// ─── Render ───────────────────────────────────────────────────────────────────
function getNoteColorClass(index) {
  const classes = ['note-color-1', 'note-color-2', 'note-color-3', 'note-color-4', 'note-color-5'];
  return classes[index % classes.length];
}

function renderNotes(filteredList = null) {
  const container = document.getElementById('notes');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const statsBar = document.getElementById('statsBar');
  container.innerHTML = '';

  // Tentukan daftar yang ditampilkan
  const isSearch = filteredList !== null;
  const displayList = filteredList ?? getSortedNotes();

  // Update stats
  const pinnedCount = notes.filter(n => n.pinned).length;
  statsBar.textContent = `${notes.length} catatan${pinnedCount > 0 ? ` · ${pinnedCount} dipin` : ''}`;

  // Sembunyikan/tampilkan empty states
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

  // Grid columns
  const gridCols = localStorage.getItem('gridCols') || '3';
  container.style.setProperty('--grid-cols', gridCols);
  if (currentView === 'list') {
    container.classList.add('notes-list-view');
  } else {
    container.classList.remove('notes-list-view');
  }

  displayList.forEach((note, displayIndex) => {
    // Cari original index di notes[]
    const originalIndex = notes.findIndex(n => n.id === note.id);
    const card = document.createElement('div');
    card.className = `note-card ${getNoteColorClass(originalIndex)} ${note.pinned ? 'is-pinned' : ''}`;
    card.dataset.id = note.id;

    // Format tanggal singkat
    const date = note.createdAt ? new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';

    // Highlight untuk search
    const titleHTML = isSearch && searchQuery
      ? highlightMatch(note.title, searchQuery)
      : escapeHTML(note.title);
    const contentHTML = isSearch && searchQuery
      ? highlightMatch(note.content, searchQuery)
      : escapeHTML(note.content);

    card.innerHTML = `
      <div class="note-card-top">
        <div class="note-card-meta">
          ${note.pinned ? '<span class="pin-badge" title="Dipin"><i class="fa-solid fa-thumbtack"></i></span>' : ''}
          <span class="note-date">${date}</span>
        </div>
        <div class="note-card-actions-top">
          <button class="icon-btn pin-btn ${note.pinned ? 'pinned' : ''}" onclick="togglePin(${originalIndex})" title="${note.pinned ? 'Lepas pin' : 'Pin catatan'}" aria-label="${note.pinned ? 'Lepas pin' : 'Pin catatan'}">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
          <button class="icon-btn" onclick="editNote(${originalIndex})" title="Edit" aria-label="Edit catatan">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="icon-btn btn-danger-icon" onclick="deleteNote(${originalIndex})" title="Hapus" aria-label="Hapus catatan">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="note-card-body" onclick="viewNote(${originalIndex})" role="button" tabindex="0" aria-label="Lihat catatan: ${escapeHTML(note.title)}">
        <h3 class="note-title">${titleHTML}</h3>
        <p class="note-preview">${contentHTML}</p>
      </div>
    `;

    // Keyboard accessibility untuk klik card
    card.querySelector('.note-card-body').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') viewNote(originalIndex);
    });

    container.appendChild(card);
  });
}

function getSortedNotes() {
  const pinned = notes.filter(n => n.pinned);
  const unpinned = notes.filter(n => !n.pinned);
  return [...pinned, ...unpinned];
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
function addNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();

  if (!title && !content) {
    showToast('Judul dan isi tidak boleh kosong!', 'error');
    document.getElementById('noteTitle').focus();
    return;
  }
  if (!title) {
    showToast('Judul tidak boleh kosong!', 'error');
    document.getElementById('noteTitle').focus();
    return;
  }
  if (!content) {
    showToast('Isi catatan tidak boleh kosong!', 'error');
    document.getElementById('noteContent').focus();
    return;
  }

  const newNote = {
    id: Date.now(),
    title,
    content,
    pinned: false,
    createdAt: Date.now(),
  };

  notes.unshift(newNote); // tambah di depan agar muncul duluan
  saveNotes();
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  document.getElementById('noteTitle').focus();

  // Clear search jika ada
  clearSearch();
  showToast('Catatan berhasil ditambahkan!', 'success');
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

  if (!newTitle) {
    showToast('Judul tidak boleh kosong!', 'error');
    document.getElementById('editTitle').focus();
    return;
  }
  if (!newContent) {
    showToast('Isi catatan tidak boleh kosong!', 'error');
    document.getElementById('editContent').focus();
    return;
  }

  const oldNote = notes[currentEditIndex];
  if (oldNote.title === newTitle && oldNote.content === newContent) {
    showToast('Tidak ada perubahan.', 'info');
    closeModal('edit');
    return;
  }

  // BUG FIX: Pertahankan pinned & id & createdAt saat edit
  notes[currentEditIndex] = {
    ...oldNote,
    title: newTitle,
    content: newContent,
  };

  saveNotes();
  closeModal('edit');
  currentEditIndex = null;
  showToast('Catatan berhasil diubah.', 'info');
}

function deleteNote(index) {
  const note = notes[index];
  if (!note) return;

  // Konfirmasi inline (tidak pakai confirm() yang memblokir)
  const card = document.querySelector(`.note-card[data-id="${note.id}"]`);
  if (card) {
    card.classList.add('deleting');
    setTimeout(() => {
      notes.splice(index, 1);
      saveNotes();
      showToast('Catatan dihapus.', 'warning');
    }, 250);
  } else {
    notes.splice(index, 1);
    saveNotes();
    showToast('Catatan dihapus.', 'warning');
  }
}

// BUG FIX: togglePin menggunakan id unik, bukan judul/konten
function togglePin(index) {
  if (index < 0 || index >= notes.length) return;
  notes[index].pinned = !notes[index].pinned;
  saveNotes();
  showToast(notes[index].pinned ? 'Catatan dipin.' : 'Pin dilepas.', 'info');
}

// ─── Pencarian ────────────────────────────────────────────────────────────────
// BUG FIX: Dipanggil dengan searchNotes() bukan searchNotes
function searchNotes() {
  searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
  const clearBtn = document.getElementById('searchClear');
  clearBtn.style.display = searchQuery ? '' : 'none';

  if (!searchQuery) {
    renderNotes();
    return;
  }

  const results = getSortedNotes().filter(note =>
    note.title.toLowerCase().includes(searchQuery) ||
    note.content.toLowerCase().includes(searchQuery)
  );

  renderNotes(results);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('searchClear').style.display = 'none';
  renderNotes();
}

// ─── View & Layout ────────────────────────────────────────────────────────────
function changeGridColumns() {
  const selected = document.getElementById('gridSelector').value;
  localStorage.setItem('gridCols', selected);
  renderNotes();
}

function setView(mode, save = true) {
  currentView = mode;
  if (save) localStorage.setItem('viewMode', mode);

  document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('viewList').classList.toggle('active', mode === 'list');

  const sel = document.getElementById('gridSelector');
  sel.style.visibility = mode === 'list' ? 'hidden' : 'visible';

  renderNotes();
}

// ─── Tema ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  document.body.className = isDark ? 'light-theme' : 'dark-theme';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// ─── Highlight ────────────────────────────────────────────────────────────────
function highlightMatch(text, query) {
  if (!query) return escapeHTML(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  // Re-render dengan query aktif (jika ada pencarian)
  if (searchQuery) {
    searchNotes();
  } else {
    renderNotes();
  }
}