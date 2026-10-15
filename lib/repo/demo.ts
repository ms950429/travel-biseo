import type { Item, ItemPatch, NewItem, NewTrip, Settings, Trip, TripPatch } from '../types';
import type { Repo } from './types';

// 데모 모드: 브라우저 localStorage에만 저장한다. 서버로는 아무것도 보내지 않는다.
export const DEMO_FLAG = 'tb_demo';
export const DEMO_DB = 'tb_demo_db';
export const DEMO_TODAY = 'tb_today'; // 시연용: 오늘 날짜를 바꿔 볼 수 있다 (YYYY-MM-DD)

type DB = { trips: Trip[]; items: Item[]; settings: Settings; events: { name: string; props?: unknown; at: string }[] };
const empty = (): DB => ({ trips: [], items: [], settings: { alertsEnabled: true }, events: [] });

function load(): DB {
  try {
    const raw = localStorage.getItem(DEMO_DB);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}
function save(db: DB) {
  localStorage.setItem(DEMO_DB, JSON.stringify(db));
}
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

export function clearDemoData() {
  localStorage.removeItem(DEMO_DB);
  localStorage.removeItem(DEMO_TODAY);
}

export const demoRepo: Repo = {
  async listTrips() {
    return load().trips.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
  async listItems() {
    return load().items;
  },
  async createTrip(trip: NewTrip, items: NewItem[]) {
    const db = load();
    const t: Trip = { ...trip, id: uid(), createdAt: now() };
    const created: Item[] = items.map((i, n) => ({ ...i, id: uid(), tripId: t.id, createdAt: new Date(Date.now() + n).toISOString() }));
    db.trips.push(t);
    db.items.push(...created);
    save(db);
    return { trip: t, items: created };
  },
  async updateTrip(id: string, patch: TripPatch, itemPatches = []) {
    const db = load();
    db.trips = db.trips.map((t) => (t.id === id ? { ...t, ...patch } : t));
    for (const p of itemPatches) db.items = db.items.map((i) => (i.id === p.id ? { ...i, ...p.patch } : i));
    save(db);
  },
  async deleteTrip(id: string) {
    const db = load();
    db.trips = db.trips.filter((t) => t.id !== id);
    db.items = db.items.filter((i) => i.tripId !== id);
    save(db);
  },
  async addItem(tripId: string, item: NewItem) {
    const db = load();
    const it: Item = { ...item, id: uid(), tripId, createdAt: now() };
    db.items.push(it);
    save(db);
    return it;
  },
  async updateItem(id: string, patch: ItemPatch) {
    const db = load();
    db.items = db.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    save(db);
  },
  async deleteItem(id: string) {
    const db = load();
    db.items = db.items.filter((i) => i.id !== id);
    save(db);
  },
  async getSettings() {
    return load().settings;
  },
  async setSettings(s: Settings) {
    const db = load();
    db.settings = s;
    save(db);
  },
  async track(name: string, props?: Record<string, unknown>) {
    const db = load();
    db.events.push({ name, props, at: now() });
    if (db.events.length > 500) db.events = db.events.slice(-500);
    save(db);
  },
};
