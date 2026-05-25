import { WEAPONS, ARMORS, WEAPON_TYPES, COMPONENTS, MONSTERS } from '../data.js';
import { State } from '../state.js';

const ELEM_LABELS = { fire: 'Feu', water: 'Eau', thunder: 'Foudre', ice: 'Glace', dragon: 'Dragon' };
const SLOT_LABELS = { helmet: 'Casque', chest: 'Armure', boots: 'Bottes' };

function monsterIcon(name) {
  const m = MONSTERS.find(x => x.name === name);
  return m ? `<img class="monster-inline-icon" src="assets/monsters/${m.icon}" alt="">` : '';
}

let currentTab = 'weapons';
let currentWeaponType = null;

export function renderForge(container, sessionId, hunterId) {
  const session = State.getSession(sessionId);
  const hunter  = session?.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

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
      renderForge(container, sessionId, hunterId);
    });
  });

  const body = container.querySelector('#forge-body');
  if (currentTab === 'weapons') renderWeapons(body, sessionId, hunterId, hunter);
  else renderArmors(body, sessionId, hunterId, hunter);
}

// ── WEAPONS ───────────────────────────────────────────────

function renderWeapons(body, sessionId, hunterId, hunter) {
  // Collect types that have at least one weapon
  const typeIds = [...new Set(WEAPONS.map(w => w.type))];
  if (!currentWeaponType || !typeIds.includes(currentWeaponType)) {
    currentWeaponType = typeIds[0];
  }

  const typeTabs = typeIds.map(tid => {
    const def = WEAPON_TYPES.find(t => t.id === tid);
    return `<button class="wtype-tab ${tid === currentWeaponType ? 'active' : ''}" data-type="${tid}">${esc(def?.name || tid)}</button>`;
  }).join('');

  // Group selected type weapons by monster
  const weapons = WEAPONS.filter(w => w.type === currentWeaponType);
  const byMonster = {};
  const monsters = [];
  for (const w of weapons) {
    if (!byMonster[w.monster]) { byMonster[w.monster] = []; monsters.push(w.monster); }
    byMonster[w.monster].push(w);
  }

  const chipsHtml = monsters.map(m => {
    const chips = byMonster[m].map(w => weaponChip(w, hunter, sessionId, hunterId)).join('');
    return `<div class="comp-cat-label">${monsterIcon(m)}${esc(m)}</div><div class="comp-chips">${chips}</div>`;
  }).join('');

  body.innerHTML = `<div class="wtype-tabs">${typeTabs}</div>${chipsHtml}`;

  body.querySelectorAll('.wtype-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentWeaponType = btn.dataset.type;
      renderWeapons(body, sessionId, hunterId, hunter);
    });
  });

  body.querySelectorAll('.forge-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      if (e.target.closest('.forge-chip-action')) return;
      openWeaponModal(chip.dataset.wid, sessionId, hunterId);
    });
  });

  body.querySelectorAll('.forge-chip-action[data-wid]').forEach(btn => {
    btn.addEventListener('click', () => handleForge(btn, sessionId, hunterId, body));
  });
}

function rarityBadge(r) {
  return `<span class="rarity-badge r${r}">${'★'.repeat(r)}</span>`;
}

function chainAncestors(equippedId) {
  const ids = new Set();
  let cur = WEAPONS.find(w => w.id === equippedId);
  while (cur?.requires) {
    ids.add(cur.requires);
    cur = WEAPONS.find(w => w.id === cur.requires);
  }
  return ids;
}

