// ── State ──────────────────────────────────────────────
const STORAGE_KEY = 'summit_crm_clients';
let clients = [];
let activeId = null;
let editingId = null;
let searchQuery = '';

// ── Persistence ────────────────────────────────────────
function load() {
  try { clients = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { clients = []; }
  if (clients.length === 0) seedDemoData();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function seedDemoData() {
  clients = [
    { id: uid(), first: 'Sarah', last: 'Johnson', company: 'Johnson Retail (Pty) Ltd', email: 'sarah@johnsonretail.co.za', phone: '+27 82 111 2233', service: 'Bookkeeping', status: 'Active', createdAt: '2024-03-10', notes: [{ id: uid(), text: 'Onboarded Q1 2024. Uses Xero — needs monthly reconciliation by the 5th.', createdAt: ts() }] },
    { id: uid(), first: 'Marcus', last: 'Dlamini', company: 'Dlamini Consulting', email: 'marcus@dlamini.co.za', phone: '+27 71 444 5566', service: 'Tax Planning', status: 'Active', createdAt: '2023-08-15', notes: [{ id: uid(), text: 'Provisional tax due end of August. Remind 3 weeks prior.', createdAt: ts() }] },
    { id: uid(), first: 'Priya', last: 'Naidoo', company: '', email: 'priya.naidoo@gmail.com', phone: '+27 83 777 8899', service: 'Tax Planning', status: 'Active', createdAt: '2025-01-20', notes: [] },
  ];
  save();
}

// ── Helpers ────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function ts() { return new Date().toISOString(); }
function initials(c) { return (c.first[0] + c.last[0]).toUpperCase(); }
function fullName(c) { return c.first + ' ' + c.last; }

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Render sidebar ─────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('client-list');
  const q = searchQuery.toLowerCase();
  const filtered = clients.filter(c =>
    fullName(c).toLowerCase().includes(q) ||
    c.company.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q)
  );

  list.innerHTML = filtered.length === 0
    ? `<p style="padding:1rem;color:var(--gray-400);font-size:.85rem;text-align:center">No clients found</p>`
    : filtered.map(c => `
      <div class="client-item ${c.id === activeId ? 'active' : ''}" onclick="selectClient('${c.id}')">
        <div class="client-avatar">${initials(c)}</div>
        <div style="min-width:0">
          <div class="client-info-name">${fullName(c)}</div>
          <div class="client-info-sub">${c.company || c.email}</div>
        </div>
      </div>`).join('');

  const total = clients.length;
  document.getElementById('client-count-badge').textContent = total + ' client' + (total !== 1 ? 's' : '');
}

