import { db, auth, collection, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc, setDoc, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, STATUS, getDoc } from './config.js';

let currentOS = null;
let osDataList = [];
let clientDataList = [];
let activeFilter = 'all';
let searchQuery = '';
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

// Elementos Globals
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginError = document.getElementById('login-error');
const searchInput = document.getElementById('search-input');
const searchAnnouncer = document.getElementById('search-announcer');

const allowedEmails = ['loliver242@gmail.com', 'marcus190373@gmail.com'];

// Guarda o conteúdo original do botão para restaurar após loading/erro.
const loginButton = document.getElementById('google-login-btn');
const loginButtonHTML = loginButton ? loginButton.innerHTML : '';

function resetLoginButton() {
  if (!loginButton) return;
  loginButton.disabled = false;
  loginButton.innerHTML = loginButtonHTML;
}

// Helper: Escape HTML
const escapeHTML = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Helper: Formatar Data
function formatDate(v, fallback = '—') {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('pt-BR');
}

function isValidCpfCnpj(val) {
  val = val.replace(/\D/g, '');
  if (val.length === 11) {
    if (!!val.match(/(\d)\1{10}/)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(val.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(val.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(val.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    return rest === parseInt(val.substring(10, 11));
  } else if (val.length === 14) {
    if (!!val.match(/(\d)\1{13}/)) return false;
    let length = val.length - 2;
    let numbers = val.substring(0, length);
    let digits = val.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(0)) return false;
    length = length + 1;
    numbers = val.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(1)) return false;
    return true;
  }
  return false;
}

const statusLabel = id => STATUS.find(s => s.id === id)?.label || id;

function formatDateTime(v, fallback = '—') {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Registro interno: fica apenas no painel.
async function registrarHistorico(osId, note, action = 'Atualização') {
  if (!note) return;
  await addDoc(collection(db, 'os_list', osId, 'history'), {
    date: new Date().toISOString(),
    action,
    note
  });
}

// Registro público: e o que o cliente enxerga ao consultar o protocolo.
async function registrarMovimentacao(osId, { title, detail = '', status, date = new Date().toISOString() }) {
  if (!title) return;
  await addDoc(collection(db, 'os_list', osId, 'timeline'), { date, title, detail, status });
}

// --- Toast System ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
  
  container.appendChild(toast);
  
  // animate in (handled by @starting-style)
  
  setTimeout(() => {
    toast.setAttribute('hidden', '');
    setTimeout(() => toast.remove(), 300); // Wait for transition
  }, 4000);
}

// --- Theme Toggling ---
const themeButton = document.getElementById('theme-toggle');
if (themeButton) {
  themeButton.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    root.dataset.theme = newTheme;
    localStorage.setItem('mpt-theme', newTheme);
    themeButton.setAttribute('aria-pressed', newTheme === 'dark');
    themeButton.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
  });
  
  // Set initial state
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', isDark);
  themeButton.innerHTML = isDark ? '☀️' : '🌙';
}

// --- Auth ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!user.emailVerified || !allowedEmails.includes(user.email)) {
      await signOut(auth);
      loginError.textContent = 'Acesso negado: Usuário não autorizado.';
      loginError.classList.remove('u-hidden');
      loginScreen.removeAttribute('hidden');
      dashboard.setAttribute('hidden', '');
      resetLoginButton();
      return;
    }

    loginScreen.setAttribute('hidden', '');
    dashboard.removeAttribute('hidden');
    
    resetLoginButton();
    
    unsubscribeAll();
    loadOS();
    loadClients();
  } else {
    loginScreen.removeAttribute('hidden');
    dashboard.setAttribute('hidden', '');
    unsubscribeAll();
  }
});

loginButton?.addEventListener('click', async (e) => {
  e.preventDefault();
  const btn = loginButton;

  try {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Autenticando...';
    loginError.classList.add('u-hidden');
    
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("ERRO LOGIN GOOGLE:", err);
    showToast("Erro no login: " + err.message, "error");
    loginError.textContent = 'Falha: ' + err.message;
    loginError.classList.remove('u-hidden');
  } finally {
    resetLoginButton();
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  const confirmLogout = confirm("Deseja realmente sair?");
  if (confirmLogout) {
    await signOut(auth);
    showToast("Você saiu com segurança.", "success");
  }
});

// --- Tab System ---
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', 'false'));
    e.currentTarget.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.tab-content').forEach(c => c.setAttribute('hidden', ''));
    document.getElementById(e.currentTarget.dataset.target).removeAttribute('hidden');
  });
});

