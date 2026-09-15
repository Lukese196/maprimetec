const app = document.querySelector('#app');
const themeButton = document.querySelector('#theme');
const state = { device: '', problem: '', model: '', details: '', name: '' };
const devices = ['Notebook', 'Computador', 'Impressora', 'Outro equipamento'];
const problems = {
  computer: ['Não liga', 'Está lento ou travando', 'Problema na tela', 'Internet ou Wi-Fi', 'Quero fazer uma melhoria', 'Outro problema', 'Não sei explicar'],
  printer: ['Não imprime', 'Papel preso', 'Impressão com falhas', 'Não conecta', 'Outro problema', 'Não sei explicar'],
  other: ['Não liga', 'Não funciona como deveria', 'Outro problema', 'Não sei explicar']
};
let step = 0;
const stepMascots = ['', 'equipamento', 'duvida', 'detalhes', 'atento', 'alegre'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// --- DATABASE MOCK (LocalStorage) ---
function saveOS(osData) {
  const osList = JSON.parse(localStorage.getItem('maprime_os_list') || '[]');
  osList.push(osData);
  localStorage.setItem('maprime_os_list', JSON.stringify(osList));
}
function getOS(protocol) {
  const osList = JSON.parse(localStorage.getItem('maprime_os_list') || '[]');
  return osList.find(os => os.protocol === protocol);
}
function generateProtocol() {
  return 'OS-' + Math.floor(1000 + Math.random() * 9000);
}
// ------------------------------------

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

function navigate(next) { location.hash = next ? (next === 'track' ? 'acompanhar' : `etapa-${next}`) : 'inicio'; }

function choices(items, key) {
  return `<div class="options" role="radiogroup" aria-label="${key === 'device' ? 'Equipamento' : 'Problema'}">${items.map((item, i) => `<button type="button" class="option" role="radio" aria-checked="${state[key] === item}" data-choice="${escapeHTML(item)}" data-key="${key}">${key === 'device' ? `<span class="device-icon" aria-hidden="true">${['▱', '▣', '▤', '✦'][i]}</span>` : ''}<span>${item}</span></button>`).join('')}</div>`;
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
      <p class="subtitle">Digite o número do seu Protocolo (Ex: OS-1234) para ver o status do seu aparelho.</p>
      <form id="track-form" style="max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
        <label class="field" for="protocol" style="text-align: left;">Número do Protocolo</label>
        <input type="text" id="protocol" placeholder="Ex: OS-1234" required style="font-size: 18px; text-transform: uppercase;" oninput="this.value = this.value.toUpperCase()">
        <button class="primary" type="submit" style="margin-top: 10px;">Consultar Status</button>
      </form>
      <div id="track-result" style="margin-top: 30px;"></div>
    </section>
  `;

  app.querySelector('#track-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const protocol = document.querySelector('#protocol').value.trim().toUpperCase();
    const resultDiv = document.querySelector('#track-result');
    const osData = getOS(protocol);

    if (!osData) {
      resultDiv.innerHTML = `<div style="text-align:center; padding: 20px;"><img src="marca/variacoes/duvida.svg" width="80" style="margin-bottom:10px;"><p class="error" style="padding: 15px; background: #ffebeb; border-radius: 12px; color: #d32f2f;">Protocolo não encontrado. Verifique se digitou corretamente.</p></div>`;
      return;
    }

    const timelineSteps = ['Aberto', 'Em Análise', 'Orçamento Enviado', 'Em Reparo', 'Finalizado'];
    const isCancelled = osData.status === 'Cancelado';
    const currentIndex = timelineSteps.indexOf(osData.status);

    const timelineHTML = isCancelled ? 
      `<div style="text-align:center; padding: 20px; color: #ef4444; font-weight:bold;">Atendimento Cancelado</div>` :
      `<div style="display: flex; justify-content: space-between; position: relative; margin-top: 30px; margin-bottom: 20px;">
        <div style="position: absolute; top: 10px; left: 10px; right: 10px; height: 4px; background: var(--line); z-index: 1;"></div>
        <div style="position: absolute; top: 10px; left: 10px; width: ${currentIndex > 0 ? (currentIndex / (timelineSteps.length - 1)) * 100 : 0}%; height: 4px; background: var(--blue); z-index: 2; transition: width 0.5s ease;"></div>
        
        ${timelineSteps.map((stepName, idx) => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 3;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${idx <= currentIndex ? (idx === timelineSteps.length - 1 ? 'var(--green)' : 'var(--blue)') : 'var(--surface)'}; border: 4px solid var(--bg); display: flex; align-items: center; justify-content: center; color: white;">
              ${idx < currentIndex || (idx === currentIndex && idx === timelineSteps.length - 1) ? '✓' : ''}
            </div>
            <span style="font-size: 11px; font-weight: ${idx === currentIndex ? '700' : '500'}; color: ${idx <= currentIndex ? 'var(--text)' : 'var(--muted)'}; text-align: center; max-width: 60px; line-height: 1.2;">
              ${stepName}
            </span>
          </div>
        `).join('')}
      </div>`;
    
    resultDiv.innerHTML = `
      <div class="summary" style="border: 1px solid var(--line); padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">Protocolo</span>
            <h3 style="margin: 4px 0 0 0; font-size: 22px; color: var(--text);">${osData.protocol}</h3>
          </div>
          <div style="text-align: right;">
             <span style="font-size: 11px; color: var(--muted);">Última atualização</span>
             <div style="font-size: 13px; font-weight: 500;">${new Date(osData.updatedAt).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        
        <p style="margin: 16px 0 0 0; color: var(--muted); font-size: 14px;"><strong>Equipamento:</strong> ${osData.device} - ${osData.problem}</p>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--line);">
          <span style="font-size: 12px; color: var(--muted); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Acompanhamento</span>
          ${timelineHTML}
        </div>
      </div>
    `;
  });

  app.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.next;
    navigate(next === '0' ? 0 : next);
  }));
}

