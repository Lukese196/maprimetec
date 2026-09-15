// O site publico so LE do Firestore: a consulta da OS pelo protocolo e o
// historico que o atendente publicou. Nenhuma escrita parte daqui.
import { db, collection, getDocs, query, orderBy, SITE_CONFIG, doc, getDoc, STATUS } from './config.js';

const app = document.querySelector('#app');
const themeButton = document.querySelector('#theme');
const state = { device: '', problem: '', model: '', details: '', name: '', phone: '', cpf: '' };
const devices = ['Notebook', 'Computador', 'Impressora', 'Outro equipamento'];
const problems = {
  computer: ['Não liga', 'Está lento ou travando', 'Problema na tela', 'Internet ou Wi-Fi', 'Quero fazer uma melhoria', 'Outro problema', 'Não sei explicar'],
  printer: ['Não imprime', 'Papel preso', 'Impressão com falhas', 'Não conecta', 'Outro problema', 'Não sei explicar'],
  other: ['Não liga', 'Não funciona como deveria', 'Outro problema', 'Não sei explicar']
};
let step = 0;
const escapeHTML = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function formatDateTime(v, fallback = '—') {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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

function formatDate(v, fallback = '—') {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('pt-BR');
}

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

async function fetchOSData(queryVal) {
  try {
    const osRef = doc(db, 'os_list', queryVal);
    const osSnap = await getDoc(osRef);
    if (!osSnap.exists()) return [];
    return [{ id: osSnap.id, ...osSnap.data(), timeline: await fetchTimeline(osSnap.id) }];
  } catch (error) {
    console.error("Erro ao consultar OS:", error);
    return [];
  }
}

// Movimentacoes que o tecnico publicou para o cliente acompanhar.
async function fetchTimeline(osId) {
  try {
    const snap = await getDocs(query(collection(db, 'os_list', osId, 'timeline'), orderBy('date', 'desc')));
    return snap.docs.map(d => d.data());
  } catch (error) {
    console.warn('Nao foi possivel carregar o historico:', error.code);
    return [];
  }
}

function updateTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.textContent = dark ? '☀' : '☾';
  themeButton.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
}
themeButton.addEventListener('click', () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('ma-theme', document.documentElement.dataset.theme); } catch { /* Ignore */ }
  updateTheme();
});
updateTheme();

function navigate(next) { 
  location.hash = next ? (next === 'track' ? 'acompanhar' : `etapa-${next}`) : 'inicio'; 
}

function choices(items, key) {
  return `<div class="options" role="radiogroup" aria-label="${key === 'device' ? 'Equipamento' : 'Problema'}">${items.map((item, i) => `<button type="button" class="option" role="radio" aria-checked="${state[key] === item}" data-choice="${escapeHTML(item)}" data-key="${key}"><span>${item}</span></button>`).join('')}</div>`;
}

function summaryText() {
  return `Olá! Sou ${state.name} e gostaria de atendimento.
CPF/CNPJ: ${state.cpf}
WhatsApp: ${state.phone}

Equipamento: ${state.device}
Problema: ${state.problem}${state.model ? `
Marca/modelo: ${state.model}` : ''}${state.details ? `
Detalhes: ${state.details}` : ''}

Podem me ajudar?`;
}

