import { db, auth, collection, getDocs, onSnapshot, doc, updateDoc, query, orderBy, addDoc, setDoc, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, STATUS, getDoc } from './config.js';

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

// Helper: Escape HTML
const escapeHTML = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Helper: Formatar Data
function formatDate(v, fallback = '—') {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('pt-BR');
}

function isValidCpf(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  return rest === parseInt(cpf.substring(10, 11));
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
      const btn = document.getElementById('google-login-btn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Entrar com Google';
      }
      return;
    }

    loginScreen.setAttribute('hidden', '');
    dashboard.removeAttribute('hidden');
    
    // Reset login button if it was disabled
    const btn = document.getElementById('google-login-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Entrar com Google';
    }
    
    loadOS();
    loadClients();
  } else {
    loginScreen.removeAttribute('hidden');
    dashboard.setAttribute('hidden', '');
    unsubscribeAll();
  }
});

document.getElementById('google-login-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('google-login-btn');
  const btnContent = btn.innerHTML;
  
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
    
    btn.disabled = false;
    btn.innerHTML = btnContent;
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
  
  let html = `<div class="os-list-header" style="grid-template-columns: 2fr 1fr 1fr 80px 100px;">
    <div>Nome</div><div>WhatsApp</div><div>Cadastrado</div><div>OS</div><div>Ações</div>
  </div>`;
  
  html += `<div class="os-list">`;
  html += clientDataList.map(c => `
    <div class="os-row" style="grid-template-columns: 2fr 1fr 1fr 80px 100px;">
      <div class="os-row-client">
        <strong>${escapeHTML(c.name)}</strong>
        <span>${escapeHTML(c.cpf)}</span>
      </div>
      <div>${escapeHTML(c.phone)}</div>
      <div class="os-row-date">${formatDate(c.createdAt)}</div>
        <div>
          <span class="count" style="background:var(--surface); padding: 4px 10px; border-radius:var(--r-pill); font-weight:700;">
            ${osCountByClient[String(c.id).replace(/\D/g, '')] || 0}
          </span>
        </div>
      <div style="display:flex; gap:8px; justify-content: flex-end;">
        <button class="btn secondary" style="min-height:44px; padding:0 12px; font-size:12px;" data-action="editClient" data-id="${escapeHTML(c.id)}" title="Editar">✏️</button>
        <button class="btn primary" style="min-height:44px; padding:0 12px; font-size:12px;" data-action="newOSForClient" data-id="${escapeHTML(c.id)}" title="Nova OS">OS+</button>
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
          <button class="secondary" data-action="clearSearch">Limpar filtro</button>
        </div>`;
    } else {
      tbody.innerHTML = `
        <div class="empty-state">
          <p>Nenhuma ordem encontrada.</p>
        </div>`;
    }
    return;
  }

  let html = `<div class="os-list-header">
    <div>Protocolo</div><div>Cliente</div><div>Equipamento</div><div>Status</div><div>Atualização</div><div></div>
  </div>`;
  
  html += `<div class="os-list">`;
  html += paginated.map(os => `
    <div class="os-row">
      <div class="os-row-header">
        <div class="os-row-protocol">${escapeHTML(os.protocol)}</div>
      </div>
      <div class="os-row-client">
        <strong>${escapeHTML(os.client)}</strong>
        ${os.notes ? `<span style="display:block; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📝 ${escapeHTML(os.notes)}</span>` : ''}
      </div>
      <div class="os-row-device">
        ${escapeHTML(os.device)}<br><small>${escapeHTML(os.model || '')}</small>
      </div>
      <div>
        <span class="status-badge ${STATUS.find(s => s.id === os.status)?.cls || 'st-aberto'}">${escapeHTML(STATUS.find(s => s.id === os.status)?.label || os.status)}</span>
      </div>
      <div class="os-row-date">
        ${formatDate(os.updatedAt)}
      </div>
      <div class="os-row-action">
        <button type="button" aria-label="Gerenciar" data-action="openEdit" data-id="${escapeHTML(os.id)}">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
           <span class="mobile-text">Gerenciar &gt;</span>
        </button>
      </div>
    </div>
  `).join('');
  html += `</div>`;
  
  // Paginator
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages > 1) {
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:16px; border-top:1px solid var(--line);">
        <span class="micro" style="margin:0;">Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} de ${totalItems} ordens</span>
        <div style="display:flex; gap:8px;">
          <button class="secondary" style="min-height:44px; padding:0 16px;" ${currentPage === 1 ? 'disabled' : ''} data-action="changePage" data-val="-1">Anterior</button>
          <button class="secondary" style="min-height:44px; padding:0 16px;" ${currentPage === totalPages ? 'disabled' : ''} data-action="changePage" data-val="1">Próxima</button>
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
  
  // Status Picker Setup
  document.getElementById('status-hidden-input').value = currentOS.status;
  document.querySelectorAll('.status-option').forEach(btn => {
    btn.setAttribute('aria-checked', btn.dataset.value === currentOS.status);
  });
  
  const histSnap = await getDocs(query(collection(db, "os_list", currentOS.id, "history"), orderBy("date", "desc")));
  const historyList = histSnap.docs.map(d => d.data());
  
  const historyDiv = document.getElementById('modal-history');
  if (historyList.length > 0) {
    historyDiv.innerHTML = historyList.map(h => `
      <div class="history-item">
        <strong style="color:var(--text);">${escapeHTML(h.action)}</strong> &nbsp;<span style="color:var(--muted)">${new Date(h.date).toLocaleString('pt-BR')}</span><br>
        <span style="color: var(--text);">${escapeHTML(h.note)}</span>
      </div>
    `).join('');
  } else {
    historyDiv.innerHTML = '<span style="color:var(--muted)">Nenhum histórico registrado.</span>';
  }
  
  openModal('edit-modal');
};

document.querySelectorAll('.status-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.status-option').forEach(b => b.setAttribute('aria-checked', 'false'));
    const target = e.currentTarget;
    target.setAttribute('aria-checked', 'true');
    document.getElementById('status-hidden-input').value = target.dataset.value;
  });
});

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
  
  const newStatus = document.getElementById('status-hidden-input').value;
  let newBudget = document.getElementById('os-budget').value.trim();
  newBudget = newBudget ? Number(newBudget) : null;
  const newNotes = document.getElementById('os-notes').value;
  const newUpdatedAt = new Date().toISOString();
  
  let historyNote = '';
  if (newStatus !== currentOS.status) {
    historyNote += `Status alterado de "${currentOS.status}" para "${newStatus}". `;
  }
  if (newBudget !== currentOS.budget) {
    if (newBudget === null) {
      historyNote += `Orçamento removido. `;
    } else {
      historyNote += `Orçamento atualizado para R$ ${newBudget}. `;
    }
  }
  if (newNotes.trim()) {
    historyNote += `Nota adicionada: ${newNotes}`;
  }
  
  try {
    const osRef = doc(db, "os_list", currentOS.id);
    await updateDoc(osRef, {
      status: newStatus,
      budget: newBudget,
      updatedAt: newUpdatedAt
    });
    
    if (historyNote) {
       await addDoc(collection(db, "os_list", currentOS.id, "history"), {
         date: newUpdatedAt,
         action: 'Atualização',
         note: historyNote
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

// Cancel Dialog logic
document.getElementById('cancel-os-btn')?.addEventListener('click', () => {
  const cancelDialog = document.createElement('dialog');
  cancelDialog.style = "border:none; border-radius: var(--r-card); padding: var(--s4); background: var(--bg); color: var(--text); max-width: 400px; text-align:center; margin: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);";
  cancelDialog.innerHTML = `
    <h3 style="margin-top:0;">Cancelar OS?</h3>
    <p style="color:var(--muted); margin-bottom:var(--s4);">Tem certeza que deseja cancelar esta Ordem de Serviço? Esta ação ficará no histórico.</p>
    <div style="display:flex; gap:var(--s2);">
      <button id="cancel-no" class="secondary" style="flex:1;">Não, voltar</button>
      <button id="cancel-yes" class="primary" style="flex:1; background:var(--danger); color:var(--danger-bg);">Sim, Cancelar</button>
    </div>
  `;
  document.body.appendChild(cancelDialog);
  cancelDialog.showModal();
  
  document.getElementById('cancel-no').onclick = () => {
    cancelDialog.close();
    cancelDialog.remove();
  };
  
  document.getElementById('cancel-yes').onclick = async () => {
    cancelDialog.close();
    cancelDialog.remove();
    
    // Set status to Cancelado
    document.querySelectorAll('.status-option').forEach(b => b.setAttribute('aria-checked', 'false'));
    const btnCancel = document.querySelector('.status-option[data-value="Cancelado"]');
    if (btnCancel) btnCancel.setAttribute('aria-checked', 'true');
    document.getElementById('status-hidden-input').value = 'Cancelado';
    
    // Auto submit form
    await submitEditForm();
  };
});

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
  if (!isValidCpf(cpf)) {
    showToast("CPF inválido.", "error");
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
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
    if (v.length > 7) v = `${v.slice(0,7)}.${v.slice(7)}`;
    if (v.length > 11) v = `${v.slice(0,11)}-${v.slice(11)}`;
    input.value = v;
  }
});
