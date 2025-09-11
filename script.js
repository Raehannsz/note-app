let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentEditIndex = null;

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

function renderNotes() {
  const container = document.getElementById('notes');
  container.innerHTML = '';

  const gridCols = localStorage.getItem('gridCols') || '3';
  const colClass = `col-${12 / gridCols} col-sm-${12 / gridCols} col-md-${12 / gridCols}` // Bootstrap Grid System (12 cols total)

  notes.forEach((note, index) => {
    const col = document.createElement('div');
    col.className = `${colClass} d-flex`;

    col.innerHTML = `
  <div class="note-card w-100 position-relative">
    <h3>${escapeHTML(note.title)}</h3>
    <pre>${escapeHTML(note.content)}</pre>

    <!-- Tombol untuk desktop -->
    <div class="actions mt-2 d-none d-md-flex gap-2 flex-wrap">
      <button class="btn btn-sm btn-info text-white" onclick="viewNote(${index})">Lihat</button>
      <button class="btn btn-sm btn-warning" onclick="editNote(${index})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteNote(${index})">Hapus</button>
    </div>


    <!-- Tombol untuk mobile (dropdown) -->
    <div class="dropdown d-md-none mt-2">
      <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa fa-ellipsis-v"></i>
      </button>
      <ul class="dropdown-menu">
        <li><button class="dropdown-item" onclick="viewNote(${index})">Lihat</button></li>
        <li><button class="dropdown-item" onclick="editNote(${index})">Edit</button></li>
        <li><button class="dropdown-item text-danger" onclick="deleteNote(${index})">Hapus</button></li>
      </ul>
    </div>
  </div>
`;
    container.appendChild(col);
  });
}

function viewNote(index) {
  const note = notes[index];
  document.getElementById('viewTitle').textContent = note.title;
  document.getElementById('viewContent').textContent = note.content;

  const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
  viewModal.show();
}


function changeGridColumns() {
  const selectedCols = document.getElementById('gridSelector').value;
  localStorage.setItem('gridCols', selectedCols);
  renderNotes();
}

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

// Fungsi highlights/Marks
function highlightMatch(text, query) {
  if (!query) return escapeHTML(text); // tidak ada input, kembalikan teks asli

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape karakter regex
}
// END Fungsi highlights/Marks

function addNote() {
  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;
  if (title && content) {
    notes.push({ title, content });
    updateNotes();
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    showAlert('Catatan berhasil ditambahkan!', 'success');
  } else {
    showAlert('Judul dan isi tidak boleh kosong!', 'danger');
  }
}

function editNote(index) {
  const note = notes[index];
  document.getElementById('editTitle').value = note.title;
  document.getElementById('editContent').value = note.content;
  currentEditIndex = index;

  const editModal = new bootstrap.Modal(document.getElementById('editModal'));
  editModal.show();
}

function deleteNote(index) {
  if (confirm('Hapus catatan ini?')) {
    notes.splice(index, 1);
    updateNotes();
    showAlert('Catatan berhasil dihapus.', 'warning');
  }
}

function updateNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

function saveEditedNote() {
  const newTitle = document.getElementById('editTitle').value;
  const newContent = document.getElementById('editContent').value;

  if (currentEditIndex !== null) {
    notes[currentEditIndex] = {
      title: newTitle,
      content: newContent
    };
    renderNotes();
    
    // Tutup modal setelah edit
    const modalElement = document.getElementById('editModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();

    // Reset index
    currentEditIndex = null;
  }
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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

const savedTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(savedTheme + '-theme');

const savedCols = localStorage.getItem('gridCols') || '3';
document.getElementById('gridSelector').value = savedCols;

renderNotes();