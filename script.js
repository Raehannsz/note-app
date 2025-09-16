let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentEditIndex = null;

// fungsi untuk menampilkan alert
function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');

  // Sembunyikan alert setelah 2,5 detik
  setTimeout(() => {
    alertBox.classList.add('d-none');
  }, 2500);
}
// END fungsi untuk menampilkan alert

// fungsi untuk menampilkan catatan / merender notes
function renderNotes() {
  const container = document.getElementById('notes');
  container.innerHTML = '';

  const gridCols = localStorage.getItem('gridCols') || '3';
  const colClass = `col-${12 / gridCols} col-sm-${12 / gridCols} col-md-${12 / gridCols}`;

  // Pisahkan catatan yang dipin dan tidak
  const pinnedNotes = notes.filter(note => note.pinned);
  const unpinnedNotes = notes.filter(note => !note.pinned);

  // Gabungkan, dengan yang dipin di atas
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes];

  sortedNotes.forEach((note, index) => {
    const col = document.createElement('div');
    col.className = `${colClass} d-flex`;

    col.innerHTML = `
      <div class="note-card w-100 position-relative">
        <button class="pin-btn btn btn-sm text-white btn-secondary position-absolute top-0 end-0 m-2" onclick="togglePin(${index})">
          <i class="${note.pinned ? 'fa-solid' : 'fa-regular'} fa-thumbtack"></i>
        </button>
        <h3>${escapeHTML(note.title)}</h3>
        <pre>${escapeHTML(note.content)}</pre>

        <!-- Tombol untuk desktop -->
        <div class="actions mt-2 d-none d-md-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-info text-white" onclick="viewNote(${index})">Lihat</button>
          <button class="btn btn-sm btn-warning" onclick="editNote(${index})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteNote(${index})">Hapus</button>
        </div>

        <!-- Tombol untuk mobile -->
        <div class="dropdown d-md-none mt-2">
          <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item bg-primary text-white fw-bold mb-2" onclick="viewNote(${index})">Lihat</button></li>
            <li><button class="dropdown-item bg-warning text-white fw-bold mb-2" onclick="editNote(${index})">Edit</button></li>
            <li><button class="dropdown-item bg-danger text-white fw-bold" onclick="deleteNote(${index})">Hapus</button></li>
          </ul>
        </div>
      </div>
    `;

    container.appendChild(col);
  });
}
// END fungsi untuk menampilkan catatan / merender notes

// Fungsi untuk melihat catatan
function viewNote(index) {
  const note = notes[index];
  document.getElementById('viewTitle').textContent = note.title;
  document.getElementById('viewContent').textContent = note.content;
  

  const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
  viewModal.show();
}
// END Fungsi untuk melihat catatan

// Fungsi untuk mengubah jumlah kolom grid
function changeGridColumns() {
  const selectedCols = document.getElementById('gridSelector').value;
  localStorage.setItem('gridCols', selectedCols);
  renderNotes();
}
// END Fungsi untuk mengubah jumlah kolom grid

// Fungsi pencarian catatan
function searchNotes() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const container = document.getElementById('notes');
  container.innerHTML = '';

  notes.forEach((note, index) => {
    const titleMatch = note.title.toLowerCase().includes(query);
    const contentMatch = note.content.toLowerCase().includes(query);

    if (titleMatch || contentMatch) {
      const div = document.createElement('div');
      div.className = 'note';
      div.innerHTML = `
        <h3>${highlightMatch(note.title, query)}</h3>
        <pre>${highlightMatch(note.content, query)}</pre>
        <div class="actions">
          <button class="rounded bg-warning" onclick="editNote(${index})">Edit</button>
        <button class="rounded bg-danger" onclick="deleteNote(${index})">Hapus</button>
        </div>
      `;
      container.appendChild(div);
    }
  });
}
// END Fungsi pencarian catatan

// Fungsi highlights/Marks
function highlightMatch(text, query) {
  if (!query) return escapeHTML(text); // tidak ada input, kembalikan teks asli

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark>$1</mark>');
}
// END Fungsi highlights/Marks

// Fungsi hightlights/Marks
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape karakter regex
}
// END Fungsi highlights/Marks

// Fungsi untuk menambahkan catatan baru
function addNote() {
  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;

  if (title && content) {
    notes.push({ title, content, pinned: false }); // <--- tambahkan pinned
    updateNotes();
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    showAlert('Catatan berhasil ditambahkan!', 'success');
  } else {
    showAlert('Judul dan isi tidak boleh kosong!', 'danger');
  }
}
//END Fungsi untuk menambahkan catatan baru

// Fungsi untuk mengedit catatan
function editNote(index) {
  const note = notes[index];
  document.getElementById('editTitle').value = note.title;
  document.getElementById('editContent').value = note.content;
  currentEditIndex = index;

  const editModal = new bootstrap.Modal(document.getElementById('editModal'));
  editModal.show();
}
// END Fungsi untuk mengedit catatan

// Fungsi untuk menghapus catatan
function deleteNote(index) {
  if (confirm('Hapus catatan ini?')) {
    notes.splice(index, 1);
    updateNotes();
    showAlert('Catatan berhasil dihapus.', 'warning');
  }
}
// END Fungsi untuk menghapus catatan

// Fungsi untuk memperbarui localStorage dan merender ulang catatan
function updateNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}
// END Fungsi untuk memperbarui localStorage dan merender ulang catatan

// Fungsi untuk menyimpan catatan yang diedit
function saveEditedNote() {
  const newTitle = document.getElementById('editTitle').value.trim();
  const newContent = document.getElementById('editContent').value.trim();

  if (currentEditIndex !== null) {
    const oldNote = notes[currentEditIndex];

    const isTitleChanged = oldNote.title !== newTitle;
    const isContentChanged = oldNote.content !== newContent;

    if (!isTitleChanged && !isContentChanged) {
      showAlert('Tidak ada perubahan yang dilakukan.', 'warning');
    } else {
      notes[currentEditIndex] = {
        title: newTitle,
        content: newContent
      };
      renderNotes();
      showAlert('Catatan berhasil diubah.', 'info');
    }

    document.getElementById('noteTitle').focus();

    // Tutup modal setelah edit
    const modalElement = document.getElementById('editModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();

    // Reset index
    currentEditIndex = null;
  }
}
// END Fungsi untuk menyimpan catatan yang diedit

// Fungsi untuk mengamankan input HTML
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// END Fungsi untuk mengamankan input HTML

// Fungsi Tema gelap/terang
function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  }
}
// END Fungsi Tema gelap/terang

// Fungsi untuk mempin atau melepaskan pin catatan
function togglePin(index) {
  // Dapatkan id unik dari catatan yang ingin dipin berdasarkan index gabungan
  const pinnedNotes = notes.filter(note => note.pinned);
  const unpinnedNotes = notes.filter(note => !note.pinned);
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes];
  const actualNote = sortedNotes[index];

  // Cari index sebenarnya di array notes
  const realIndex = notes.findIndex(n => n.title === actualNote.title && n.content === actualNote.content && n.pinned === actualNote.pinned);

  if (realIndex !== -1) {
    notes[realIndex].pinned = !notes[realIndex].pinned;
    updateNotes();
  }
}
// END Fungsi untuk mempin atau melepaskan pin catatan

// Inisialisasi tema berdasarkan preferensi yang disimpan
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(savedTheme + '-theme');

// Inisialisasi pilihan grid berdasarkan preferensi yang disimpan
const savedCols = localStorage.getItem('gridCols') || '3';
document.getElementById('gridSelector').value = savedCols;

// Render catatan saat halaman dimuat
renderNotes();