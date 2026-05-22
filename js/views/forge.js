import { WEAPONS, ARMORS, WEAPON_TYPES, COMPONENTS } from '../data.js';
import { State } from '../state.js';

const SLOT_LABELS = { helmet: 'Casque', chest: 'Armure', boots: 'Bottes' };
const ELEM_LABELS  = { fire: 'Feu', water: 'Eau', thunder: 'Foudre', ice: 'Glace', dragon: 'Dragon' };

let currentTab = 'weapons';
let weaponFilter = 'all';

export function renderForge(container, sessionId, hunterId) {
  const session = State.getSession(sessionId);
  const hunter  = session?.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const monsters = [...new Set(WEAPONS.map(w => w.monster))].sort();
  const types    = WEAPON_TYPES;

  container.innerHTML = `
    <div class="forge-tabs">
      <button class="forge-tab ${currentTab === 'weapons' ? 'active' : ''}" data-tab="weapons">Armes</button>
      <button class="forge-tab ${currentTab === 'armors'  ? 'active' : ''}" data-tab="armors">Armures</button>
    </div>
    <div id="forge-body"></div>
  `;

  container.querySelectorAll('.forge-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      weaponFilter = 'all';
      renderForge(container, sessionId, hunterId);
    });
  });

  const body = container.querySelector('#forge-body');

  if (currentTab === 'weapons') {
    renderWeapons(body, sessionId, hunterId, hunter, types);
  } else {
    renderArmors(body, sessionId, hunterId, hunter);
  }
}

function renderWeapons(body, sessionId, hunterId, hunter, types) {
  const filterHtml = `
    <div class="forge-filter-row">
      <button class="filter-chip ${weaponFilter === 'all' ? 'active' : ''}" data-wf="all">Tous</button>
      ${WEAPON_TYPES.map(t => `<button class="filter-chip ${weaponFilter === t.id ? 'active' : ''}" data-wf="${t.id}">${t.abbr} — ${t.name}</button>`).join('')}
    </div>
  `;

  const filtered = weaponFilter === 'all' ? WEAPONS : WEAPONS.filter(w => w.type === weaponFilter);

  body.innerHTML = filterHtml + `<div class="weapon-list">${filtered.map(w => renderWeaponCard(w, hunter, sessionId, hunterId)).join('')}</div>`;

  body.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      weaponFilter = chip.dataset.wf;
      renderWeapons(body, sessionId, hunterId, hunter, types);
    });
  });

  body.querySelectorAll('[data-craft-weapon]').forEach(btn => {
    btn.addEventListener('click', () => {
      const weaponId = btn.dataset.craftWeapon;
      const weapon = WEAPONS.find(w => w.id === weaponId);
      if (!weapon) return;
      if (btn.dataset.mode === 'unequip') {
        State.unequipItem(sessionId, hunterId, 'weapon');
        showToast('Arme retirée', 'success');
      } else {
        const ok = State.craftAndEquip(sessionId, hunterId, 'weapon', weaponId, weapon.recipe);
        if (ok) showToast(`${weapon.name} forgée et équipée !`, 'success');
        else showToast('Composants insuffisants', 'error');
      }
      const session2 = State.getSession(sessionId);
      const hunter2 = session2.hunters.find(h => h.id === hunterId);
      renderWeapons(body, sessionId, hunterId, hunter2, null);
    });
  });
}

