'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { usePopup } from '@/components/Popup';
import { MSG } from './messages';
import { today as getToday } from './dates';
import { alertItemIds, tripAlertCounts } from './logic';
import type { Item, ItemPatch, NewItem, NewTrip, Settings, Trip, TripPatch } from './types';

type Store = {
  ready: boolean;
  today: string;
  trips: Trip[];
  items: Item[];
  settings: Settings;
  itemsOf: (tripId: string) => Item[];
  reload: () => Promise<void>;
  createTrip: (trip: NewTrip, items: NewItem[]) => Promise<Trip | 'offline' | 'fail'>;
  updateTrip: (id: string, patch: TripPatch, itemPatches?: { id: string; patch: ItemPatch }[]) => Promise<boolean>;
  deleteTrip: (id: string) => Promise<boolean>;
  toggleItem: (item: Item) => Promise<void>;
  saveItem: (id: string, patch: ItemPatch) => Promise<boolean>;
  addItem: (tripId: string, item: NewItem) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  setAlertsEnabled: (v: boolean) => Promise<void>;
  track: (name: string, props?: Record<string, unknown>) => void;
  /** 상단 알림이 노출될 때 (같은 사용자·여행·날짜 기준 하루 1회만 기록) */
  noteReminderExposed: (tripId: string, items: Item[]) => void;
  noteReminderClicked: (tripId: string) => void;
};
const Ctx = createContext<Store | null>(null);