function renderTrack() {
  app.innerHTML = `
    <section class="wizard">
      <div class="wizard-top">
        <button class="text-button" data-next="0">← Voltar</button>
      </div>
      <h2>Acompanhar atendimento</h2>
      <p class="subtitle">Digite o número do seu Protocolo (Ex: OS-20231010-ABCD5) para ver o status do seu aparelho.</p>
      <form id="track-form" class="u-flex-col">
        <label class="field" for="protocol">Protocolo</label>
        <input type="text" id="protocol" placeholder="OS-20231010-ABCD5" required oninput="this.value = this.value.toUpperCase()">
        <div class="actions">
          <button class="primary u-w-full" type="submit" id="track-btn">Consultar Status</button>
        </div>
      </form>
      <div id="track-result"></div>
    </section>
  `;

  app.querySelector('#track-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const queryVal = document.querySelector('#protocol').value.trim().toUpperCase();
    const resultDiv = document.querySelector('#track-result');
    const trackBtn = document.querySelector('#track-btn');
    
    // UI Loading state
    trackBtn.disabled = true;
    trackBtn.textContent = 'Consultando...';
    resultDiv.innerHTML = `<div class="u-text-center u-p-16"><div class="spinner u-w-32 u-h-32 u-mx-auto"></div></div>`;
    
    let osList = await fetchOSData(queryVal);
    
    trackBtn.disabled = false;
    trackBtn.textContent = 'Consultar Status';
    
    if (osList.length === 0) {
      resultDiv.innerHTML = `<div class="notice-box error"><svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><p role="status" aria-live="polite">Nenhum atendimento encontrado. Verifique se digitou corretamente.</p></div>`;
      return;
    }
    
    if (osList.length === 1) {
      renderOSDetails(osList[0], resultDiv);
    } else {
      resultDiv.innerHTML = `
        <h3 class="u-mb-16 u-mt-32">Atendimentos encontrados</h3>
        <div class="u-flex-col u-gap-10" id="os-results-list">
          ${osList.map((os, i) => `
            <div class="u-border-line u-bg-surface u-radius-card u-p-16 u-cursor-pointer u-flex u-justify-between u-align-center" data-index="${i}">
              <div>
                <strong class="os-card-title">${escapeHTML(os.protocol)}</strong>
                <p class="os-card-subtitle">${escapeHTML(os.device)}</p>
              </div>
              <div class="u-text-right">
                <span class="os-card-status ${escapeHTML(STATUS.find(s => s.id === os.status)?.cls || '')}">${escapeHTML(STATUS.find(s => s.id === os.status)?.label || os.status)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      window.osListData = osList;
      document.getElementById('os-results-list').addEventListener('click', (ev) => {
        const card = ev.target.closest('[data-index]');
        if (card) {
           renderOSDetails(window.osListData[card.dataset.index], resultDiv);
        }
      });
    }
  });

  function renderOSDetails(osData, resultDiv) {
    const timelineSteps = STATUS.filter(s => s.id !== 'cancelado');
    const isCancelled = osData.status === 'cancelado';
    const currentIndex = timelineSteps.findIndex(s => s.id === osData.status);

    const timelineHTML = isCancelled ? 
      `<div class="u-text-center u-p-16 u-text-danger u-fw-bold">Atendimento Cancelado</div>` :
      `<div class="timeline">
        <div class="timeline-bg"></div>
        <div class="timeline-fill" style="width: ${currentIndex > 0 ? (currentIndex / (timelineSteps.length - 1)) * 100 : 0}%"></div>
        ${timelineSteps.map((step, idx) => `
          <div class="timeline-step">
            <div class="timeline-icon ${idx <= currentIndex ? (idx === timelineSteps.length - 1 ? 'done' : 'active') : 'pending'}">
              ${idx < currentIndex || (idx === currentIndex && idx === timelineSteps.length - 1) ? '✓' : ''}
            </div>
            <span class="timeline-text ${idx === currentIndex ? 'active' : 'pending'}">${escapeHTML(step.label)}</span>
          </div>
        `).join('')}
      </div>`;
    
    const budgetHTML = (osData.budget && currentIndex >= 2) ? 
      `<div class="budget-card">
        <span class="budget-label">Valor do Orçamento</span>
        <h4 class="budget-value">R$ ${parseFloat(osData.budget).toFixed(2).replace('.', ',')}</h4>
      </div>` : '';

    const events = Array.isArray(osData.timeline) ? osData.timeline : [];
    const historyHTML = events.length === 0 ? '' : `
      <div class="track-history">
        <span class="timeline-label">Histórico de movimentações</span>
        <ol class="track-history-list">
          ${events.map(ev => `
            <li class="track-history-item">
              <div class="track-history-head">
                <strong>${escapeHTML(ev.title || 'Atualização')}</strong>
                <time>${formatDateTime(ev.date)}</time>
              </div>
              ${ev.detail ? `<p>${escapeHTML(ev.detail)}</p>` : ''}
            </li>
          `).join('')}
        </ol>
      </div>`;

    resultDiv.innerHTML = `
      ${window.osListData && window.osListData.length > 1 ? '<button class="text-button u-mt-24" id="back-to-list-btn">← Voltar para a lista</button>' : '<div class="u-mt-32"></div>'}
      <div class="summary">
        <div class="summary-header">
          <div>
            <span class="summary-header-label">Protocolo</span>
            <h3 class="summary-header-title">${escapeHTML(osData.protocol)}</h3>
          </div>
          <div class="summary-header-meta">
             <span>Última atualização</span>
             <div>${formatDate(osData.updatedAt)}</div>
          </div>
        </div>
        
        <p class="u-mt-16"><strong>Equipamento:</strong> ${escapeHTML(osData.device)} - ${escapeHTML(osData.problem)}</p>
        ${budgetHTML}
        
        <div class="timeline-container">
          <span class="timeline-label">Acompanhamento</span>
          ${timelineHTML}
        </div>
        ${historyHTML}
      </div>
    `;
    const backBtn = resultDiv.querySelector('#back-to-list-btn');
    if (backBtn) {
       backBtn.addEventListener('click', () => {
         const btn = document.querySelector('#track-btn');
         if(btn) btn.click();
       });
    }
  }

  app.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.next;
    navigate(next === '0' ? 0 : next);
  }));
}

