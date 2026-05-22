import { COMPONENTS } from '../data.js';
import { State } from '../state.js';

export function renderChest(container, sessionId, hunterId) {
  const session = State.getSession(sessionId);
  const hunter = session?.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const byCategory = {};
  for (const c of COMPONENTS) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  const html = Object.entries(byCategory).map(([cat, items]) => {
    const total = items.reduce((sum, c) => sum + (hunter.chest[c.id] || 0), 0);
    return `
      <div class="chest-section">
        <div class="section-header" data-cat="${esc(cat)}">
          <span class="section-header-title">${esc(cat)}</span>
          <span class="section-header-count">${total > 0 ? total : ''}</span>
          <span class="section-chevron open">▼</span>
        </div>
        <div class="section-body" data-body="${esc(cat)}">
          <div class="component-grid">
            ${items.map(c => {
              const qty = hunter.chest[c.id] || 0;
              return `
                <div class="component-item">
                  <span class="component-name">${esc(c.name)}</span>
                  <div class="qty-control">
                    <button class="qty-btn minus" data-id="${c.id}" data-delta="-1">−</button>
                    <span class="qty-value ${qty > 0 ? 'nonzero' : ''}" data-qty="${c.id}">${qty}</span>
                    <button class="qty-btn plus" data-id="${c.id}" data-delta="1">+</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Collapse toggle
  container.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const cat = header.dataset.cat;
      const body = container.querySelector(`[data-body="${CSS.escape(cat)}"]`);
      const chevron = header.querySelector('.section-chevron');
      body.classList.toggle('collapsed');
      chevron.classList.toggle('open');
    });
  });

  // +/- buttons
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, delta } = btn.dataset;
      State.adjustComponent(sessionId, hunterId, id, parseInt(delta));
      const session2 = State.getSession(sessionId);
      const hunter2 = session2.hunters.find(h => h.id === hunterId);
      const newQty = hunter2.chest[id] || 0;
      const qtyEl = container.querySelector(`[data-qty="${id}"]`);
      if (qtyEl) {
        qtyEl.textContent = newQty;
        qtyEl.className = `qty-value ${newQty > 0 ? 'nonzero' : ''}`;
      }
      // Update section count
      updateSectionCount(container, sessionId, hunterId, btn);
    });
  });
}

function updateSectionCount(container, sessionId, hunterId, btn) {
  const item = btn.closest('.component-item');
  const section = item?.closest('.chest-section');
  if (!section) return;
  const ids = [...section.querySelectorAll('.qty-value')].map(el => el.dataset.qty);
  const session2 = State.getSession(sessionId);
  const hunter2 = session2?.hunters.find(h => h.id === hunterId);
  if (!hunter2) return;
  const total = ids.reduce((s, id) => s + (hunter2.chest[id] || 0), 0);
  const countEl = section.querySelector('.section-header-count');
  if (countEl) countEl.textContent = total > 0 ? total : '';
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