function renderWeaponCard(w, hunter, sessionId, hunterId) {
  const type     = WEAPON_TYPES.find(t => t.id === w.type);
  const isEquipped = hunter.equipped.weapon === w.id;
  const canCraft   = State.canCraft(sessionId, hunterId, w.recipe);

  const damageHtml = `
    <div class="damage-grid">
      ${[1,2,3,4].map(d => `
        <div class="damage-cell">
          <div class="damage-cell-label">Dégât ${d}</div>
          <div class="damage-cell-value ${w.damage[d] === 0 ? 'zero' : ''}">${w.damage[d]}</div>
        </div>
      `).join('')}
    </div>
  `;

  const deckHtml = `
    <div class="deck-row">
      <div class="deck-box">
        <div class="deck-box-label"><span class="deck-remove-icon">✕</span> Retirer du deck</div>
        <div class="deck-tags">
          ${w.deckRemove.length ? w.deckRemove.map(c => `<span class="deck-tag remove">${esc(c)}</span>`).join('') : '<span class="deck-tag empty">—</span>'}
        </div>
      </div>
      <div class="deck-box">
        <div class="deck-box-label"><span class="deck-add-icon">+</span> Ajouter au deck</div>
        <div class="deck-tags">
          ${w.deckAdd.length ? w.deckAdd.map(c => `<span class="deck-tag add">${esc(c)}</span>`).join('') : '<span class="deck-tag empty">—</span>'}
        </div>
      </div>
    </div>
  `;

  const recipeHtml = w.recipe.length ? `
    <div class="recipe-row">
      <div class="recipe-label">Composants requis</div>
      <div class="recipe-items">
        ${w.recipe.map(r => {
          const comp  = COMPONENTS.find(c => c.id === r.id);
          const have  = hunter.chest[r.id] || 0;
          const ok    = have >= r.qty;
          return `<span class="recipe-item ${ok ? 'ok' : 'missing'}"><span class="recipe-qty">${r.qty}×</span> ${esc(comp?.name || r.id)} <small>(${have})</small></span>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  let craftBtn;
  if (isEquipped) {
    craftBtn = `<button class="craft-btn equipped-btn" data-craft-weapon="${w.id}" data-mode="unequip">Équipée — Retirer</button>`;
  } else if (w.recipe.length === 0) {
    craftBtn = `<button class="craft-btn can-craft" data-craft-weapon="${w.id}" data-mode="equip">Équiper</button>`;
  } else if (canCraft) {
    craftBtn = `<button class="craft-btn can-craft" data-craft-weapon="${w.id}" data-mode="craft">Forger & Équiper</button>`;
  } else {
    craftBtn = `<button class="craft-btn cannot-craft" disabled>Composants manquants</button>`;
  }

  return `
    <div class="weapon-card ${isEquipped ? 'equipped' : ''}">
      <div class="weapon-card-header">
        <span class="weapon-type-badge">${esc(type?.abbr || w.type)}</span>
        <div>
          <div class="item-name">${esc(w.name)}</div>
          <div class="item-monster">${esc(w.monster)}</div>
        </div>
      </div>
      ${damageHtml}
      ${deckHtml}
      ${recipeHtml}
      ${craftBtn}
    </div>
  `;
}

function renderArmors(body, sessionId, hunterId, hunter) {
  const monsters = [...new Set(ARMORS.map(a => a.monster))];

  const filterHtml = `
    <div class="forge-filter-row">
      <button class="filter-chip ${weaponFilter === 'all' ? 'active' : ''}" data-af="all">Tous</button>
      <button class="filter-chip ${weaponFilter === 'helmet' ? 'active' : ''}" data-af="helmet">Casques</button>
      <button class="filter-chip ${weaponFilter === 'chest' ? 'active' : ''}" data-af="chest">Armures</button>
      <button class="filter-chip ${weaponFilter === 'boots' ? 'active' : ''}" data-af="boots">Bottes</button>
    </div>
  `;

  const filtered = weaponFilter === 'all' ? ARMORS : ARMORS.filter(a => a.slot === weaponFilter);

  body.innerHTML = filterHtml + `<div class="armor-list">${filtered.map(a => renderArmorCard(a, hunter, sessionId, hunterId)).join('')}</div>`;

  body.querySelectorAll('[data-af]').forEach(chip => {
    chip.addEventListener('click', () => {
      weaponFilter = chip.dataset.af;
      renderArmors(body, sessionId, hunterId, hunter);
    });
  });

  body.querySelectorAll('[data-craft-armor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const armorId = btn.dataset.craftArmor;
      const armor   = ARMORS.find(a => a.id === armorId);
      if (!armor) return;
      if (btn.dataset.mode === 'unequip') {
        State.unequipItem(sessionId, hunterId, armor.slot);
        showToast('Armure retirée', 'success');
      } else {
        const ok = State.craftAndEquip(sessionId, hunterId, armor.slot, armorId, armor.recipe);
        if (ok) showToast(`${armor.name} forgée et équipée !`, 'success');
        else showToast('Composants insuffisants', 'error');
      }
      const session2 = State.getSession(sessionId);
      const hunter2 = session2.hunters.find(h => h.id === hunterId);
      renderArmors(body, sessionId, hunterId, hunter2);
    });
  });
}