function render() {
  if (step === 'track') {
    renderTrack();
    return;
  }

  if (!step) {
    app.innerHTML = `<section class="hero">
      <div>
        <div class="eyebrow">SUA TECNOLOGIA, EM BOAS MÃOS</div>
        <h1>Deu problema?<br><span>Vamos resolver.</span></h1>
        <p class="lead">Conte o que aconteceu com seu equipamento. A gente cuida do próximo passo com você.</p>
        <div style="display:flex; gap:12px; margin-top:22px; flex-wrap:wrap">
          <button class="primary" style="margin-top:0" data-next="1">Iniciar atendimento <span aria-hidden="true">↗</span></button>
          <button class="text-button" style="border:1px solid var(--line); border-radius:99px; padding:15px 26px; color:var(--text); font-weight:600" data-next="track">Acompanhar OS</button>
        </div>
        <p class="micro" style="margin-top:17px">Algumas perguntas. Depois, uma conversa no WhatsApp.</p>
      </div>
      <div class="portrait">
        <span class="hello">Oi! Vamos começar?</span>
        <i class="pixel" aria-hidden="true"></i>
        <div class="mascot"><img src="marca/variacoes/equipamento.svg" alt="Mascote da MA PRIME TEC apresentando um notebook"></div>
        <i class="pixel two" aria-hidden="true"></i>
        <span class="caption">Tecnologia tem solução. E tem quem cuide.</span>
      </div>
    </section>
    <div class="steps-strip">
      <span><b>01 · Conte</b>O que precisa de cuidado</span>
      <span><b>02 · Confira</b>Seu resumo de atendimento</span>
      <span><b>03 · Converse</b>Continue pelo WhatsApp ↗</span>
    </div>`;
  } else {
    const titles = ['', 'Qual equipamento precisa de ajuda?', 'O que está acontecendo?', 'Quer contar mais algum detalhe?', 'Como podemos chamar você?', 'Tudo certo para continuar.'];
    const subtitles = ['', 'Escolha o equipamento que vamos cuidar.', 'Selecione a opção que melhor descreve o problema.', 'Se souber, esses detalhes ajudam. Você também pode pular esta etapa.', 'Só precisamos do seu nome para começar a conversa.', 'Confira seu resumo antes de abrir a conversa no WhatsApp.'];
    let content = '';
    
    if (step === 1) content = choices(devices, 'device');
    if (step === 2) content = choices(problems[state.device === 'Impressora' ? 'printer' : state.device === 'Outro equipamento' ? 'other' : 'computer'], 'problem');
    if (step === 3) content = `<label class="field" for="model">Marca e modelo <small>· opcional</small></label><input id="model" name="model" maxlength="100" value="${escapeHTML(state.model)}" placeholder="Ex.: Dell Inspiron 15"><label class="field" for="details">O que mais você percebeu? <small>· opcional</small></label><textarea id="details" name="details" maxlength="600" placeholder="Quando começou? Aparece alguma mensagem?">${escapeHTML(state.details)}</textarea><p class="micro">Não inclua senhas ou outras informações sensíveis.</p>`;
    if (step === 4) content = `<label class="field" for="name">Seu nome</label><input id="name" name="name" autocomplete="name" maxlength="80" required value="${escapeHTML(state.name)}" placeholder="Como você prefere ser chamado?"><p class="micro">A conversa continua pelo seu WhatsApp. Não precisamos pedir seu telefone aqui.</p>`;
    if (step === 5) {
      const rows = [['Nome', state.name, 4], ['Equipamento', state.device, 1], ['Problema', state.problem, 2], ['Marca e modelo', state.model || 'Não informado', 3], ['Detalhes', state.details || 'Nenhum detalhe adicional', 3]];
      content = `<dl class="summary">${rows.map(([label, value, target]) => `<div class="summary-row"><dt>${label}</dt><dd>${escapeHTML(value)}</dd><button type="button" class="text-button" data-next="${target}" aria-label="Editar ${label.toLowerCase()}">Editar</button></div>`).join('')}</dl><p class="notice">Ao continuar, um número de Protocolo será gerado e enviaremos seu resumo para nosso WhatsApp.</p>`;
    }
    
    const number = window.SITE_CONFIG?.whatsappNumber || '';
    const configured = /^[1-9]\d{9,14}$/.test(number);
    
    app.innerHTML = `<section class="wizard">
      <div class="wizard-top">
        <button class="text-button" data-next="${step - 1}">← Voltar</button>
        <span>ETAPA ${step} DE 5</span>
      </div>
      <div class="progress" aria-hidden="true">${[1,2,3,4,5].map(n => `<i class="${n <= step ? 'done' : ''}"></i>`).join('')}</div>
      <h2 tabindex="-1">${titles[step]}</h2>
      <p class="subtitle">${subtitles[step]}</p>
      <form>
        ${content}
        <p id="status" role="status" class="notice"></p>
        <div class="actions">
          ${step < 5 ? 
            `<button class="primary" type="submit" ${step === 1 && !state.device || step === 2 && !state.problem ? 'disabled' : ''}>${step === 3 ? 'Continuar' : 'Continuar'} <span aria-hidden="true">→</span></button>` 
            : 
            `<button class="copy" type="button" id="copy">Copiar resumo</button>
             ${configured ? `<button class="primary whatsapp" type="button" id="whatsapp-btn" style="background: var(--green);">Concluir pelo WhatsApp ↗</button>` : ''}`
          }
        </div>
        ${step === 5 && !configured ? '<p class="notice error">O WhatsApp de atendimento ainda não foi configurado.</p>' : ''}
      </form>
    </section>`;
    
    if (step < 5) {
      app.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (step === 4 && !state.name.trim()) { 
          document.querySelector('#name').setCustomValidity('Digite seu nome para continuar.'); 
          document.querySelector('#name').reportValidity(); 
          return; 
        }
        state.name = state.name.trim(); state.model = state.model.trim(); state.details = state.details.trim();
        navigate(step + 1);
      });
    }

    const mascot = document.createElement('img');
    mascot.src = `marca/variacoes/${stepMascots[step]}.svg`;
    mascot.alt = '';
    mascot.width = 112;
    mascot.height = 112;
    mascot.className = 'step-mascot';
    app.querySelector('h2').before(mascot);
    
    app.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => { 
      state[input.name] = input.value; 
      input.setCustomValidity(''); 
    }));
    
    // Final WhatsApp Action
    app.querySelector('#whatsapp-btn')?.addEventListener('click', () => {
      // Create OS
      const protocol = generateProtocol();
      const osData = {
        protocol,
        client: state.name,
        device: state.device,
        model: state.model,
        problem: state.problem,
        details: state.details,
        status: 'Aberto',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveOS(osData);

      // Open WhatsApp
      const text = summaryText(protocol);
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
      
      // Feedback
      app.querySelector('.wizard').innerHTML = `
        <div style="text-align:center; padding: 40px 0;">
          <h2 style="color: var(--green); margin-bottom: 8px;">Protocolo Gerado!</h2>
          <p style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">${protocol}</p>
          <p class="subtitle">Anote este número. Você pode usá-lo para acompanhar o status do seu serviço na página inicial.</p>
          <button class="primary" style="margin-top:20px;" onclick="location.hash=''; location.reload();">Voltar ao Início</button>
        </div>
      `;
    });

    app.querySelector('#copy')?.addEventListener('click', async () => {
      const status = document.querySelector('#status');
      const protocol = generateProtocol();
      saveOS({
        protocol, client: state.name, device: state.device, model: state.model, problem: state.problem,
        details: state.details, status: 'Aberto', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      try { 
        await navigator.clipboard.writeText(summaryText(protocol)); 
        status.textContent = `Resumo copiado (Protocolo: ${protocol}). Cole na conversa.`; 
        status.className = 'notice success'; 
      }
      catch { 
        status.textContent = 'Não foi possível copiar automaticamente.'; 
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

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (app.children.length && !reduceMotion) {
    app.inert = true;
    await app.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(-12px)` }], { duration: 120, easing: 'ease-in', fill: 'none' }).finished;
    if (version !== routeVersion) return;
  }
  
  step = next;
  render();
  app.inert = false;
  
  if (!reduceMotion) app.animate([{ opacity: 0, transform: `translateX(16px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
  app.querySelector('h2')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