function weaponChip(w, hunter, sessionId, hunterId) {
  const typeDef    = WEAPON_TYPES.find(t => t.id === w.type);
  const isEquipped = hunter.equipped.weapon === w.id;
  const isCrafted  = (hunter.crafted || []).includes(w.id);
  const superseded = chainAncestors(hunter.equipped.weapon).has(w.id);
  const canCraft   = State.canCraft(sessionId, hunterId, w.recipe, w.requires);
  const requiresMet = !w.requires
    || hunter.equipped.weapon === w.requires
    || (hunter.crafted || []).includes(w.requires);
  const upgradeIcon = w.requires ? '<span class="upgrade-icon" title="Amélioration">↑</span>' : '';

  let actionBtn;
  if (isEquipped) {
    actionBtn = `<span class="forge-chip-action equipped no-action" title="Équipée">✓</span>`;
  } else if (superseded) {
    actionBtn = `<button class="forge-chip-action locked" disabled title="Déjà améliorée">↑</button>`;
  } else if (isCrafted) {
    actionBtn = `<button class="forge-chip-action reequip" data-wid="${w.id}" data-mode="equip" title="Équiper">▶</button>`;
  } else if (canCraft && requiresMet) {
    actionBtn = `<button class="forge-chip-action craftable" data-wid="${w.id}" data-mode="craft" title="Forger & Équiper">⚒</button>`;
  } else {
    const tip = !requiresMet ? 'Arme précédente requise' : 'Composants manquants';
    actionBtn = `<button class="forge-chip-action locked" disabled title="${tip}">🔒</button>`;
  }

  const iconSrc = typeDef?.iconBase
    ? `assets/${typeDef.iconBase}Rarity${w.rarity || 1}.webp`
    : null;

  return `
    <div class="forge-chip" data-wid="${w.id}">
      ${iconSrc ? `<img class="forge-chip-icon" src="${iconSrc}" alt="">` : ''}
      ${upgradeIcon}
      <span class="forge-chip-name">${esc(w.name)}</span>
      ${actionBtn}
    </div>`;
}

function handleForge(btn, sessionId, hunterId, body) {
  const wid    = btn.dataset.wid;
  const weapon = WEAPONS.find(w => w.id === wid);
  if (!weapon) return;

  if (btn.dataset.mode === 'equip') {
    State.equipCrafted(sessionId, hunterId, 'weapon', wid);
    showToast(`${weapon.name} équipée`, 'success');
  } else {
    const ok = State.craftAndEquip(sessionId, hunterId, 'weapon', wid, weapon.recipe, weapon.requires);
    if (ok) showToast(`${weapon.name} forgée !`, 'success');
    else    showToast('Composants insuffisants', 'error');
  }
  const session2 = State.getSession(sessionId);
  const hunter2  = session2.hunters.find(h => h.id === hunterId);
  renderWeapons(body, sessionId, hunterId, hunter2);
}

// ── WEAPON MODAL ──────────────────────────────────────────

