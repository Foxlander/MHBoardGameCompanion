import { COMPONENTS, MONSTERS } from '../data.js';
import { State } from '../state.js';

export function renderChest(container, sessionId, hunterId) {
  const session = State.getSession(sessionId);
  const hunter = session?.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const categories = [];
  const byCategory = {};
  for (const c of COMPONENTS) {
    if (!byCategory[c.category]) { byCategory[c.category] = []; categories.push(c.category); }
    byCategory[c.category].push(c);
  }

  const html = categories.map(cat => {
    const items = byCategory[cat];
    const chips = items.map(c => {
      const qty = hunter.chest[c.id] || 0;
      return `
        <div class="comp-chip" title="${esc(c.name)}">
          <img class="comp-chip-icon ${qty === 0 ? 'dimmed' : ''}" src="assets/components/${c.icon}" alt="">
          <span class="comp-chip-name">${esc(c.name)}</span>
          <button class="comp-chip-btn minus" data-id="${c.id}" data-delta="-1">−</button>
          <span class="comp-chip-val ${qty > 0 ? 'nonzero' : ''}" data-qty="${c.id}">${qty}</span>
          <button class="comp-chip-btn plus" data-id="${c.id}" data-delta="1">+</button>
        </div>`;
    }).join('');

    const m = MONSTERS.find(x => x.name === cat);
    const icon = m ? `<img class="monster-inline-icon" src="assets/monsters/${m.icon}" alt="">` : '';
    return `<div class="comp-cat-label">${icon}${esc(cat)}</div><div class="comp-chips">${chips}</div>`;
  }).join('');

  container.innerHTML = html;

  container.querySelectorAll('.comp-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, delta } = btn.dataset;
      State.adjustComponent(sessionId, hunterId, id, parseInt(delta));
      const h = State.getSession(sessionId)?.hunters.find(h => h.id === hunterId);
      const newQty = h?.chest[id] || 0;
      const chip = btn.closest('.comp-chip');
      const qtyEl = chip?.querySelector(`[data-qty="${id}"]`);
      const icon = chip?.querySelector('.comp-chip-icon');
      if (qtyEl) {
        qtyEl.textContent = newQty;
        qtyEl.className = `comp-chip-val ${newQty > 0 ? 'nonzero' : ''}`;
      }
      if (icon) icon.classList.toggle('dimmed', newQty === 0);
    });
  });
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
