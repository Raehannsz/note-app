let notes = JSON.parse(localStorage.getItem('notes')) || [];

function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');

  // Sembunyikan alert setelah 3 detik
  setTimeout(() => {
    alertBox.classList.add('d-none');
  }, 3000);
}

function renderNotes() {
  const container = document.getElementById('notes');
  container.innerHTML = '';
  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note';
    div.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content}</p>
      <div class="actions">
        <button onclick="editNote(${index})">Edit</button>
        <button onclick="deleteNote(${index})">Hapus</button>
      </div>
    `;
    container.appendChild(div);
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
  const newTitle = prompt('Edit Judul:', note.title);
  const newContent = prompt('Edit Isi:', note.content);
  if (newTitle !== null && newContent !== null) {
    notes[index] = { title: newTitle, content: newContent };
    updateNotes();
  }
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

renderNotes();