function renderArmorCard(a, hunter, sessionId, hunterId) {
  const isEquipped = hunter.equipped[a.slot] === a.id;
  const canCraft   = State.canCraft(sessionId, hunterId, a.recipe);

  const statsHtml = `
    <div class="armor-stats">
      <div class="stat-box">
        <div class="stat-box-label">Résist. Phys.</div>
        <div class="stat-box-value">${a.physicalDef}</div>
      </div>
      <div class="stat-box ${a.elemDef ? a.elemDef.type : ''}">
        <div class="stat-box-label">Résist. Élém.</div>
        <div class="stat-box-value">${a.elemDef ? a.elemDef.value : '—'}</div>
        ${a.elemDef ? `<div class="stat-box-type">${ELEM_LABELS[a.elemDef.type] || a.elemDef.type}</div>` : ''}
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Slot</div>
        <div class="stat-box-value" style="font-size:12px;color:var(--text-muted)">${SLOT_LABELS[a.slot]}</div>
      </div>
    </div>
  `;

  const bonusHtml = a.bonusStat ? `
    <div class="bonus-stat-box">
      <span class="bonus-stat-name">${esc(a.bonusStat.split('—')[0].trim())}</span>
      ${a.bonusStat.includes('—') ? ` — ${esc(a.bonusStat.split('—').slice(1).join('—').trim())}` : ''}
    </div>
  ` : '';

  const recipeHtml = a.recipe.length ? `
    <div class="recipe-row">
      <div class="recipe-label">Composants requis</div>
      <div class="recipe-items">
        ${a.recipe.map(r => {
          const comp = COMPONENTS.find(c => c.id === r.id);
          const have = hunter.chest[r.id] || 0;
          const ok   = have >= r.qty;
          return `<span class="recipe-item ${ok ? 'ok' : 'missing'}"><span class="recipe-qty">${r.qty}×</span> ${esc(comp?.name || r.id)} <small>(${have})</small></span>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  let craftBtn;
  if (isEquipped) {
    craftBtn = `<button class="craft-btn equipped-btn" data-craft-armor="${a.id}" data-mode="unequip">Équipée — Retirer</button>`;
  } else if (a.recipe.length === 0) {
    craftBtn = `<button class="craft-btn can-craft" data-craft-armor="${a.id}" data-mode="equip">Équiper</button>`;
  } else if (canCraft) {
    craftBtn = `<button class="craft-btn can-craft" data-craft-armor="${a.id}" data-mode="craft">Forger & Équiper</button>`;
  } else {
    craftBtn = `<button class="craft-btn cannot-craft" disabled>Composants manquants</button>`;
  }

  return `
    <div class="armor-card ${isEquipped ? 'equipped' : ''}">
      <div class="armor-card-header">
        <span class="armor-type-badge ${a.slot}">${esc(SLOT_LABELS[a.slot])}</span>
        <div>
          <div class="item-name">${esc(a.name)}</div>
          <div class="item-monster">${esc(a.monster)}</div>
        </div>
      </div>
      ${statsHtml}
      ${bonusHtml}
      ${recipeHtml}
      ${craftBtn}
    </div>
  `;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
