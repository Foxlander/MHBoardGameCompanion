import { COMPONENTS } from './data.js';

const STORAGE_KEY = 'mhw-companion-v1';

function defaultChest() {
  const chest = {};
  for (const c of COMPONENTS) chest[c.id] = 0;
  return chest;
}

function defaultHunter(name, id) {
  return {
    id,
    name,
    chest: defaultChest(),
    equipped: { weapon: null, helmet: null, chest: null, boots: null }
  };
}

function defaultSession(name, hunterNames) {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    hunters: hunterNames.filter(Boolean).map(n => defaultHunter(n, crypto.randomUUID()))
  };
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { sessions: [] };
  } catch {
    return { sessions: [] };
  }
}

function save(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const store = load();

export const State = {
  // ── Sessions ───────────────────────────────────────
  getSessions() { return store.sessions; },

  createSession(name, hunterNames) {
    const session = defaultSession(name, hunterNames);
    store.sessions.unshift(session);
    save(store);
    return session;
  },

  deleteSession(id) {
    store.sessions = store.sessions.filter(s => s.id !== id);
    save(store);
  },

  getSession(id) {
    return store.sessions.find(s => s.id === id);
  },

  // ── Chest ──────────────────────────────────────────
  setComponentQty(sessionId, hunterId, componentId, qty) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return;
    hunter.chest[componentId] = Math.max(0, qty);
    save(store);
  },

  adjustComponent(sessionId, hunterId, componentId, delta) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return;
    const cur = hunter.chest[componentId] || 0;
    hunter.chest[componentId] = Math.max(0, cur + delta);
    save(store);
  },

  // ── Equip / Craft ──────────────────────────────────
  equipItem(sessionId, hunterId, slot, itemId) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return;
    hunter.equipped[slot] = itemId;
    save(store);
  },

  unequipItem(sessionId, hunterId, slot) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return;
    hunter.equipped[slot] = null;
    save(store);
  },

  craftAndEquip(sessionId, hunterId, slot, itemId, recipe) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return false;
    // Check components
    for (const { id, qty } of recipe) {
      if ((hunter.chest[id] || 0) < qty) return false;
    }
    // Deduct
    for (const { id, qty } of recipe) {
      hunter.chest[id] = (hunter.chest[id] || 0) - qty;
    }
    hunter.equipped[slot] = itemId;
    save(store);
    return true;
  },

  canCraft(sessionId, hunterId, recipe) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return false;
    return recipe.every(({ id, qty }) => (hunter.chest[id] || 0) >= qty);
  },

  // ── Internal ───────────────────────────────────────
  _hunter(sessionId, hunterId) {
    const session = this.getSession(sessionId);
    return session?.hunters.find(h => h.id === hunterId) || null;
  }
};