// ── Render main panel ──────────────────────────────────
function renderMain() {
  const emptyEl = document.getElementById('empty-state');
  const detailEl = document.getElementById('client-detail');

  const client = clients.find(c => c.id === activeId);
  if (!client) {
    emptyEl.style.display = '';
    detailEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  detailEl.style.display = 'flex';

  const notesHtml = client.notes.length === 0
    ? `<p class="no-notes">No notes yet — add one above.</p>`
    : [...client.notes].reverse().map(n => `
      <div class="note-card">
        <div class="note-header">
          <span class="note-timestamp">${formatDate(n.createdAt)}</span>
          <button class="note-delete" onclick="deleteNote('${client.id}','${n.id}')" title="Delete note">✕</button>
        </div>
        <div class="note-body">${escHtml(n.text)}</div>
      </div>`).join('');

  detailEl.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="detail-avatar-lg">${initials(client)}</div>
        <div>
          <div class="detail-name">${fullName(client)}</div>
          <div class="detail-meta">${client.company || '—'} &bull; ${client.service || 'No service selected'}</div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-sm" onclick="openModal('${client.id}')">Edit</button>
        <button class="btn-sm danger" onclick="deleteClient('${client.id}')">Delete</button>
      </div>
    </div>

    <div class="detail-body">
      <div class="info-panel">
        <div class="info-section">
          <h4>Contact</h4>
          <div class="info-field"><label>Email</label><span>${escHtml(client.email)}</span></div>
          <div class="info-field"><label>Phone</label><span>${escHtml(client.phone || '—')}</span></div>
        </div>
        <div class="info-section">
          <h4>Details</h4>
          <div class="info-field"><label>Company</label><span>${escHtml(client.company || '—')}</span></div>
          <div class="info-field"><label>Service</label><span>${escHtml(client.service || '—')}</span></div>
          <div class="info-field"><label>Status</label><span class="tag ${client.status === 'Active' ? 'tag-active' : 'tag-inactive'}">${client.status}</span></div>
          <div class="info-field"><label>Client since</label><span>${client.createdAt || '—'}</span></div>
        </div>
        <div class="info-section">
          <h4>Activity</h4>
          <div class="info-field"><label>Notes</label><span>${client.notes.length}</span></div>
        </div>
      </div>

      <div class="notes-panel">
        <h4>Notes</h4>
        <div class="note-input-area">
          <textarea id="note-input" placeholder="Add a note about this client…"></textarea>
          <div class="note-input-footer">
            <button class="btn-note" onclick="addNote('${client.id}')">Add note</button>
          </div>
        </div>
        <div class="notes-list">${notesHtml}</div>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Actions ────────────────────────────────────────────
function selectClient(id) {
  activeId = id;
  renderSidebar();
  renderMain();
}

function filterClients(q) {
  searchQuery = q;
  renderSidebar();
}

function addNote(clientId) {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  client.notes.push({ id: uid(), text, createdAt: ts() });
  save();
  renderMain();
}

function deleteNote(clientId, noteId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  client.notes = client.notes.filter(n => n.id !== noteId);
  save();
  renderMain();
}

function deleteClient(id) {
  if (!confirm('Delete this client? This cannot be undone.')) return;
  clients = clients.filter(c => c.id !== id);
  if (activeId === id) activeId = null;
  save();
  renderSidebar();
  renderMain();
}

// ── Modal ──────────────────────────────────────────────
function openModal(id = null) {
  editingId = id;
  const client = id ? clients.find(c => c.id === id) : null;

  document.getElementById('modal-title').textContent = id ? 'Edit client' : 'Add new client';
  document.getElementById('f-first').value   = client?.first   || '';
  document.getElementById('f-last').value    = client?.last    || '';
  document.getElementById('f-company').value = client?.company || '';
  document.getElementById('f-email').value   = client?.email   || '';
  document.getElementById('f-phone').value   = client?.phone   || '';
  document.getElementById('f-service').value = client?.service || '';
  document.getElementById('f-status').value  = client?.status  || 'Active';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('f-first').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function saveClient() {
  const first   = document.getElementById('f-first').value.trim();
  const last    = document.getElementById('f-last').value.trim();
  const email   = document.getElementById('f-email').value.trim();

  if (!first || !last || !email) { alert('First name, last name, and email are required.'); return; }

  if (editingId) {
    const client = clients.find(c => c.id === editingId);
    Object.assign(client, { first, last, email,
      company: document.getElementById('f-company').value.trim(),
      phone:   document.getElementById('f-phone').value.trim(),
      service: document.getElementById('f-service').value,
      status:  document.getElementById('f-status').value,
    });
  } else {
    clients.push({
      id: uid(), first, last, email,
      company: document.getElementById('f-company').value.trim(),
      phone:   document.getElementById('f-phone').value.trim(),
      service: document.getElementById('f-service').value,
      status:  document.getElementById('f-status').value,
      createdAt: new Date().toISOString().slice(0, 10),
      notes: [],
    });
    activeId = clients[clients.length - 1].id;
  }

  save();
  closeModal();
  renderSidebar();
  renderMain();
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const overlay = document.getElementById('modal-overlay');
    if (overlay.classList.contains('open')) saveClient();
  }
});

// ── Init ───────────────────────────────────────────────
load();
renderSidebar();
renderMain();
