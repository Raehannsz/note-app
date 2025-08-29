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
  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note';
    div.innerHTML = `
      <h3>${escapeHTML(note.title)}</h3>
      <pre>${escapeHTML(note.content)}</pre>
      <div class="actions">
        <button class="rounded bg-warning" onclick="editNote(${index})">Edit</button>
        <button class="rounded bg-danger" onclick="deleteNote(${index})">Hapus</button>
      </div>
    `;
    container.appendChild(div);
  });
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
        <h3>${escapeHTML(note.title)}</h3>
        <pre>${escapeHTML(note.content)}</pre>
        <div class="actions">
          <button class="rounded bg-warning" onclick="editNote(${index})">Edit</button>
        <button class="rounded bg-danger" onclick="deleteNote(${index})">Hapus</button>
        </div>
      `;
      container.appendChild(div);
    }
  });
}

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

renderNotes();