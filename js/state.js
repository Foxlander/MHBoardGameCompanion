import { COMPONENTS, MONSTERS } from './data.js';

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
    crafted: [],
    equipped: { weapon: null, helmet: null, chest: null, boots: null }
  };
}

function defaultQuests() {
  const q = {};
  for (const m of MONSTERS) q[m.id] = { assigned: false, investigation: 0, tempered: 0 };
  return q;
}

function defaultSession(name, hunterNames) {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    quests: defaultQuests(),
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

  craftAndEquip(sessionId, hunterId, slot, itemId, recipe, requires = null) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return false;
    if (requires && hunter.equipped[slot] !== requires) return false;
    for (const { id, qty } of recipe) {
      if ((hunter.chest[id] || 0) < qty) return false;
    }
    for (const { id, qty } of recipe) {
      hunter.chest[id] = (hunter.chest[id] || 0) - qty;
    }
    if (!hunter.crafted) hunter.crafted = [];
    // L'arme consommée (upgrade) disparaît du crafted
    if (requires) hunter.crafted = hunter.crafted.filter(id => id !== requires);
    if (!hunter.crafted.includes(itemId)) hunter.crafted.push(itemId);
    hunter.equipped[slot] = itemId;
    save(store);
    return true;
  },

  equipCrafted(sessionId, hunterId, slot, itemId) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return false;
    if (!(hunter.crafted || []).includes(itemId)) return false;
    hunter.equipped[slot] = itemId;
    save(store);
    return true;
  },

  canCraft(sessionId, hunterId, recipe, requires = null) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return false;
    if (requires && hunter.equipped.weapon !== requires) return false;
    return recipe.every(({ id, qty }) => (hunter.chest[id] || 0) >= qty);
  },

  // ── Quests ────────────────────────────────────────
  getQuests(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return {};
    if (!session.quests) session.quests = defaultQuests();
    return session.quests;
  },

  toggleAssigned(sessionId, monsterId) {
    const q = this._quest(sessionId, monsterId);
    if (!q) return;
    q.assigned = !q.assigned;
    save(store);
  },

  setInvestigation(sessionId, monsterId, val) {
    const q = this._quest(sessionId, monsterId);
    if (!q) return;
    q.investigation = Math.min(2, Math.max(0, val));
    save(store);
  },

  adjustTempered(sessionId, monsterId, delta) {
    const q = this._quest(sessionId, monsterId);
    if (!q) return;
    q.tempered = Math.max(0, (q.tempered || 0) + delta);
    save(store);
  },

  _quest(sessionId, monsterId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    if (!session.quests) session.quests = defaultQuests();
    if (!session.quests[monsterId]) session.quests[monsterId] = { assigned: false, investigation: 0, tempered: 0 };
    return session.quests[monsterId];
  },

  // ── Reset ─────────────────────────────────────────
  resetHunter(sessionId, hunterId) {
    const hunter = this._hunter(sessionId, hunterId);
    if (!hunter) return;
    for (const key of Object.keys(hunter.chest)) hunter.chest[key] = 0;
    hunter.crafted = [];
    hunter.equipped = { weapon: null, helmet: null, chest: null, boots: null };
    save(store);
  },

  // ── Internal ───────────────────────────────────────
  _hunter(sessionId, hunterId) {
    const session = this.getSession(sessionId);
    return session?.hunters.find(h => h.id === hunterId) || null;
  }
};