const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { repo, status, mode } = useAuth();
  const popup = usePopup();
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(getToday());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>({ alertsEnabled: true });
  const repoRef = useRef(repo);
  repoRef.current = repo;

  // 날짜가 바뀌면(자정 이후 다시 열었을 때) D-Day를 다시 계산한다.
  useEffect(() => {
    const refresh = () => setToday(getToday());
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [status, mode]);

  const reload = useCallback(async () => {
    const r = repoRef.current;
    const [t, i, s] = await Promise.all([r.listTrips(), r.listItems(), r.getSettings()]);
    setTrips(t);
    setItems(i);
    setSettings(s);
    setToday(getToday());
  }, []);

  useEffect(() => {
    if (status !== 'authed') {
      setReady(false);
      return;
    }
    let cancelled = false;
    reload()
      .catch((e) => {
        console.error(e);
        if (!cancelled) popup.alert(MSG.serverError);
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, reload]);

  /** 오프라인이면 오프라인 팝업, 서버 오류면 서버 오류 팝업을 띄운다. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, onFail?: () => void): Promise<T | undefined> => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        popup.alert(MSG.offline, onFail);
        return undefined;
      }
      try {
        return await fn();
      } catch (e) {
        console.error(e);
        popup.alert(MSG.serverError, onFail);
        return undefined;
      }
    },
    [popup],
  );

  const track = useCallback((name: string, props?: Record<string, unknown>) => {
    repoRef.current.track(name, props).catch(() => undefined);
  }, []);

  const itemsOf = useCallback((tripId: string) => items.filter((i) => i.tripId === tripId), [items]);

  const createTrip: Store['createTrip'] = useCallback(
    async (trip, newItems) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        popup.alert(MSG.offline);
        return 'offline';
      }
      try {
        const prevCount = trips.length;
        const out = await repoRef.current.createTrip(trip, newItems);
        setTrips((p) => [...p, out.trip]);
        setItems((p) => [...p, ...out.items]);
        const days = Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000) + 1;
        track('trip_created', { country: trip.country, days });
        track('checklist_generated', { trip_id: out.trip.id, item_count: out.items.length });
        if (prevCount > 0 && trips.some((t) => t.startDate < getToday())) track('trip_recreated', {});
        return out.trip;
      } catch (e) {
        console.error(e);
        return 'fail'; // 체크리스트를 만들지 못했으면 여행도 저장하지 않는다 (repo.createTrip이 보장)
      }
    },
    [popup, trips, track],
  );

  const updateTrip: Store['updateTrip'] = useCallback(
    async (id, patch, itemPatches = []) => {
      const r = await run(async () => {
        await repoRef.current.updateTrip(id, patch, itemPatches);
        setTrips((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        setItems((p) => p.map((i) => { const ip = itemPatches.find((x) => x.id === i.id); return ip ? { ...i, ...ip.patch } : i; }));
        return true;
      });
      return !!r;
    },
    [run],
  );

  const deleteTrip: Store['deleteTrip'] = useCallback(
    async (id) => {
      const r = await run(async () => {
        await repoRef.current.deleteTrip(id);
        setTrips((p) => p.filter((t) => t.id !== id));
        setItems((p) => p.filter((i) => i.tripId !== id));
        return true;
      });
      return !!r;
    },
    [run],
  );

  const patchLocal = (id: string, patch: ItemPatch) => setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const toggleItem: Store['toggleItem'] = useCallback(
    async (item) => {
      const done = item.status === 'todo';
      const patch: ItemPatch = { status: done ? 'done' : 'todo', completedAt: done ? new Date().toISOString() : null };
      await run(async () => {
        await repoRef.current.updateItem(item.id, patch);
        patchLocal(item.id, patch);
        track(done ? 'item_checked' : 'item_unchecked', { trip_item_id: item.id });
        if (done) {
          // 알림에 포함된 항목을 노출된 날 안에 완료하면 reminder_converted
          const raw = lsGet('tb_exposed:' + getToday());
          if (raw) {
            try {
              const ids: string[] = JSON.parse(raw);
              if (ids.includes(item.id)) track('reminder_converted', { trip_item_id: item.id, via_click: lsGet('tb_alert_click') === item.tripId });
            } catch { /* ignore */ }
          }
        }
      });
    },
    [run, track],
  );

  const saveItem: Store['saveItem'] = useCallback(
    async (id, patch) => {
      const r = await run(async () => {
        await repoRef.current.updateItem(id, patch);
        patchLocal(id, patch);
        return true;
      });
      return !!r;
    },
    [run],
  );

  const addItem: Store['addItem'] = useCallback(
    async (tripId, item) => {
      const r = await run(async () => {
        const it = await repoRef.current.addItem(tripId, item);
        setItems((p) => [...p, it]);
        track('item_added_custom', {});
        return true;
      });
      return !!r;
    },
    [run, track],
  );

  const deleteItem: Store['deleteItem'] = useCallback(
    async (id) => {
      const target = items.find((i) => i.id === id);
      const r = await run(async () => {
        await repoRef.current.deleteItem(id);
        setItems((p) => p.filter((i) => i.id !== id));
        track('item_deleted', { template_id: target?.templateId ?? null });
        return true;
      });
      return !!r;
    },
    [run, track, items],
  );

  const setAlertsEnabled: Store['setAlertsEnabled'] = useCallback(
    async (v) => {
      await run(async () => {
        await repoRef.current.setSettings({ alertsEnabled: v });
        setSettings({ alertsEnabled: v });
      });
    },
    [run],
  );

  const noteReminderExposed = useCallback(
    (tripId: string, tripItems: Item[]) => {
      const key = `tb_exp_day:${getToday()}:${tripId}`;
      if (lsGet(key)) return;
      lsSet(key, '1');
      const ids = alertItemIds(tripItems, getToday());
      const prev = lsGet('tb_exposed:' + getToday());
      let all: string[] = [];
      try { all = prev ? JSON.parse(prev) : []; } catch { all = []; }
      lsSet('tb_exposed:' + getToday(), JSON.stringify(Array.from(new Set([...all, ...ids]))));
      const c = tripAlertCounts(tripItems, getToday());
      track('reminder_exposed', { trip_id: tripId, today_count: c.todayCount, late_count: c.lateCount });
    },
    [track],
  );
  const noteReminderClicked = useCallback(
    (tripId: string) => {
      lsSet('tb_alert_click', tripId);
      track('reminder_clicked', { trip_id: tripId });
    },
    [track],
  );

  const value = useMemo<Store>(
    () => ({
      ready, today, trips, items, settings, itemsOf, reload, createTrip, updateTrip, deleteTrip, toggleItem, saveItem,
      addItem, deleteItem, setAlertsEnabled, track, noteReminderExposed, noteReminderClicked,
    }),
    [ready, today, trips, items, settings, itemsOf, reload, createTrip, updateTrip, deleteTrip, toggleItem, saveItem, addItem, deleteItem, setAlertsEnabled, track, noteReminderExposed, noteReminderClicked],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