function openWeaponModal(wid, sessionId, hunterId) {
  const weapon  = WEAPONS.find(w => w.id === wid);
  if (!weapon) return;
  const typeDef = WEAPON_TYPES.find(t => t.id === weapon.type);
  const session = State.getSession(sessionId);
  const hunter  = session?.hunters.find(h => h.id === hunterId);
  const isEquipped  = hunter?.equipped.weapon === wid;
  const isCrafted   = (hunter?.crafted || []).includes(wid);
  const superseded  = chainAncestors(hunter?.equipped.weapon).has(wid);
  const canCraft    = State.canCraft(sessionId, hunterId, weapon.recipe, weapon.requires);
  const requiresMet = !weapon.requires
    || hunter?.equipped.weapon === weapon.requires
    || (hunter?.crafted || []).includes(weapon.requires);

  const damageHtml = `
    <div class="modal-section-label">Tableau de dégâts</div>
    <div class="damage-grid">
      ${[1,2,3,4].map(d => `
        <div class="damage-cell">
          <div class="dmg-icon-wrap ${weapon.damage[d] === 0 ? 'zero' : ''}">
            <img class="dmg-icon" src="assets/other/Dmg_MHW_Icon.webp" alt="">
            <span class="dmg-tier">${d}</span>
          </div>
          <div class="damage-cell-value ${weapon.damage[d] === 0 ? 'zero' : ''}">${weapon.damage[d]}</div>
        </div>`).join('')}
    </div>`;

  const deckHtml = `
    <div class="modal-section-label">Modification de deck</div>
    <div class="deck-row">
      <div class="deck-box">
        <div class="deck-box-label"><span class="deck-remove-icon">✕</span> Retirer</div>
        <div class="deck-tags">
          ${weapon.deckRemove.length
            ? weapon.deckRemove.map(c => `<span class="deck-tag remove">${esc(c)}</span>`).join('')
            : '<span class="deck-tag empty">—</span>'}
        </div>
      </div>
      <div class="deck-box">
        <div class="deck-box-label"><span class="deck-add-icon">+</span> Ajouter</div>
        <div class="deck-tags">
          ${weapon.deckAdd.length
            ? weapon.deckAdd.map(c => `<span class="deck-tag add">${esc(c)}</span>`).join('')
            : '<span class="deck-tag empty">—</span>'}
        </div>
      </div>
    </div>`;

  const recipeHtml = weapon.recipe.length ? `
    <div class="modal-section-label">Composants requis</div>
    <div class="recipe-items">
      ${weapon.recipe.map(r => {
        const comp = COMPONENTS.find(c => c.id === r.id);
        const have = hunter?.chest[r.id] || 0;
        const ok   = have >= r.qty;
        return `<span class="recipe-item ${ok ? 'ok' : 'missing'}">
          ${comp?.icon ? `<img src="assets/components/${comp.icon}" style="width:16px;height:16px;object-fit:contain;vertical-align:middle">` : ''}
          <span class="recipe-qty">${r.qty}×</span> ${esc(comp?.name || r.id)}
          <small>(${have})</small>
        </span>`;
      }).join('')}
    </div>` : '';

  let forgeBtn = '';
  if (isEquipped) {
    forgeBtn = `<button class="craft-btn equipped-btn" disabled>✓ Équipée</button>`;
  } else if (superseded) {
    forgeBtn = `<button class="craft-btn cannot-craft" disabled>↑ Déjà améliorée</button>`;
  } else if (isCrafted) {
    forgeBtn = `<button class="craft-btn can-craft modal-forge-btn" data-wid="${wid}" data-mode="equip">▶ Équiper</button>`;
  } else if (!requiresMet) {
    const reqWeapon = WEAPONS.find(w => w.id === weapon.requires);
    forgeBtn = `<button class="craft-btn cannot-craft" disabled>🔒 Requiert : ${esc(reqWeapon?.name || weapon.requires)}</button>`;
  } else if (weapon.recipe.length === 0 || canCraft) {
    forgeBtn = `<button class="craft-btn can-craft modal-forge-btn" data-wid="${wid}" data-mode="craft">⚒ Forger & Équiper</button>`;
  } else {
    forgeBtn = `<button class="craft-btn cannot-craft" disabled>🔒 Composants manquants</button>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-weapon-header">
        ${typeDef?.iconBase ? `<img class="modal-weapon-icon" src="assets/${typeDef.iconBase}Rarity${weapon.rarity || 1}.webp" alt="">` : ''}
        <div style="flex:1">
          <div class="modal-title" style="margin-bottom:2px">${esc(weapon.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px">${monsterIcon(weapon.monster)}${esc(weapon.monster)}${weapon.requires ? ` · <span class="upgrade-label">Amélioration de : ${esc(WEAPONS.find(w=>w.id===weapon.requires)?.name || weapon.requires)}</span>` : ''}</div>
        </div>
        <button class="btn-icon modal-close-btn">✕</button>
      </div>
      ${damageHtml}
      ${deckHtml}
      ${recipeHtml}
      <div style="margin-top:14px">${forgeBtn}</div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('.modal-forge-btn')?.addEventListener('click', btn => {
    const b = btn.currentTarget;
    const weapon2 = WEAPONS.find(w => w.id === b.dataset.wid);
    if (!weapon2) return;
    if (b.dataset.mode === 'equip') {
      State.equipCrafted(sessionId, hunterId, 'weapon', b.dataset.wid);
      showToast(`${weapon2.name} équipée`, 'success');
    } else {
      const ok = State.craftAndEquip(sessionId, hunterId, 'weapon', b.dataset.wid, weapon2.recipe, weapon2.requires);
      if (ok) showToast(`${weapon2.name} forgée !`, 'success');
      else    showToast('Composants insuffisants', 'error');
    }
    overlay.remove();
    // Refresh forge view
    const body = document.querySelector('#forge-body');
    if (body) {
      const s = State.getSession(sessionId);
      const h = s?.hunters.find(h => h.id === hunterId);
      if (h) renderWeapons(body, sessionId, hunterId, h);
    }
  });
}

// ── ARMORS ────────────────────────────────────────────────

const ARMOR_SLOT_ICON  = { helmet: 'Helmet', chest: 'Chest', boots: 'Leg' };
const ARMOR_SLOT_LABEL = { helmet: 'Casque', chest: 'Armure', boots: 'Bottes' };
const ELEM_LABELS_A    = { fire: 'Feu', water: 'Eau', thunder: 'Foudre', ice: 'Glace', dragon: 'Dragon' };
const RES_ICONS = {
  physical: 'assets/other/Physic_Res_MHW_Icon.webp',
  fire:     'assets/other/Effect-Fire_Res_MHW_Icon.webp',
  water:    'assets/other/Water_Res_MHW_Icon.webp',
  thunder:  'assets/other/Thunder_Res_MHW_Icon.webp',
  ice:      'assets/other/Status_Effect-Ice_Res_Up_S_MHW_Icon.webp',
  dragon:   'assets/other/Status_Effect-Dragon_Res_Up_S_MHW_Icon.webp',
};

function renderArmors(body, sessionId, hunterId, hunter) {
  const byMonster = {};
  for (const a of ARMORS) {
    if (!byMonster[a.monster]) byMonster[a.monster] = [];
    byMonster[a.monster].push(a);
  }

  const html = Object.entries(byMonster).map(([monster, pieces]) => {
    const chips = pieces.map(a => armorChip(a, hunter, sessionId, hunterId)).join('');
    return `<div class="comp-cat-label">${monsterIcon(monster)}${esc(monster)}</div>
            <div class="comp-chips">${chips}</div>`;
  }).join('');

  body.innerHTML = html;

  body.querySelectorAll('.forge-chip[data-aid]').forEach(chip => {
    chip.addEventListener('click', e => {
      if (e.target.closest('.forge-chip-action')) return;
      openArmorModal(chip.dataset.aid, sessionId, hunterId);
    });
  });

  body.querySelectorAll('.forge-chip-action[data-aid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const armor = ARMORS.find(a => a.id === btn.dataset.aid);
      if (!armor) return;
      if (btn.dataset.mode === 'equip') {
        State.equipCrafted(sessionId, hunterId, armor.slot, armor.id);
        showToast(`${armor.name} équipée`, 'success');
      } else {
        const ok = State.craftAndEquip(sessionId, hunterId, armor.slot, armor.id, armor.recipe);
        if (ok) showToast(`${armor.name} forgée !`, 'success');
        else    showToast('Composants insuffisants', 'error');
      }
      const s = State.getSession(sessionId);
      const h = s?.hunters.find(h => h.id === hunterId);
      renderArmors(body, sessionId, hunterId, h);
    });
  });
}

function armorChip(a, hunter, sessionId, hunterId) {
  const isEquipped = hunter.equipped[a.slot] === a.id;
  const isCrafted  = (hunter.crafted || []).includes(a.id);
  const canCraft   = State.canCraft(sessionId, hunterId, a.recipe);
  const iconBase   = ARMOR_SLOT_ICON[a.slot];
  const iconSrc    = iconBase ? `assets/armor/${iconBase}Rarity${a.rarity || 1}.webp` : null;

  let actionBtn;
  if (isEquipped) {
    actionBtn = `<span class="forge-chip-action equipped no-action" title="Équipée">✓</span>`;
  } else if (isCrafted) {
    actionBtn = `<button class="forge-chip-action reequip" data-aid="${a.id}" data-mode="equip" title="Équiper">▶</button>`;
  } else if (a.recipe.length === 0 || canCraft) {
    actionBtn = `<button class="forge-chip-action craftable" data-aid="${a.id}" data-mode="craft">⚒</button>`;
  } else {
    actionBtn = `<button class="forge-chip-action locked" disabled>🔒</button>`;
  }

  return `
    <div class="forge-chip" data-aid="${a.id}">
      ${iconSrc ? `<img class="forge-chip-icon" src="${iconSrc}" alt="">` : ''}
      <span class="forge-chip-name">${esc(a.name)}</span>
      ${actionBtn}
    </div>`;
}

// ── ARMOR MODAL ───────────────────────────────────────────

function openArmorModal(aid, sessionId, hunterId) {
  const armor   = ARMORS.find(a => a.id === aid);
  if (!armor) return;
  const session = State.getSession(sessionId);
  const hunter  = session?.hunters.find(h => h.id === hunterId);
  const isEquipped = hunter?.equipped[armor.slot] === aid;
  const isCrafted  = (hunter?.crafted || []).includes(aid);
  const canCraft   = State.canCraft(sessionId, hunterId, armor.recipe);
  const iconBase   = ARMOR_SLOT_ICON[armor.slot];
  const iconSrc    = iconBase ? `assets/armor/${iconBase}Rarity${armor.rarity || 1}.webp` : null;

  const physIcon = RES_ICONS.physical
    ? `<img class="res-icon" src="${RES_ICONS.physical}" alt="">`
    : '';
  const elemIcon = armor.elemDef && RES_ICONS[armor.elemDef.type]
    ? `<img class="res-icon" src="${RES_ICONS[armor.elemDef.type]}" alt="">`
    : `<span class="res-icon-text">${esc(ELEM_LABELS_A[armor.elemDef?.type] || '')}</span>`;

  const statsHtml = `
    <div class="modal-section-label">Statistiques</div>
    <div class="armor-stats-grid">
      <div class="armor-stat-cell">
        ${physIcon}
        <div class="armor-stat-value">${armor.physicalDef}</div>
      </div>
      ${armor.elemDef ? `
      <div class="armor-stat-cell">
        ${elemIcon}
        <div class="armor-stat-value elem-${armor.elemDef.type}">+${armor.elemDef.value}</div>
      </div>` : ''}
    </div>`;

  const bonusHtml = armor.bonusStat ? `
    <div class="modal-section-label">Compétence</div>
    <div class="armor-bonus">${esc(armor.bonusStat)}</div>` : '';

  const recipeHtml = armor.recipe.length ? `
    <div class="modal-section-label">Composants requis</div>
    <div class="recipe-items">
      ${armor.recipe.map(r => {
        const comp = COMPONENTS.find(c => c.id === r.id);
        const have = hunter?.chest[r.id] || 0;
        const ok   = have >= r.qty;
        return `<span class="recipe-item ${ok ? 'ok' : 'missing'}">
          ${comp?.icon ? `<img src="assets/components/${comp.icon}" style="width:16px;height:16px;object-fit:contain;vertical-align:middle">` : ''}
          <span class="recipe-qty">${r.qty}×</span> ${esc(comp?.name || r.id)}
          <small>(${have})</small>
        </span>`;
      }).join('')}
    </div>` : '';

  let forgeBtn;
  if (isEquipped) {
    forgeBtn = `<button class="craft-btn equipped-btn" disabled>✓ Équipée</button>`;
  } else if (isCrafted) {
    forgeBtn = `<button class="craft-btn can-craft modal-armor-equip-btn" data-aid="${aid}">▶ Équiper</button>`;
  } else if (armor.recipe.length === 0 || canCraft) {
    forgeBtn = `<button class="craft-btn can-craft modal-armor-forge-btn" data-aid="${aid}">⚒ Forger & Équiper</button>`;
  } else {
    forgeBtn = `<button class="craft-btn cannot-craft" disabled>🔒 Composants manquants</button>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-weapon-header">
        ${iconSrc ? `<img class="modal-weapon-icon" src="${iconSrc}" alt="">` : ''}
        <div style="flex:1">
          <div class="modal-title" style="margin-bottom:2px">${esc(armor.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px">${esc(ARMOR_SLOT_LABEL[armor.slot] || armor.slot)} · ${monsterIcon(armor.monster)}${esc(armor.monster)}</div>
        </div>
        <button class="btn-icon modal-close-btn">✕</button>
      </div>
      ${statsHtml}
      ${bonusHtml}
      ${recipeHtml}
      <div style="margin-top:14px">${forgeBtn}</div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  function refreshArmors() {
    overlay.remove();
    const body = document.querySelector('#forge-body');
    if (body) {
      const s = State.getSession(sessionId);
      const h = s?.hunters.find(h => h.id === hunterId);
      if (h) renderArmors(body, sessionId, hunterId, h);
    }
  }

  overlay.querySelector('.modal-armor-equip-btn')?.addEventListener('click', () => {
    State.equipCrafted(sessionId, hunterId, armor.slot, aid);
    showToast(`${armor.name} équipée`, 'success');
    refreshArmors();
  });

  overlay.querySelector('.modal-armor-forge-btn')?.addEventListener('click', () => {
    const ok = State.craftAndEquip(sessionId, hunterId, armor.slot, aid, armor.recipe);
    if (ok) showToast(`${armor.name} forgée !`, 'success');
    else    showToast('Composants insuffisants', 'error');
    refreshArmors();
  });
}

// ── HELPERS ───────────────────────────────────────────────

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
