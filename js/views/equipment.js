import { WEAPONS, ARMORS, WEAPON_TYPES } from '../data.js';
import { State } from '../state.js';

const SLOT_LABELS = { weapon: 'Arme', helmet: 'Casque', chest: 'Armure', boots: 'Bottes' };
const ELEM_LABELS = { fire: 'Feu', water: 'Eau', thunder: 'Foudre', ice: 'Glace', dragon: 'Dragon' };
const ELEM_COLORS = { fire: 'var(--fire)', water: 'var(--water)', thunder: 'var(--thunder)', ice: 'var(--ice)', dragon: 'var(--dragon)' };
const RES_ICONS = {
  physical: 'assets/other/Physic_Res_MHW_Icon.webp',
  fire:     'assets/other/Effect-Fire_Res_MHW_Icon.webp',
  water:    'assets/other/Water_Res_MHW_Icon.webp',
  thunder:  'assets/other/Thunder_Res_MHW_Icon.webp',
};

export function renderEquipment(container, sessionId, hunterId) {
  const session = State.getSession(sessionId);
  const hunter  = session?.hunters.find(h => h.id === hunterId);
  if (!hunter) return;

  const { weapon: wId, helmet: hId, chest: cId, boots: bId } = hunter.equipped;
  const weapon  = wId ? WEAPONS.find(w => w.id === wId) : null;
  const helmet  = hId ? ARMORS.find(a => a.id === hId) : null;
  const chest   = cId ? ARMORS.find(a => a.id === cId) : null;
  const boots   = bId ? ARMORS.find(a => a.id === bId) : null;

  const slots = [
    { key: 'weapon', item: weapon, label: 'Arme' },
    { key: 'helmet', item: helmet, label: 'Casque' },
    { key: 'chest',  item: chest,  label: 'Armure' },
    { key: 'boots',  item: boots,  label: 'Bottes' },
  ];

  const slotsHtml = `
    <div class="equipment-slots">
      ${slots.map(s => {
        if (!s.item) return `
          <div class="equip-slot">
            <div class="equip-slot-label">${s.label}</div>
            <div class="equip-slot-empty">— Aucun —</div>
          </div>
        `;
        return `
          <div class="equip-slot equipped">
            <div class="equip-slot-label">${s.label}</div>
            <div class="equip-slot-name">${esc(s.item.name)}</div>
            <div class="equip-slot-monster">${esc(s.item.monster)}</div>
            <button class="equip-slot-unequip" data-slot="${s.key}">Retirer</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Weapon stats
  let weaponStatsHtml = '';
  if (weapon) {
    const type = WEAPON_TYPES.find(t => t.id === weapon.type);
    weaponStatsHtml = `
      <div class="stats-section">
        <div class="stats-section-title">Stats Arme</div>
        <div class="weapon-stats-card">
          <div class="weapon-stats-name">${esc(weapon.name)} <small style="color:var(--text-muted);font-size:11px">${esc(type?.name || weapon.type)}</small></div>
          <div class="damage-grid">
            ${[1,2,3,4].map(d => `
              <div class="damage-cell">
                <div class="dmg-icon-wrap ${weapon.damage[d] === 0 ? 'zero' : ''}">
                  <img class="dmg-icon" src="assets/other/Dmg_MHW_Icon.webp" alt="">
                  <span class="dmg-tier">${d}</span>
                </div>
                <div class="damage-cell-value ${weapon.damage[d] === 0 ? 'zero' : ''}">${weapon.damage[d]}</div>
              </div>
            `).join('')}
          </div>
          <div class="deck-row">
            <div class="deck-box">
              <div class="deck-box-label"><span class="deck-remove-icon">✕</span> Retirées</div>
              <div class="deck-tags">
                ${weapon.deckRemove.length ? weapon.deckRemove.map(c => `<span class="deck-tag remove">${esc(c)}</span>`).join('') : '<span class="deck-tag empty">—</span>'}
              </div>
            </div>
            <div class="deck-box">
              <div class="deck-box-label"><span class="deck-add-icon">+</span> Ajoutées</div>
              <div class="deck-tags">
                ${weapon.deckAdd.length ? weapon.deckAdd.map(c => `<span class="deck-tag add">${esc(c)}</span>`).join('') : '<span class="deck-tag empty">—</span>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Armor stats summary
  const armorPieces = [helmet, chest, boots].filter(Boolean);
  let armorStatsHtml = '';
  if (armorPieces.length) {
    const totalPhys = armorPieces.reduce((s, a) => s + a.physicalDef, 0);
    const elemMap = {};
    for (const a of armorPieces) {
      if (a.elemDef) {
        elemMap[a.elemDef.type] = (elemMap[a.elemDef.type] || 0) + a.elemDef.value;
      }
    }

    armorStatsHtml = `
      <div class="stats-section">
        <div class="stats-section-title">Stats Armure (total)</div>
        <div class="weapon-stats-card">
          <div class="damage-grid">
            <div class="damage-cell">
              ${RES_ICONS.physical ? `<img class="res-icon" src="${RES_ICONS.physical}" alt="">` : '<div class="damage-cell-label">Phys.</div>'}
              <div class="damage-cell-value">${totalPhys}</div>
            </div>
            ${Object.entries(elemMap).map(([type, val]) => `
              <div class="damage-cell">
                ${RES_ICONS[type] ? `<img class="res-icon" src="${RES_ICONS[type]}" alt="">` : `<div class="damage-cell-label">${ELEM_LABELS[type] || type}</div>`}
                <div class="damage-cell-value" style="color:${ELEM_COLORS[type] || 'inherit'}">${val}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Bonuses
  const bonuses = [weapon, helmet, chest, boots]
    .filter(i => i?.bonusStat)
    .map(i => ({ name: i.bonusStat.split('—')[0].trim(), desc: i.bonusStat.includes('—') ? i.bonusStat.split('—').slice(1).join('—').trim() : '', source: i.name }));

  const bonusesHtml = `
    <div class="stats-section">
      <div class="stats-section-title">Bonus actifs</div>
      ${bonuses.length ? `
        <div class="bonuses-list">
          ${bonuses.map(b => `
            <div class="bonus-item">
              <div class="bonus-item-name">${esc(b.name)}</div>
              ${b.desc ? `<div class="bonus-item-desc">${esc(b.desc)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<div class="no-bonuses">Aucun bonus actif</div>'}
    </div>
  `;

  container.innerHTML = slotsHtml + weaponStatsHtml + armorStatsHtml + bonusesHtml;

  container.querySelectorAll('[data-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.unequipItem(sessionId, hunterId, btn.dataset.slot);
      renderEquipment(container, sessionId, hunterId);
    });
  });
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
