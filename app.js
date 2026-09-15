import { db, collection, addDoc, getDocs, query, where } from './config.js';

const app = document.querySelector('#app');
const themeButton = document.querySelector('#theme');
const state = { device: '', problem: '', model: '', details: '', name: '', phone: '' };
const devices = ['Notebook', 'Computador', 'Impressora', 'Outro equipamento'];
const problems = {
  computer: ['Não liga', 'Está lento ou travando', 'Problema na tela', 'Internet ou Wi-Fi', 'Quero fazer uma melhoria', 'Outro problema', 'Não sei explicar'],
  printer: ['Não imprime', 'Papel preso', 'Impressão com falhas', 'Não conecta', 'Outro problema', 'Não sei explicar'],
  other: ['Não liga', 'Não funciona como deveria', 'Outro problema', 'Não sei explicar']
};
let step = 0;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function saveClient(clientData) {
  try {
    const q = query(collection(db, "clients"), where("phone", "==", clientData.phone));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "clients"), clientData);
    }
  } catch (e) {
    console.error("Error saving client: ", e);
  }
}

async function saveOS(osData) {
  try {
    const docRef = await addDoc(collection(db, "os_list"), osData);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

async function getOS(protocol) {
  const q = query(collection(db, "os_list"), where("protocol", "==", protocol));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

async function getOSsByCPF(cpf) {
  const q = query(collection(db, "os_list"), where("clientCpf", "==", cpf));
  const querySnapshot = await getDocs(q);
  const results = [];
  querySnapshot.forEach(doc => {
    results.push(doc.data());
  });
  return results;
}

function generateProtocol() {
  return 'OS-' + Math.floor(1000 + Math.random() * 9000);
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

function summaryText(protocol) {
  return `Olá! Sou ${state.name} e gostaria de atendimento.\nProtocolo: ${protocol}\n\nEquipamento: ${state.device}\nProblema: ${state.problem}${state.model ? `\nMarca/modelo: ${state.model}` : ''}${state.details ? `\nDetalhes: ${state.details}` : ''}\n\nPodem me ajudar?`;
}

function renderTrack() {
  app.innerHTML = `
    <section class="wizard">
      <div class="wizard-top">
        <button class="text-button" data-next="0">← Voltar</button>
      </div>
      <h2>Acompanhar atendimento</h2>
      <p class="subtitle">Digite o número do seu Protocolo (Ex: OS-1234) ou CPF para ver o status do seu aparelho.</p>
      <form id="track-form" class="u-flex-col">
        <label class="field" for="protocol">Protocolo ou CPF</label>
        <input type="text" id="protocol" placeholder="OS-1234 ou 000.000.000-00" required oninput="this.value = this.value.toUpperCase()">
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
    
    const isCpf = /^[0-9.-]{11,14}$/.test(queryVal);
    
    let osList = [];
    if (isCpf) {
      const cpfDigits = queryVal.replace(/\D/g, '');
      osList = await getOSsByCPF(cpfDigits);
    } else {
      const osData = await getOS(queryVal);
      if (osData) osList = [osData];
    }
    
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
        <div class="u-flex-col u-gap-10">
          ${osList.map((os, i) => `
            <div class="u-border-line u-bg-surface u-radius-card u-p-16 u-cursor-pointer u-flex u-justify-between u-align-center" onclick="window.showOSDetails(${i})">
              <div>
                <strong class="os-card-title">${os.protocol}</strong>
                <p class="os-card-subtitle">${os.device}</p>
              </div>
              <div class="u-text-right">
                <span class="os-card-status">${os.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      window.osListData = osList;
      window.showOSDetails = (index) => {
        renderOSDetails(window.osListData[index], resultDiv);
      };
    }
  });

  function renderOSDetails(osData, resultDiv) {
    const timelineSteps = ['Aberto', 'Em Análise', 'Orçamento Enviado', 'Em Reparo', 'Finalizado'];
    const isCancelled = osData.status === 'Cancelado';
    const currentIndex = timelineSteps.indexOf(osData.status);

    const timelineHTML = isCancelled ? 
      `<div class="u-text-center u-p-16 u-text-danger u-fw-bold">Atendimento Cancelado</div>` :
      `<div class="timeline">
        <div class="timeline-bg"></div>
        <div class="timeline-fill" style="width: ${currentIndex > 0 ? (currentIndex / (timelineSteps.length - 1)) * 100 : 0}%"></div>
        ${timelineSteps.map((stepName, idx) => `
          <div class="timeline-step">
            <div class="timeline-icon ${idx <= currentIndex ? (idx === timelineSteps.length - 1 ? 'done' : 'active') : 'pending'}">
              ${idx < currentIndex || (idx === currentIndex && idx === timelineSteps.length - 1) ? '✓' : ''}
            </div>
            <span class="timeline-text ${idx === currentIndex ? 'active' : 'pending'}">${stepName}</span>
          </div>
        `).join('')}
      </div>`;
    
    const budgetHTML = (osData.budget && currentIndex >= 2) ? 
      `<div class="budget-card">
        <span class="budget-label">Valor do Orçamento</span>
        <h4 class="budget-value">R$ ${parseFloat(osData.budget).toFixed(2).replace('.', ',')}</h4>
      </div>` : '';

    resultDiv.innerHTML = `
      ${window.osListData && window.osListData.length > 1 ? '<button class="text-button u-mt-24" onclick="document.querySelector(\'#track-form\').dispatchEvent(new Event(\'submit\'))">← Voltar para a lista</button>' : '<div class="u-mt-32"></div>'}
      <div class="summary">
        <div class="summary-header">
          <div>
            <span class="summary-header-label">Protocolo</span>
            <h3 class="summary-header-title">${osData.protocol}</h3>
          </div>
          <div class="summary-header-meta">
             <span>Última atualização</span>
             <div>${new Date(osData.updatedAt).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        
        <p class="u-mt-16"><strong>Equipamento:</strong> ${osData.device} - ${osData.problem}</p>
        ${budgetHTML}
        
        <div class="timeline-container">
          <span class="timeline-label">Acompanhamento</span>
          ${timelineHTML}
        </div>
      </div>
    `;
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
    if (step === 4) content = `<label class="field" for="name">Seu nome</label><input id="name" name="name" autocomplete="name" maxlength="80" required value="${escapeHTML(state.name)}" placeholder="Como você prefere ser chamado?"><label class="field" for="phone">Seu WhatsApp</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required value="${escapeHTML(state.phone)}" placeholder="(00) 00000-0000"><p class="micro">Usaremos este número apenas para enviar atualizações sobre o seu aparelho.</p><input type="text" id="bot_field" name="bot_field" class="u-hidden" tabindex="-1" autocomplete="off">`;
    if (step === 5) {
      const rows = [['Nome', state.name], ['WhatsApp', state.phone], ['Equipamento', state.device], ['Problema', state.problem], ['Marca e modelo', state.model || 'Não informado'], ['Detalhes', state.details || 'Nenhum detalhe adicional']];
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
    
    const number = window.SITE_CONFIG?.whatsappNumber || '';
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
      state[input.name] = input.value; 
      input.setCustomValidity(''); 
    }));
    
    // Final WhatsApp Action
    app.querySelector('#whatsapp-btn')?.addEventListener('click', async () => {
      // Create OS
      const protocol = generateProtocol();
      const osData = {
        protocol, client: state.name, phone: state.phone, device: state.device, model: state.model, problem: state.problem,
        details: state.details, status: 'Aberto', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), action: 'OS Criada', note: 'OS gerada pelo site público.' }]
      };
      await saveClient({ name: state.name, phone: state.phone, createdAt: new Date().toISOString() });
      await saveOS(osData);

      const text = summaryText(protocol);
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
      
      app.querySelector('.wizard').innerHTML = `
        <div class="u-text-center u-py-40">
          <h2 class="u-text-ok u-mb-8">Protocolo Gerado!</h2>
          <p class="u-fw-bold u-mb-20" style="font-size: var(--fs-display);">${protocol}</p>
          <p class="subtitle">Anote este número. Você pode usá-lo para acompanhar o status do seu serviço na página inicial.</p>
          <div class="actions">
            <button class="primary" onclick="location.hash=''; location.reload();">Voltar ao Início</button>
          </div>
        </div>
      `;
    });

    app.querySelector('#copy')?.addEventListener('click', async () => {
      const status = document.querySelector('#status');
      const protocol = generateProtocol();
      const osData = {
        protocol, client: state.name, phone: state.phone, device: state.device, model: state.model, problem: state.problem,
        details: state.details, status: 'Aberto', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        history: [{ date: new Date().toISOString(), action: 'OS Criada', note: 'OS gerada pelo site público.' }]
      };
      await saveClient({ name: state.name, phone: state.phone, createdAt: new Date().toISOString() });
      await saveOS(osData);
      try { 
        await navigator.clipboard.writeText(summaryText(protocol)); 
        status.textContent = `Resumo copiado (Protocolo: ${protocol}). Cole na conversa.`; 
        status.style.color = 'var(--ok)'; 
      }
      catch { 
        status.textContent = 'Não foi possível copiar automaticamente.'; 
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

  if (document.startViewTransition && !reduceMotion) {
    document.startViewTransition(() => {
      updateDOM();
    });
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