// --- Filters & Search ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget;
    document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    target.setAttribute('aria-pressed', 'true');
    activeFilter = target.dataset.filter;
    currentPage = 1;
    renderTable();
  });
});

let debounceTimer;
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1;
      renderTable();
    }, 250);
  });
}

function updateFilterCounts() {
  const filterContainer = document.getElementById('filter-container');
  if (filterContainer && filterContainer.children.length <= 1) {
    STATUS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.setAttribute('aria-pressed', 'false');
      btn.dataset.filter = s.id;
      btn.innerHTML = `${s.label} <span class="count">0</span>`;
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        e.currentTarget.setAttribute('aria-pressed', 'true');
        activeFilter = e.currentTarget.dataset.filter;
        currentPage = 1;
        renderTable();
      });
      filterContainer.appendChild(btn);
    });
    
    // Reattach listener to "Todas" button since we only added listeners to dynamically created ones
    const btnAll = filterContainer.querySelector('[data-filter="all"]');
    if (btnAll) {
      btnAll.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        e.currentTarget.setAttribute('aria-pressed', 'true');
        activeFilter = 'all';
        currentPage = 1;
        renderTable();
      });
    }
  }

  const counts = { all: osDataList.length };
  STATUS.forEach(s => counts[s.id] = 0);
  osDataList.forEach(os => {
    if (counts[os.status] !== undefined) counts[os.status]++;
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const f = btn.dataset.filter;
    const span = btn.querySelector('.count');
    if (span) span.textContent = counts[f] || 0;
  });
}

// --- Data Loading ---
let unsubscribes = [];

function unsubscribeAll() {
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];
}

function loadClients() {
  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snapshot) => {
    clientDataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderClients();
  });
  unsubscribes.push(unsub);
}

function renderClients() {
  const tbody = document.getElementById('client-list');
  if (!tbody) return;
  
  if (clientDataList.length === 0) {
    tbody.innerHTML = `
      <div class="empty-state">
        <p>Nenhum cliente cadastrado.</p>
      </div>`;
    return;
  }
  
  // Contar OS por cliente
  const osCountByClient = {};
  osDataList.forEach(os => {
    if (os.clientCpf) {
      const cpfKey = String(os.clientCpf).replace(/\D/g, '');
      osCountByClient[cpfKey] = (osCountByClient[cpfKey] || 0) + 1;
    }
  });
  
  let html = `<div class="os-list os-list--clients">
    <div class="os-list-header">
      <div>Nome</div><div>WhatsApp</div><div>Cadastrado</div><div>OS</div><div></div>
    </div>`;

  html += clientDataList.map(c => `
    <div class="os-row">
      <div class="os-row-client">
        <strong>${escapeHTML(c.name)}</strong>
        <span>${escapeHTML(c.cpf)}</span>
      </div>
      <div><span class="os-row-cell-label">WhatsApp</span>${escapeHTML(c.phone)}</div>
      <div class="os-row-date"><span class="os-row-cell-label">Cadastrado</span>${formatDate(c.createdAt)}</div>
      <div>
        <span class="os-row-cell-label">Ordens</span>
        <span class="count">${osCountByClient[String(c.id).replace(/\D/g, '')] || 0}</span>
      </div>
      <div class="os-row-action">
        <button type="button" class="btn secondary" data-action="editClient" data-id="${escapeHTML(c.id)}" aria-label="Editar cliente">Editar</button>
        <button type="button" class="btn primary" data-action="newOSForClient" data-id="${escapeHTML(c.id)}" aria-label="Nova OS para este cliente">Nova OS</button>
      </div>
    </div>
  `).join('');
  html += `</div>`;

  tbody.innerHTML = html;
  
  const osClientSelect = document.getElementById('new-os-client-select');
  if (osClientSelect) {
    osClientSelect.innerHTML = '<option value="">Selecione um cliente</option>' + clientDataList.map(c => `
      <option value="${escapeHTML(c.id)}">${escapeHTML(c.name)} (${escapeHTML(c.cpf || 'Sem CPF')})</option>
    `).join('');
  }
}

