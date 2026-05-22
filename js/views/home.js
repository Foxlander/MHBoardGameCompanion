import { State } from '../state.js';
import { themePickerHtml, bindThemePicker } from '../theme.js';

export function renderHome(app, onSessionSelect) {
  const sessions = State.getSessions();

  app.innerHTML = `
    <header class="app-header">
      <span class="app-title">MHW Companion</span>
    </header>
    ${themePickerHtml()}
    <div class="main-content">
      <div class="home-screen">
        <div class="home-title">Monster Hunter World</div>
        <div class="home-subtitle">Board Game Companion</div>

        ${sessions.length > 0 ? `
          <div class="home-section-title">Parties sauvegardées</div>
          <div class="session-list">
            ${sessions.map(s => `
              <div class="session-card" data-id="${s.id}">
                <div>
                  <div class="session-card-name">${esc(s.name)}</div>
                  <div class="session-card-hunters">${s.hunters.map(h => esc(h.name)).join(', ')}</div>
                </div>
                <button class="session-card-delete" data-delete="${s.id}" title="Supprimer">✕</button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <button class="btn-primary" id="btn-new-session">+ Nouvelle Partie</button>
      </div>
    </div>

    <div id="modal-container"></div>
  `;

  bindThemePicker(app);
  app.querySelector('#btn-new-session').addEventListener('click', () => showNewSessionModal(app, onSessionSelect));

  app.querySelectorAll('.session-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-delete]')) return;
      onSessionSelect(card.dataset.id);
    });
  });

  app.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Supprimer cette partie ?`)) {
        State.deleteSession(btn.dataset.delete);
        renderHome(app, onSessionSelect);
      }
    });
  });
}

function showNewSessionModal(app, onSessionSelect) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Nouvelle Partie</div>
      <div class="input-group">
        <label class="input-label">Nom de la partie</label>
        <input class="input-field" id="session-name" placeholder="Ex: Campagne #1" maxlength="30">
      </div>
      <div class="input-group">
        <label class="input-label">Chasseurs (1–4)</label>
        <div class="hunter-inputs">
          ${[1,2,3,4].map(i => `
            <div class="hunter-input-row">
              <span class="hunter-input-num">${i}.</span>
              <input class="input-field hunter-input-field" data-hunter="${i}" placeholder="Nom du chasseur ${i}${i===1?' (requis)':' (optionnel)'}" maxlength="20">
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Annuler</button>
        <button class="btn-primary" id="modal-confirm">Créer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#session-name').focus();

  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    const name = modal.querySelector('#session-name').value.trim();
    const hunters = [...modal.querySelectorAll('[data-hunter]')].map(i => i.value.trim()).filter(Boolean);

    if (!name) { modal.querySelector('#session-name').focus(); return; }
    if (hunters.length === 0) { modal.querySelector('[data-hunter="1"]').focus(); return; }

    const session = State.createSession(name, hunters);
    modal.remove();
    onSessionSelect(session.id);
  });
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
