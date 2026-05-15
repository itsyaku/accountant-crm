const SUPABASE_URL = 'https://jlcjdhzdcuwwibqmyfcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2pkaHpkY3V3d2licW15ZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDM1MDYsImV4cCI6MjA5NDM3OTUwNn0.iNuq_4HO9xlQeUw0fw8lRkSU1b-FrPeZqJzTNzw_y1k';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ──────────────────────────────────────────────
let clients = [];
let activeId = null;
let editingId = null;
let searchQuery = '';

// ── Data ───────────────────────────────────────────────
function mapClient(c) {
  return {
    ...c,
    createdAt: c.created_at,
    notes: (c.notes || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(n => ({ ...n, createdAt: n.created_at })),
  };
}

async function load() {
  const { data, error } = await db
    .from('clients')
    .select('*, notes(*)')
    .order('created_at', { ascending: false });

  if (error) { console.error('Load error:', error); clients = []; return; }

  clients = (data || []).map(mapClient);
  if (clients.length === 0) await seedDemoData();
}

async function seedDemoData() {
  const seeds = [
    { first: 'Sarah',  last: 'Johnson', company: 'Johnson Retail (Pty) Ltd', email: 'sarah@johnsonretail.co.za', phone: '+27 82 111 2233', service: 'Bookkeeping',  status: 'Active', created_at: '2024-03-10' },
    { first: 'Marcus', last: 'Dlamini', company: 'Dlamini Consulting',        email: 'marcus@dlamini.co.za',      phone: '+27 71 444 5566', service: 'Tax Planning', status: 'Active', created_at: '2023-08-15' },
    { first: 'Priya',  last: 'Naidoo',  company: '',                          email: 'priya.naidoo@gmail.com',    phone: '+27 83 777 8899', service: 'Tax Planning', status: 'Active', created_at: '2025-01-20' },
  ];
  const { data } = await db.from('clients').insert(seeds).select('*, notes(*)');
  if (data) clients = data.map(mapClient);
}

// ── Helpers ────────────────────────────────────────────
function ts() { return new Date().toISOString(); }
function initials(c) { return (c.first[0] + c.last[0]).toUpperCase(); }
function fullName(c) { return c.first + ' ' + c.last; }

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Render sidebar ─────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('client-list');
  const q = searchQuery.toLowerCase();
  const filtered = clients.filter(c =>
    fullName(c).toLowerCase().includes(q) ||
    (c.company || '').toLowerCase().includes(q) ||
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
    : client.notes.map(n => `
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

async function addNote(clientId) {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;

  const { data, error } = await db
    .from('notes')
    .insert({ client_id: clientId, text, created_at: ts() })
    .select()
    .single();

  if (error) { console.error('Add note error:', error); return; }

  const client = clients.find(c => c.id === clientId);
  if (client) client.notes.unshift({ ...data, createdAt: data.created_at });
  input.value = '';
  renderMain();
}

async function deleteNote(clientId, noteId) {
  const { error } = await db.from('notes').delete().eq('id', noteId);
  if (error) { console.error('Delete note error:', error); return; }

  const client = clients.find(c => c.id === clientId);
  if (client) client.notes = client.notes.filter(n => n.id !== noteId);
  renderMain();
}

async function deleteClient(id) {
  if (!confirm('Delete this client? This cannot be undone.')) return;

  const { error } = await db.from('clients').delete().eq('id', id);
  if (error) { console.error('Delete client error:', error); return; }

  clients = clients.filter(c => c.id !== id);
  if (activeId === id) activeId = null;
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

async function saveClient() {
  const first = document.getElementById('f-first').value.trim();
  const last  = document.getElementById('f-last').value.trim();
  const email = document.getElementById('f-email').value.trim();

  if (!first || !last || !email) { alert('First name, last name, and email are required.'); return; }

  const fields = {
    first, last, email,
    company: document.getElementById('f-company').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    service: document.getElementById('f-service').value,
    status:  document.getElementById('f-status').value,
  };

  if (editingId) {
    const { data, error } = await db
      .from('clients')
      .update(fields)
      .eq('id', editingId)
      .select('*, notes(*)')
      .single();

    if (error) { console.error('Update error:', error); return; }
    const idx = clients.findIndex(c => c.id === editingId);
    if (idx !== -1) clients[idx] = mapClient(data);
  } else {
    const { data, error } = await db
      .from('clients')
      .insert({ ...fields, created_at: new Date().toISOString().slice(0, 10) })
      .select('*, notes(*)')
      .single();

    if (error) { console.error('Insert error:', error); return; }
    clients.unshift(mapClient(data));
    activeId = data.id;
  }

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
load().then(() => {
  renderSidebar();
  renderMain();
});