const editClient = (id) => {
  const client = clientDataList.find(c => c.id === id);
  if (!client) return;
  document.getElementById('new-cli-name').value = client.name;
  document.getElementById('new-cli-cpf').value = client.cpf;
  document.getElementById('new-cli-cpf').readOnly = true; // prevent changing ID
  document.getElementById('new-cli-phone').value = client.phone;
  document.getElementById('new-cli-address').value = client.address || '';
  document.getElementById('new-cli-email').value = client.email || '';
  document.getElementById('new-client-title').textContent = 'Editar Cliente';
  openModal('new-client-modal');
};

const newOSForClient = (id) => {
  document.getElementById('new-os-form').reset();
  document.getElementById('new-os-client-select').value = id;
  openModal('new-os-modal');
};

function loadOS() {
  const q = query(collection(db, "os_list"), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snapshot) => {
    osDataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateFilterCounts();
    renderTable();
    renderClients(); // Para atualizar contagem de OS
  });
  unsubscribes.push(unsub);
}

const normalizeStr = str => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function renderTable() {
  const tbody = document.getElementById('os-list-container');
  if (!tbody) return;
  
  let filtered = osDataList;
  
  // Filter by status tab
  if (activeFilter !== 'all') {
    filtered = filtered.filter(os => os.status === activeFilter);
  }
  
  // Filter by search
  if (searchQuery) {
    const q = normalizeStr(searchQuery);
    filtered = filtered.filter(os => 
      normalizeStr(os.protocol).includes(q) || 
      normalizeStr(os.client).includes(q) || 
      normalizeStr(os.phone || '').includes(q)
    );
  }
  
  // Announce
  if (searchAnnouncer && searchQuery) {
    searchAnnouncer.textContent = `${filtered.length} ordens encontradas.`;
  } else if (searchAnnouncer) {
    searchAnnouncer.textContent = '';
  }
  
  // Pagination
  const totalItems = filtered.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (totalItems === 0) {
    if (searchQuery) {
      tbody.innerHTML = `
        <div class="empty-state">
          <p>Nenhum resultado para "${escapeHTML(searchQuery)}"</p>
          <button type="button" class="btn secondary" data-action="clearSearch">Limpar filtro</button>
        </div>`;
    } else {
      tbody.innerHTML = `
        <div class="empty-state">
          <p>Nenhuma ordem encontrada.</p>
        </div>`;
    }
    return;
  }

  let html = `<div class="os-list">
    <div class="os-list-header">
      <div>Protocolo</div><div>Cliente</div><div>Equipamento</div><div>Status</div><div>Atualização</div><div></div>
    </div>`;

  html += paginated.map(os => {
    const st = STATUS.find(s => s.id === os.status);
    return `
    <div class="os-row">
      <div class="os-row-header">
        <div class="os-row-protocol">${escapeHTML(os.protocol)}</div>
        <span class="status-badge ${st?.cls || 'st-aberto'} os-row-status-mobile">${escapeHTML(st?.label || os.status)}</span>
      </div>
      <div class="os-row-client">
        <strong>${escapeHTML(os.client)}</strong>
        ${os.notes ? `<span>📝 ${escapeHTML(os.notes)}</span>` : ''}
      </div>
      <div class="os-row-device">
        <span class="os-row-cell-label">Equipamento</span>
        <strong>${escapeHTML(os.device)}</strong>
        ${os.model ? `<small>${escapeHTML(os.model)}</small>` : ''}
      </div>
      <div class="os-row-status-desktop">
        <span class="status-badge ${st?.cls || 'st-aberto'}">${escapeHTML(st?.label || os.status)}</span>
      </div>
      <div class="os-row-date">
        <span class="os-row-cell-label">Atualizado</span>${formatDate(os.updatedAt)}
      </div>
      <div class="os-row-action">
        <button type="button" class="btn ghost icon" data-action="openHistory" data-id="${escapeHTML(os.id)}" aria-label="Ver histórico da OS ${escapeHTML(os.protocol)}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="u-icon" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
           <span class="mobile-text">Histórico</span>
        </button>
        <button type="button" class="btn ghost icon" data-action="openEdit" data-id="${escapeHTML(os.id)}" aria-label="Gerenciar OS ${escapeHTML(os.protocol)}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="u-icon" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
           <span class="mobile-text">Gerenciar</span>
        </button>
      </div>
    </div>
  `;
  }).join('');
  html += `</div>`;

  // Paginator
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages > 1) {
    html += `
      <div class="pagination">
        <p>Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} de ${totalItems} ordens</p>
        <div>
          <button type="button" class="btn secondary" ${currentPage === 1 ? 'disabled' : ''} data-action="changePage" data-val="-1">Anterior</button>
          <button type="button" class="btn secondary" ${currentPage === totalPages ? 'disabled' : ''} data-action="changePage" data-val="1">Próxima</button>
        </div>
      </div>
    `;
  }
  
  tbody.innerHTML = html;
}

