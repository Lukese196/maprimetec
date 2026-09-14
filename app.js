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
function updateTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.textContent = dark ? '☀' : '☾';
  themeButton.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
}
themeButton.addEventListener('click', () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('ma-theme', document.documentElement.dataset.theme); } catch { /* Tema funciona mesmo sem armazenamento. */ }
  updateTheme();
});
updateTheme();
function navigate(next) { location.hash = next ? `etapa-${next}` : 'inicio'; }
function choices(items, key) {
  return `<div class="options" role="radiogroup" aria-label="${key === 'device' ? 'Equipamento' : 'Problema'}">${items.map((item, i) => `<button type="button" class="option" role="radio" aria-checked="${state[key] === item}" data-choice="${escapeHTML(item)}" data-key="${key}">${key === 'device' ? `<span class="device-icon" aria-hidden="true">${['▱', '▣', '▤', '✦'][i]}</span>` : ''}<span>${item}</span></button>`).join('')}</div>`;
}
function summaryText() {
  return `Olá! Sou ${state.name} e gostaria de atendimento.\n\nEquipamento: ${state.device}\nProblema: ${state.problem}${state.model ? `\nMarca/modelo: ${state.model}` : ''}${state.details ? `\nDetalhes: ${state.details}` : ''}\n\nPodem me ajudar?`;
}
function render() {
  if (!step) {
    app.innerHTML = `<section class="hero"><div><div class="eyebrow">SUA TECNOLOGIA, EM BOAS MÃOS</div><h1>Deu problema?<br><span>Vamos resolver.</span></h1><p class="lead">Conte o que aconteceu com seu equipamento. A gente cuida do próximo passo com você.</p><button class="primary" data-next="1">Iniciar atendimento <span aria-hidden="true">↗</span></button><p class="micro">Algumas perguntas. Depois, uma conversa no WhatsApp.</p></div><div class="portrait"><span class="hello">Oi! Vamos começar?</span><i class="pixel" aria-hidden="true"></i><div class="mascot"><img src="marca/variacoes/equipamento.svg" alt="Mascote da MA PRIME TEC apresentando um notebook"></div><i class="pixel two" aria-hidden="true"></i><span class="caption">Tecnologia tem solução. E tem quem cuide.</span></div></section><div class="steps-strip"><span><b>01 · Conte</b>O que precisa de cuidado</span><span><b>02 · Confira</b>Seu resumo de atendimento</span><span><b>03 · Converse</b>Continue pelo WhatsApp ↗</span></div>`;
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
      content = `<dl class="summary">${rows.map(([label, value, target]) => `<div class="summary-row"><dt>${label}</dt><dd>${escapeHTML(value)}</dd><button type="button" class="text-button" data-next="${target}" aria-label="Editar ${label.toLowerCase()}">Editar</button></div>`).join('')}</dl><p class="notice">Ao continuar, seu resumo será colocado na mensagem. Você confirma o envio dentro do WhatsApp.</p>`;
    }
    const number = window.SITE_CONFIG?.whatsappNumber || '';
    const configured = /^[1-9]\d{9,14}$/.test(number);
    app.innerHTML = `<section class="wizard"><div class="wizard-top"><button class="text-button" data-next="${step - 1}">← Voltar</button><span>ETAPA ${step} DE 5</span></div><div class="progress" aria-hidden="true">${[1,2,3,4,5].map(n => `<i class="${n <= step ? 'done' : ''}"></i>`).join('')}</div><h2 tabindex="-1">${titles[step]}</h2><p class="subtitle">${subtitles[step]}</p><form>${content}<p id="status" role="status" class="notice"></p><div class="actions">${step < 5 ? `<button class="primary" type="submit" ${step === 1 && !state.device || step === 2 && !state.problem ? 'disabled' : ''}>${step === 3 ? 'Continuar' : 'Continuar'} <span aria-hidden="true">→</span></button>` : `<button class="copy" type="button" id="copy">Copiar resumo</button>${configured ? `<a class="primary" href="https://wa.me/${number}?text=${encodeURIComponent(summaryText())}" target="_blank" rel="noopener noreferrer">Continuar no WhatsApp ↗</a>` : ''}`}</div>${step === 5 && !configured ? '<p class="notice">O WhatsApp de atendimento ainda não foi configurado. Por enquanto, você pode copiar seu resumo.</p>' : ''}</form></section>`;
    app.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      if (step === 4 && !state.name.trim()) { document.querySelector('#name').setCustomValidity('Digite seu nome para continuar.'); document.querySelector('#name').reportValidity(); return; }
      state.name = state.name.trim(); state.model = state.model.trim(); state.details = state.details.trim();
      if (step < 5) navigate(step + 1);
    });
    const mascot = document.createElement('img');
    mascot.src = `marca/variacoes/${stepMascots[step]}.svg`;
    mascot.alt = '';
    mascot.width = 112;
    mascot.height = 112;
    mascot.className = 'step-mascot';
    app.querySelector('h2').before(mascot);
    app.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => { state[input.name] = input.value; input.setCustomValidity(''); }));
    app.querySelector('#copy')?.addEventListener('click', async () => {
      const status = document.querySelector('#status');
      try { await navigator.clipboard.writeText(summaryText()); status.textContent = 'Resumo copiado. Você já pode colar na conversa.'; status.className = 'notice success'; }
      catch { status.textContent = 'Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.'; const text = document.createElement('textarea'); text.readOnly = true; text.value = summaryText(); text.setAttribute('aria-label', 'Resumo para copiar'); status.append(text); text.focus(); text.select(); }
    });
  }
  app.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.next))));
  app.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.key === 'device' && state.device !== button.dataset.choice) state.problem = '';
    state[button.dataset.key] = button.dataset.choice;
    app.querySelectorAll('[data-choice]').forEach(choice => choice.setAttribute('aria-checked', String(choice === button)));
    app.querySelector('[type=submit]').disabled = false;
  }));
  app.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...app.querySelectorAll('[data-choice]')];
    const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (options.indexOf(button) + delta + options.length) % options.length;
    options[index].focus(); options[index].click();
  }));
}
let routeVersion = 0;
async function route() {
  const version = ++routeVersion;
  let next = Number(location.hash.match(/^#etapa-([1-5])$/)?.[1] || 0);
  if (next > 1 && !state.device) next = 1;
  else if (next > 2 && !state.problem) next = 2;
  else if (next > 4 && !state.name.trim()) next = 4;
  const direction = next >= step ? 1 : -1;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (app.children.length && !reduceMotion) {
    app.inert = true;
    await app.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction * 12}px)` }], { duration: 120, easing: 'ease-in', fill: 'none' }).finished;
    if (version !== routeVersion) return;
  }
  step = next;
  const hash = next ? `#etapa-${next}` : '#inicio';
  if (location.hash !== hash) history.replaceState(null, '', hash);
  render();
  app.inert = false;
  if (!reduceMotion) app.animate([{ opacity: 0, transform: `translateX(${direction * 16}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
  app.querySelector('h2')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();