function updateProgress() {
  const progressContainer = document.getElementById('progress');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  
  if (step > 0 && step <= 5) {
    progressContainer.style.opacity = '1';
    progressContainer.style.visibility = 'visible';
    progressBar.style.width = `${(step / 5) * 100}%`;
    progressLabel.textContent = `Triagem — Etapa ${step} de 5`;
  } else {
    progressContainer.style.opacity = '0';
    progressContainer.style.visibility = 'hidden';
    progressBar.style.width = `0%`;
  }
}

function render() {
  updateProgress();

  if (step === 'track') {
    renderTrack();
    return;
  }

  if (!step) {
    app.innerHTML = `<section class="hero">
      <div class="eyebrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>SUA TECNOLOGIA, EM BOAS MÃOS</div>
      <h1>Deu problema?<br><span>Vamos resolver.</span></h1>
      <p class="lead">Conte o que aconteceu com seu equipamento. A gente cuida do próximo passo com você.</p>
      <div class="u-flex u-gap-16 u-w-full u-justify-between" style="flex-wrap:wrap;">
        <button class="primary u-w-full u-max-w-320 u-mx-auto" data-next="1">Novo atendimento</button>
        <button class="text-button u-border-line u-radius-pill u-w-full u-max-w-320 u-mx-auto" data-next="track">Acompanhar atendimento</button>
      </div>
      <p class="micro">Algumas perguntas. Depois, uma conversa no WhatsApp.</p>
    </section>`;
  } else {
    const titles = ['', 'Qual equipamento precisa de ajuda?', 'O que está acontecendo?', 'Quer contar mais algum detalhe?', 'Como podemos chamar você?', 'Tudo certo para continuar.'];
    const subtitles = ['', 'Escolha o equipamento que vamos cuidar.', 'Selecione a opção que melhor descreve o problema.', 'Se souber, esses detalhes ajudam. Você também pode pular esta etapa.', 'Só precisamos do seu nome para começar a conversa.', 'Confira seu resumo antes de abrir a conversa no WhatsApp.'];
    let content = '';
    
    if (step === 1) content = choices(devices, 'device');
    if (step === 2) content = choices(problems[state.device === 'Impressora' ? 'printer' : state.device === 'Outro equipamento' ? 'other' : 'computer'], 'problem');
    if (step === 3) content = `<label class="field" for="model">Marca e modelo <small>· opcional</small></label><input id="model" name="model" maxlength="100" value="${escapeHTML(state.model)}" placeholder="Ex.: Dell Inspiron 15"><label class="field" for="details">O que mais você percebeu? <small>· opcional</small></label><textarea id="details" name="details" maxlength="600" placeholder="Quando começou? Aparece alguma mensagem?">${escapeHTML(state.details)}</textarea><p class="micro">Não inclua senhas ou outras informações sensíveis.</p>`;
    if (step === 4) content = `<label class="field" for="name">Seu nome</label><input id="name" name="name" autocomplete="name" maxlength="80" required value="${escapeHTML(state.name)}" placeholder="Como você prefere ser chamado?"><label class="field" for="cpf">Seu CPF</label><input id="cpf" name="cpf" type="text" inputmode="numeric" required value="${escapeHTML(state.cpf)}" placeholder="000.000.000-00"><label class="field" for="phone">Seu WhatsApp</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required value="${escapeHTML(state.phone)}" placeholder="(00) 00000-0000"><p class="micro">Usaremos este número apenas para enviar atualizações sobre o seu aparelho.</p><input type="text" id="bot_field" name="bot_field" class="u-hidden" tabindex="-1" autocomplete="off">`;
    if (step === 5) {
      const rows = [['Nome', state.name], ['CPF', state.cpf], ['WhatsApp', state.phone], ['Equipamento', state.device], ['Problema', state.problem], ['Marca e modelo', state.model || 'Não informado'], ['Detalhes', state.details || 'Nenhum detalhe adicional']];
      content = `<div class="summary">
        <div class="summary-header">
          <h3 class="summary-header-title" style="font-size: var(--fs-body);">Resumo do atendimento</h3>
          <button type="button" class="text-button u-min-h-auto u-p-0" data-next="1" aria-label="Editar resumo">Editar</button>
        </div>
        <dl class="u-p-0 u-m-0">
          ${rows.map(([label, value]) => `<div class="summary-row"><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}
        </dl>
      </div>`;
    }
    
    const number = SITE_CONFIG?.whatsappNumber || '';
    const configured = /^[1-9]\d{9,14}$/.test(number);
    
    const noticeBoxForStep5 = step === 5 ? (configured 
      ? `<div class="notice-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><p>Ao continuar, um número de Protocolo será gerado e enviaremos seu resumo para nosso WhatsApp.</p></div>` 
      : `<div class="notice-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><p role="status" aria-live="polite">O WhatsApp de atendimento ainda não foi configurado.</p></div>`) 
      : '';
    
    app.innerHTML = `<section class="wizard">
      <div class="wizard-top">
        <button class="text-button u-min-h-auto u-p-0" data-next="${step - 1}">← Voltar</button>
      </div>
      <h2 tabindex="-1">${titles[step]}</h2>
      <p class="subtitle">${subtitles[step]}</p>
      <form>
        ${content}
        ${noticeBoxForStep5}
        <p id="status" role="status" aria-live="polite" class="micro"></p>
        <div class="actions ${step === 5 ? 'u-flex-col' : ''}">
          ${step < 5 ? 
            `<button class="primary u-w-full" type="submit" ${step === 1 && !state.device || step === 2 && !state.problem ? 'disabled' : ''}>${step === 3 ? 'Continuar' : 'Continuar'}</button>` 
            : 
            (configured ? 
              `<button class="primary whatsapp u-w-full" type="button" id="whatsapp-btn">Continuar no WhatsApp ↗</button>
               <button class="copy u-w-full" type="button" id="copy">Copiar resumo</button>` 
              : 
              `<button class="primary u-w-full" type="button" id="copy">Copiar resumo</button>`)
          }
        </div>
      </form>
    </section>`;
    
    if (step < 5) {
      app.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (step === 4) {
          const botField = document.querySelector('#bot_field');
          if (botField && botField.value !== '') {
            return; // honeypot
          }
          if (!state.name.trim()) { 
            document.querySelector('#name').setCustomValidity('Digite seu nome para continuar.'); 
            document.querySelector('#name').reportValidity(); 
            return; 
          }
          if (!isValidCpfCnpj(state.cpf)) {
            document.querySelector('#cpf').setCustomValidity('CPF ou CNPJ inválido.');
            document.querySelector('#cpf').reportValidity();
            return;
          }
          if (!state.phone.trim()) {
            document.querySelector('#phone').setCustomValidity('Digite seu WhatsApp para continuar.');
            document.querySelector('#phone').reportValidity();
            return;
          }
        }
        state.name = state.name.trim(); state.phone = state.phone.trim(); state.model = state.model.trim(); state.details = state.details.trim();
        navigate(step + 1);
      });
    }

    app.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => { 
      if (input.name === 'phone') {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
        if (v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
        input.value = v;
      }
      if (input.name === 'cpf') {
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
      state[input.name] = input.value; 
      input.setCustomValidity(''); 
    }));
    
    // A triagem NAO cria Ordem de Servico. Ela monta o resumo e abre a conversa
    // no WhatsApp; quem registra a OS e informa o protocolo ao cliente e o
    // atendente, pelo painel. Por isso o site publico nao grava nada no banco.
    app.querySelector('#whatsapp-btn')?.addEventListener('click', () => {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(summaryText())}`, '_blank');

      app.querySelector('.wizard').innerHTML = `
        <div class="u-text-center u-py-40">
          <h2 class="u-text-ok u-mb-8">Resumo enviado!</h2>
          <p class="subtitle">Abrimos a conversa no WhatsApp com o seu resumo. Assim que o atendimento for registrado, você recebe o número de protocolo para acompanhar o serviço aqui pelo site.</p>
          <div class="actions">
            <button class="primary" onclick="location.hash=''; location.reload();">Voltar ao Início</button>
          </div>
        </div>
      `;
    });

    app.querySelector('#copy')?.addEventListener('click', async (e) => {
      const status = document.querySelector('#status');
      try {
        await navigator.clipboard.writeText(summaryText());
        status.textContent = 'Resumo copiado. Cole na conversa do WhatsApp.';
        status.style.color = 'var(--ok)';
        e.currentTarget.textContent = 'Copiar resumo novamente';
      } catch {
        status.textContent = 'Não foi possível copiar o resumo automaticamente.';
        status.style.color = 'var(--danger)';
      }
    });
  }
  
  app.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.next;
    navigate(next === 'track' ? 'track' : Number(next));
  }));
  
  app.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.key === 'device' && state.device !== button.dataset.choice) state.problem = '';
    state[button.dataset.key] = button.dataset.choice;
    app.querySelectorAll('[data-choice]').forEach(choice => choice.setAttribute('aria-checked', String(choice === button)));
    app.querySelector('[type=submit]').disabled = false;
  }));
}

let lastStepVal = 0;
let routeVersion = 0;

async function route() {
  const version = ++routeVersion;
  
  let next = 0;
  if (location.hash === '#acompanhar') {
    next = 'track';
  } else {
    next = Number(location.hash.match(/^#etapa-([1-5])$/)?.[1] || 0);
    if (next > 1 && !state.device) next = 1;
    else if (next > 2 && !state.problem) next = 2;
    else if (next > 4 && !state.name.trim()) next = 4;
  }

  const nextVal = next === 'track' ? 6 : next;
  const dir = nextVal < lastStepVal ? 'back' : 'forward';
  document.documentElement.setAttribute('data-dir', dir);
  lastStepVal = nextVal;
  
  step = next;

  const updateDOM = () => {
    render();
    app.querySelector('h2')?.focus({ preventScroll: true });
    window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentTransition = null;

  if (document.startViewTransition && !reduceMotion) {
    if (currentTransition) currentTransition.skipTransition();
    currentTransition = document.startViewTransition(() => {
      updateDOM();
    });
    currentTransition.finished.catch(() => {});
    currentTransition.updateCallbackDone.catch(() => {});
  } else {
    if (app.children.length && !reduceMotion) {
      app.inert = true;
      const moveOut = dir === 'back' ? '24px' : '-24px';
      await app.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${moveOut})` }], { duration: 120, easing: 'ease-in', fill: 'none' }).finished;
      if (version !== routeVersion) return;
    }
    
    updateDOM();
    app.inert = false;
    
    if (!reduceMotion) {
      const moveIn = dir === 'back' ? '-24px' : '24px';
      app.animate([{ opacity: 0, transform: `translateX(${moveIn})` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  }
}

window.addEventListener('hashchange', route);
route();