const changePage = (dir) => {
  currentPage += dir;
  renderTable();
};

// Global click delegator
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  
  if (action === 'openEdit') openEdit(btn.dataset.id);
  else if (action === 'openHistory') abrirHistorico(btn.dataset.id);
  else if (action === 'editClient') editClient(btn.dataset.id);
  else if (action === 'newOSForClient') newOSForClient(btn.dataset.id);
  else if (action === 'changePage') changePage(parseInt(btn.dataset.val));
  else if (action === 'clearSearch') {
    const sInput = document.getElementById('search-input');
    sInput.value = '';
    sInput.dispatchEvent(new Event('input'));
  }
});

// --- Modals ---
let activeTrigger = null;

function openModal(modalId) {
  activeTrigger = document.activeElement;
  const modal = document.getElementById(modalId);
  modal.removeAttribute('hidden');
  
  // focus the first focusable element inside
  const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable) {
    setTimeout(() => focusable.focus(), 50);
  }
  
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  
  if (activeTrigger) {
    activeTrigger.focus();
    activeTrigger = null;
  }
}

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal(backdrop.id);
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal-backdrop:not([hidden])');
    if (openModal) {
      closeModal(openModal.id);
    }
  }
});

const openEdit = async (id) => {
  currentOS = osDataList.find(o => o.id === id);
  if (!currentOS) return;
  
  document.getElementById('modal-protocol').textContent = currentOS.protocol;
  document.getElementById('modal-client').textContent = currentOS.client;
  document.getElementById('modal-phone').textContent = currentOS.phone || 'Não informado';
  document.getElementById('modal-device').textContent = `${currentOS.device} ${currentOS.model ? '('+currentOS.model+')' : ''}`;
  document.getElementById('modal-problem').textContent = currentOS.problem;
  
  document.getElementById('os-budget').value = currentOS.budget || '';
  document.getElementById('os-notes').value = '';
  const sharePublic = document.getElementById('os-notes-public');
  if (sharePublic) sharePublic.checked = false;
  
  // Status Picker Setup
  const statusSelect = document.getElementById('edit-os-status');
  if (statusSelect) {
    statusSelect.value = currentOS.status;
  }
  
  // Preview das ultimas movimentacoes; o historico completo fica no modal proprio.
  const historyDiv = document.getElementById('modal-history');
  historyDiv.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const histSnap = await getDocs(query(collection(db, "os_list", currentOS.id, "history"), orderBy("date", "desc")));
    const historyList = histSnap.docs.map(d => d.data()).slice(0, 5);
    historyDiv.innerHTML = historyList.length > 0
      ? historyList.map(h => `
        <div class="history-item">
          <strong>${escapeHTML(h.action || 'Atualização')}</strong> <time>${formatDateTime(h.date)}</time><br>
          <span>${escapeHTML(h.note)}</span>
        </div>`).join('')
      : '<p class="history-empty">Nenhuma movimentação registrada.</p>';
  } catch (error) {
    console.error('Erro ao carregar movimentações:', error);
    historyDiv.innerHTML = '<p class="history-empty">Não foi possível carregar as movimentações.</p>';
  }
  
  openModal('edit-modal');
};

const statusSelect = document.getElementById('edit-os-status');
if (statusSelect) {
  statusSelect.innerHTML = STATUS.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
}

document.getElementById('modal-whatsapp-btn').addEventListener('click', () => {
  if (!currentOS || !currentOS.phone) {
    showToast("Cliente não possui telefone cadastrado.", "error");
    return;
  }
  const msg = `Olá ${currentOS.client}!\n\nAqui é da MA PRIME TEC.\nTemos uma atualização sobre a sua Ordem de Serviço (Protocolo: *${currentOS.protocol}*).\n\nEquipamento: ${currentOS.device}\n*Status atual: ${currentOS.status}*\n\nSe precisar de algo, estamos à disposição!`;
  const phoneOnlyNumbers = currentOS.phone.replace(/\D/g, '');
  const fullPhone = phoneOnlyNumbers.length === 11 ? '55' + phoneOnlyNumbers : phoneOnlyNumbers;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
});

