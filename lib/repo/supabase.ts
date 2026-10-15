import type { Item, ItemPatch, NewItem, NewTrip, Settings, Trip, TripPatch } from '../types';
import type { Repo } from './types';
import { supabase } from '../supabase';

const sb = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};

type TripRow = {
  id: string; name: string; is_name_custom: boolean; country: 'JP'; city: string | null;
  start_date: string; end_date: string; created_at: string;
};
type ItemRow = {
  id: string; trip_id: string; template_id: string | null; template_order: number | null; offset_days: number | null;
  title: string; due_date: string; status: 'todo' | 'done'; completed_at: string | null; memo: string;
  is_custom: boolean; is_due_edited: boolean; created_at: string;
};

const toTrip = (r: TripRow): Trip => ({
  id: r.id, name: r.name, isNameCustom: r.is_name_custom, country: r.country, city: r.city,
  startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at,
});
const toItem = (r: ItemRow): Item => ({
  id: r.id, tripId: r.trip_id, templateId: r.template_id, templateOrder: r.template_order, offsetDays: r.offset_days,
  title: r.title, dueDate: r.due_date, status: r.status, completedAt: r.completed_at, memo: r.memo,
  isCustom: r.is_custom, isDueEdited: r.is_due_edited, createdAt: r.created_at,
});
const itemRow = (i: NewItem, tripId: string) => ({
  trip_id: tripId, template_id: i.templateId, template_order: i.templateOrder, offset_days: i.offsetDays,
  title: i.title, due_date: i.dueDate, status: i.status, completed_at: i.completedAt, memo: i.memo,
  is_custom: i.isCustom, is_due_edited: i.isDueEdited,
});
const itemPatchRow = (p: ItemPatch) => {
  const r: Record<string, unknown> = {};
  if (p.title !== undefined) r.title = p.title;
  if (p.dueDate !== undefined) r.due_date = p.dueDate;
  if (p.status !== undefined) r.status = p.status;
  if (p.completedAt !== undefined) r.completed_at = p.completedAt;
  if (p.memo !== undefined) r.memo = p.memo;
  if (p.isDueEdited !== undefined) r.is_due_edited = p.isDueEdited;
  return r;
};
const ok = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

export const supabaseRepo: Repo = {
  async listTrips() {
    const rows = ok(await sb().from('trips').select('*').order('start_date', { ascending: true })) as TripRow[];
    return rows.map(toTrip);
  },
  async listItems() {
    const rows = ok(await sb().from('trip_items').select('*').order('created_at', { ascending: true })) as ItemRow[];
    return rows.map(toItem);
  },
  async createTrip(trip: NewTrip, items: NewItem[]) {
    const tr = ok(
      await sb().from('trips').insert({
        name: trip.name, is_name_custom: trip.isNameCustom, country: trip.country, city: trip.city,
        start_date: trip.startDate, end_date: trip.endDate,
      }).select('*').single(),
    ) as TripRow;
    try {
      const rows = ok(await sb().from('trip_items').insert(items.map((i) => itemRow(i, tr.id))).select('*')) as ItemRow[];
      return { trip: toTrip(tr), items: rows.map(toItem) };
    } catch (e) {
      // 체크리스트를 만들지 못하면 여행을 저장하지 않는다.
      await sb().from('trips').delete().eq('id', tr.id);
      throw e;
    }
  },
  async updateTrip(id, patch: TripPatch, itemPatches = []) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.isNameCustom !== undefined) row.is_name_custom = patch.isNameCustom;
    if (patch.city !== undefined) row.city = patch.city;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    ok(await sb().from('trips').update(row).eq('id', id).select('id'));
    for (const p of itemPatches) ok(await sb().from('trip_items').update(itemPatchRow(p.patch)).eq('id', p.id).select('id'));
  },
  async deleteTrip(id) {
    ok(await sb().from('trips').delete().eq('id', id).select('id'));
  },
  async addItem(tripId, item) {
    const r = ok(await sb().from('trip_items').insert(itemRow(item, tripId)).select('*').single()) as ItemRow;
    return toItem(r);
  },
  async updateItem(id, patch) {
    ok(await sb().from('trip_items').update(itemPatchRow(patch)).eq('id', id).select('id'));
  },
  async deleteItem(id) {
    ok(await sb().from('trip_items').delete().eq('id', id).select('id'));
  },
  async getSettings(): Promise<Settings> {
    const { data, error } = await sb().from('notification_settings').select('is_enabled').maybeSingle();
    if (error) throw new Error(error.message);
    return { alertsEnabled: data ? !!data.is_enabled : true }; // 기본값은 켜짐
  },
  async setSettings(s) {
    const { data: u } = await sb().auth.getUser();
    if (!u.user) throw new Error('no user');
    ok(await sb().from('notification_settings').upsert({ user_id: u.user.id, is_enabled: s.alertsEnabled }).select('user_id'));
  },
  async track(name, props) {
    // 로그 실패는 사용자 흐름을 막지 않는다.
    await sb().from('events').insert({ name, props: props ?? {} });
  },
};
