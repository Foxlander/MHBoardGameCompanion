import { State } from './state.js';
import { renderHome } from './views/home.js';
import { renderChest } from './views/chest.js';
import { renderForge } from './views/forge.js';
import { renderEquipment } from './views/equipment.js';

const app = document.getElementById('app');

let currentSessionId = null;
let currentHunterIndex = 0;
let currentSubTab = 'chest';

function goHome() {
  currentSessionId = null;
  currentHunterIndex = 0;
  currentSubTab = 'chest';
  renderHome(app, (sessionId) => {
    currentSessionId = sessionId;
    renderSession();
  });
}

function renderSession() {
  const session = State.getSession(currentSessionId);
  if (!session) { goHome(); return; }

  const hunter = session.hunters[currentHunterIndex];
  if (!hunter) { currentHunterIndex = 0; }

  const hunterTabsHtml = session.hunters.map((h, i) => `
    <button class="hunter-tab ${i === currentHunterIndex ? 'active' : ''}" data-hi="${i}">
      <span class="hunter-tab-name">${esc(h.name)}</span>
    </button>
  `).join('');

  app.innerHTML = `
    <header class="app-header">
      <button class="btn-icon" id="btn-back" title="Retour">←</button>
      <span class="app-title">${esc(session.name)}</span>
    </header>
    <nav class="hunter-tabs">${hunterTabsHtml}</nav>
    <nav class="sub-tabs">
      <button class="sub-tab ${currentSubTab === 'chest'     ? 'active' : ''}" data-sub="chest">
        <span class="sub-tab-icon">📦</span> Coffre
      </button>
      <button class="sub-tab ${currentSubTab === 'forge'     ? 'active' : ''}" data-sub="forge">
        <span class="sub-tab-icon">🔨</span> Forge
      </button>
      <button class="sub-tab ${currentSubTab === 'equipment' ? 'active' : ''}" data-sub="equipment">
        <span class="sub-tab-icon">⚔️</span> Équipement
      </button>
    </nav>
    <div class="main-content" id="tab-content"></div>
  `;

  app.querySelector('#btn-back').addEventListener('click', goHome);

  app.querySelectorAll('.hunter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentHunterIndex = parseInt(tab.dataset.hi);
      renderSession();
    });
  });

  app.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentSubTab = tab.dataset.sub;
      renderSubTab();
      app.querySelectorAll('.sub-tab').forEach(t => t.classList.toggle('active', t.dataset.sub === currentSubTab));
    });
  });

  renderSubTab();
}

function renderSubTab() {
  const content = app.querySelector('#tab-content');
  if (!content) return;

  const session = State.getSession(currentSessionId);
  const hunterId = session?.hunters[currentHunterIndex]?.id;
  if (!hunterId) return;

  if (currentSubTab === 'chest') {
    renderChest(content, currentSessionId, hunterId);
  } else if (currentSubTab === 'forge') {
    renderForge(content, currentSessionId, hunterId);
  } else if (currentSubTab === 'equipment') {
    renderEquipment(content, currentSessionId, hunterId);
  }
}

goHome();