// Edit OS
async function submitEditForm(e) {
  if (e) e.preventDefault();
  
  const submitBtn = document.querySelector('#edit-form button[type="submit"]');
  const initialText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div> Salvando...';
  
  const newStatus = document.getElementById('edit-os-status').value;
  let newBudget = document.getElementById('os-budget').value.trim();
  newBudget = newBudget ? Number(newBudget) : null;
  const newNotes = document.getElementById('os-notes').value.trim();
  const shareNote = document.getElementById('os-notes-public')?.checked;
  const newUpdatedAt = new Date().toISOString();

  const statusChanged = newStatus !== currentOS.status;
  const budgetChanged = newBudget !== (currentOS.budget ?? null);

  // Trilha interna: tudo que aconteceu, inclusive nota privada.
  const internalParts = [];
  if (statusChanged) internalParts.push(`Status alterado de "${statusLabel(currentOS.status)}" para "${statusLabel(newStatus)}".`);
  if (budgetChanged) internalParts.push(newBudget === null ? 'Orçamento removido.' : `Orçamento atualizado para R$ ${newBudget.toFixed(2).replace('.', ',')}.`);
  if (newNotes) internalParts.push(`Nota: ${newNotes}`);

  if (!statusChanged && !budgetChanged && !newNotes) {
    showToast('Nenhuma alteração para salvar.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = initialText;
    return;
  }

  try {
    const osRef = doc(db, "os_list", currentOS.id);
    await updateDoc(osRef, {
      status: newStatus,
      budget: newBudget,
      updatedAt: newUpdatedAt
    });

    await registrarHistorico(currentOS.id, internalParts.join(' '));

    // Trilha pública: o cliente só recebe o que for relevante para ele.
    if (statusChanged) {
      await registrarMovimentacao(currentOS.id, {
        title: `Status atualizado para ${statusLabel(newStatus)}`,
        detail: shareNote && newNotes ? newNotes : '',
        status: newStatus,
        date: newUpdatedAt
      });
    }
    if (budgetChanged && newBudget !== null) {
      await registrarMovimentacao(currentOS.id, {
        title: 'Orçamento disponível',
        detail: `Valor de R$ ${newBudget.toFixed(2).replace('.', ',')}.`,
        status: newStatus,
        date: newUpdatedAt
      });
    }
    if (!statusChanged && shareNote && newNotes) {
      await registrarMovimentacao(currentOS.id, {
        title: 'Atualização do atendimento',
        detail: newNotes,
        status: newStatus,
        date: newUpdatedAt
      });
    }

    showToast("Ordem de Serviço atualizada com sucesso!");
    closeModal('edit-modal');
  } catch (error) {
    console.error("Error updating OS:", error);
    showToast("Erro ao atualizar a OS.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = initialText;
  }
}
document.getElementById('edit-form').addEventListener('submit', submitEditForm);

// Cancelamento: mantem a OS visivel para o cliente, marcada como cancelada.
document.getElementById('cancel-os-btn')?.addEventListener('click', async () => {
  if (!currentOS) return;
  if (currentOS.status === 'cancelado') {
    showToast('Esta OS já está cancelada.', 'error');
    return;
  }

  const ok = await confirmarDialogo({
    titulo: 'Cancelar esta OS?',
    texto: `A ordem ${currentOS.protocol} passará para o status Cancelado e o cliente verá o cancelamento no histórico. A OS continua consultável.`,
    confirmar: 'Sim, cancelar'
  });
  if (!ok) return;

  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'os_list', currentOS.id), { status: 'cancelado', updatedAt: now });
    await registrarHistorico(currentOS.id, `Status alterado de "${statusLabel(currentOS.status)}" para "Cancelado".`, 'Cancelamento');
    await registrarMovimentacao(currentOS.id, {
      title: 'Atendimento cancelado',
      detail: 'A ordem de serviço foi cancelada. Fale conosco se precisar reabrir.',
      status: 'cancelado',
      date: now
    });
    showToast('Ordem de Serviço cancelada.');
    closeModal('edit-modal');
  } catch (error) {
    console.error('Erro ao cancelar OS:', error);
    showToast('Erro ao cancelar a OS.', 'error');
  }
});

// --- Exclusao definitiva ---
// Apos excluir, a consulta publica pelo protocolo passa a responder
// "nenhum atendimento encontrado": para o cliente, a OS deixa de existir.
async function apagarSubcolecao(osId, nome) {
  const snap = await getDocs(collection(db, 'os_list', osId, nome));
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'os_list', osId, nome, d.id))));
}

async function excluirOS(osId) {
  await apagarSubcolecao(osId, 'history');
  await apagarSubcolecao(osId, 'timeline');
  await deleteDoc(doc(db, 'os_list', osId));
}

function confirmarDialogo({ titulo, texto, confirmar, perigo = true }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm-dialog';
    dlg.innerHTML = `
      <h3>${escapeHTML(titulo)}</h3>
      <p>${escapeHTML(texto)}</p>
      <div class="confirm-actions">
        <button type="button" class="btn secondary" value="no">Voltar</button>
        <button type="button" class="btn ${perigo ? 'danger-solid' : 'primary'}" value="yes">${escapeHTML(confirmar)}</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    const finish = (answer) => { dlg.close(); dlg.remove(); resolve(answer); };
    dlg.querySelector('[value="no"]').onclick = () => finish(false);
    dlg.querySelector('[value="yes"]').onclick = () => finish(true);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
  });
}

document.getElementById('open-history-btn')?.addEventListener('click', () => {
  if (currentOS) abrirHistorico(currentOS.id);
});

document.getElementById('delete-os-btn')?.addEventListener('click', async () => {
  if (!currentOS) return;
  const ok = await confirmarDialogo({
    titulo: 'Excluir esta OS?',
    texto: `A ordem ${currentOS.protocol} e todo o histórico serão apagados. O cliente deixará de encontrá-la na consulta. Esta ação não pode ser desfeita.`,
    confirmar: 'Excluir definitivamente'
  });
  if (!ok) return;

  try {
    await excluirOS(currentOS.id);
    showToast(`OS ${currentOS.protocol} excluída.`);
    closeModal('edit-modal');
  } catch (error) {
    console.error('Erro ao excluir OS:', error);
    showToast('Erro ao excluir a OS.', 'error');
  }
});

// --- Modal de historico de movimentacoes ---
async function abrirHistorico(osId) {
  const os = osDataList.find(o => o.id === osId);
  if (!os) return;

  document.getElementById('history-modal-protocol').textContent = os.protocol;
  const box = document.getElementById('history-modal-body');
  box.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Carregando histórico...</p></div>';
  openModal('history-modal');

  try {
    const [internos, publicos] = await Promise.all([
      getDocs(query(collection(db, 'os_list', osId, 'history'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'os_list', osId, 'timeline'), orderBy('date', 'desc')))
    ]);

    const bloco = (titulo, descricao, itens) => `
      <section class="history-section">
        <h4>${titulo}</h4>
        <p class="history-section-hint">${descricao}</p>
        ${itens.length === 0
          ? '<p class="history-empty">Nenhum registro.</p>'
          : `<div class="history-box">${itens.join('')}</div>`}
      </section>`;

    const itensInternos = internos.docs.map(d => d.data()).map(h => `
      <div class="history-item">
        <strong>${escapeHTML(h.action || 'Atualização')}</strong> <time>${formatDateTime(h.date)}</time><br>
        <span>${escapeHTML(h.note)}</span>
      </div>`);

    const itensPublicos = publicos.docs.map(d => d.data()).map(h => `
      <div class="history-item">
        <strong>${escapeHTML(h.title)}</strong> <time>${formatDateTime(h.date)}</time>
        ${h.detail ? `<br><span>${escapeHTML(h.detail)}</span>` : ''}
      </div>`);

    box.innerHTML =
      bloco('Visível para o cliente', 'Aparece na consulta do protocolo.', itensPublicos) +
      bloco('Registro interno', 'Somente o painel enxerga estas anotações.', itensInternos);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    box.innerHTML = '<div class="empty-state"><p>Não foi possível carregar o histórico.</p></div>';
  }
}

// Attach Close buttons
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    closeModal(e.currentTarget.dataset.close);
  });
});
document.querySelectorAll('[data-open]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.open;
    if (target === 'new-os-modal') document.getElementById('new-os-form').reset();
    if (target === 'new-client-modal') {
      document.getElementById('new-client-form').reset();
      document.getElementById('new-cli-cpf').readOnly = false;
      document.getElementById('new-client-title').textContent = 'Novo Cliente';
    }
    openModal(target);
  });
});

// New Client Submit
document.getElementById('new-client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const initialText = submitBtn.textContent;
  
  const cpf = document.getElementById('new-cli-cpf').value.replace(/\D/g, '');
  if (!isValidCpfCnpj(cpf)) {
    showToast("CPF ou CNPJ inválido.", "error");
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div> Salvando...';
  
  const clientData = {
    name: document.getElementById('new-cli-name').value.trim(),
    cpf: cpf,
    phone: document.getElementById('new-cli-phone').value.trim(),
    address: document.getElementById('new-cli-address').value.trim(),
    email: document.getElementById('new-cli-email').value.trim(),
    createdAt: new Date().toISOString()
  };
  
  try {
    const clientRef = doc(db, "clients", cpf); // Use CPF as ID
    await setDoc(clientRef, clientData, { merge: true });
    showToast("Cliente salvo com sucesso!");
    closeModal('new-client-modal');
    
    if(!document.getElementById('new-os-modal').hasAttribute('hidden')) {
       // pre select this client
       setTimeout(() => {
         document.getElementById('new-os-client-select').value = cpf;
       }, 500);
    }
  } catch (err) {
    console.error("Error creating Client:", err);
    showToast("Erro ao criar Cliente.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = initialText;
  }
});

function generateSafeProtocol() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(5);
  crypto.getRandomValues(array);
  
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += ALPHABET[array[i] % ALPHABET.length];
  }
  
  return `OS-${yyyy}${mm}${dd}-${random}`;
}

// New OS Submit
document.getElementById('new-os-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const initialText = submitBtn.textContent;
  
  const clientId = document.getElementById('new-os-client-select').value;
  if (!clientId) {
    showToast("Selecione um cliente válido.", "error");
    return;
  }
  
  const client = clientDataList.find(c => c.id === clientId);
  if (!client) {
    showToast("Cliente não encontrado.", "error");
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div> Criando...';
  
  const protocol = generateSafeProtocol();
  const payload = {
    client: client.name,
    clientCpf: client.id, 
    phone: client.phone,
    device: document.getElementById('new-device').value,
    model: document.getElementById('new-model').value.trim(),
    problem: document.getElementById('new-problem').value.trim(),
    details: '',
    origin: 'admin',
    status: 'aberto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    let finalProtocol = null;
    for (let i = 0; i < 3; i++) {
      const p = generateSafeProtocol();
      payload.protocol = p;
      const ref = doc(db, 'os_list', p);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, payload);
        await registrarHistorico(p, `OS aberta pelo painel para ${client.name}.`, 'Abertura');
        await registrarMovimentacao(p, {
          title: 'Atendimento aberto',
          detail: 'Recebemos seu equipamento e a ordem de serviço foi registrada.',
          status: 'aberto',
          date: payload.createdAt
        });
        finalProtocol = p;
        break;
      }
    }
    
    if (!finalProtocol) throw new Error("Não foi possível gerar um protocolo único. Tente novamente.");
    
    showToast(`Ordem de Serviço ${finalProtocol} criada com sucesso!`);
    closeModal('new-os-modal');
  } catch (err) {
    console.error("Error creating OS:", err);
    showToast("Erro ao criar OS.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = initialText;
  }
});

// Input Mask Listeners
document.body.addEventListener('input', (e) => {
  const input = e.target;
  if (input.name === 'phone' || input.id === 'new-cli-phone') {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
    input.value = v;
  }
  if (input.name === 'cpf' || input.id === 'new-cli-cpf') {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 14) v = v.slice(0, 14);
    
    if (v.length <= 11) {
      if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
      if (v.length > 7) v = `${v.slice(0,7)}.${v.slice(7)}`;
      if (v.length > 11) v = `${v.slice(0,11)}-${v.slice(11)}`;
    } else {
      if (v.length > 2) v = `${v.slice(0,2)}.${v.slice(2)}`;
      if (v.length > 6) v = `${v.slice(0,6)}.${v.slice(6)}`;
      if (v.length > 10) v = `${v.slice(0,10)}/${v.slice(10)}`;
      if (v.length > 15) v = `${v.slice(0,15)}-${v.slice(15)}`;
    }
    input.value = v;
  }
});
