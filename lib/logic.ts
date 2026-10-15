import { addDays, diffDays, fmtKo, isValidDate, parts, pad } from './dates';
import { TEMPLATES, COUNTRY_NAME } from './templates';
import type { Item, ItemPatch, NewItem, SectionKey, Trip } from './types';
import { MSG } from './messages';

export const MAX_ACTIVE_TRIPS = 3;
export const MAX_TRIP_DAYS = 30;
export const NAME_MAX = 20;
export const MEMO_MAX = 50;
export const TITLE_MAX = 40;

/** 출발일 당일까지는 진행 중. 출발일 다음 날 0시부터 지난 여행. */
export const isPastTrip = (t: Pick<Trip, 'startDate'>, today: string) => t.startDate < today;
export const isActiveTrip = (t: Pick<Trip, 'startDate'>, today: string) => !isPastTrip(t, today);

/** 자동 생성 여행 이름: "도쿄 10/20~23", 도시가 없으면 "일본 10/20~23", 달이 다르면 "도쿄 10/30~11/02" */
export function autoName(city: string | null, start: string, end: string): string {
  if (!isValidDate(start) || !isValidDate(end)) return '';
  const [sy, sm, sd] = parts(start);
  const [ey, em, ed] = parts(end);
  const base = city && city.trim() ? city.trim() : COUNTRY_NAME.JP;
  const range = sy === ey && sm === em ? `${pad(sm)}/${pad(sd)}~${pad(ed)}` : `${pad(sm)}/${pad(sd)}~${pad(em)}/${pad(ed)}`;
  return `${base} ${range}`;
}

export function validateDates(start: string, end: string, today: string) {
  let startError: string | null = null;
  let endError: string | null = null;
  if (start && isValidDate(start) && start < today) startError = MSG.startInPast;
  if (start && end && isValidDate(start) && isValidDate(end)) {
    const d = diffDays(start, end);
    if (d < 0) endError = MSG.endBeforeStart;
    else if (d > MAX_TRIP_DAYS) endError = MSG.endTooLong;
  }
  return { startError, endError };
}

/** F-02: 서비스에 정의된 준비 항목 중 여행 조건에 맞는 항목을 복사해 체크리스트를 만든다. */
export function generateItems(trip: { country: 'JP'; startDate: string; endDate: string }): NewItem[] {
  const days = diffDays(trip.startDate, trip.endDate) + 1;
  const list = TEMPLATES.filter((t) => {
    if (t.country !== 'ALL' && t.country !== trip.country) return false;
    if (t.minDays != null && days < t.minDays) return false;
    if (t.maxDays != null && days > t.maxDays) return false;
    return true;
  });
  const seen = new Set<string>();
  const out: NewItem[] = [];
  list.forEach((t, i) => {
    if (seen.has(t.id)) return; // 같은 항목은 한 번만
    seen.add(t.id);
    out.push({
      templateId: t.id,
      templateOrder: i,
      offsetDays: t.offsetDays,
      title: t.title,
      dueDate: addDays(trip.startDate, -t.offsetDays),
      status: 'todo',
      completedAt: null,
      memo: '',
      isCustom: false,
      isDueEdited: false,
    });
  });
  return out;
}

// ---------- F-03 sections ----------
export const SECTION_ORDER: SectionKey[] = ['late', 'D-30', 'D-14', 'D-7', 'D-1'];
export const SECTION_TITLE: Record<SectionKey, string> = {
  late: '지금 해야 할 일',
  'D-30': 'D-30',
  'D-14': 'D-14',
  'D-7': 'D-7',
  'D-1': 'D-1',
};

/** 기한이 출발일 며칠 전인지로 구간을 정한다. D-30: 30일 이상, D-14: 14~29, D-7: 7~13, D-1: 0~6 */
export function sectionByDue(dueDate: string, startDate: string): Exclude<SectionKey, 'late'> {
  const before = diffDays(dueDate, startDate);
  if (before >= 30) return 'D-30';
  if (before >= 14) return 'D-14';
  if (before >= 7) return 'D-7';
  return 'D-1';
}
/** 기한이 오늘보다 이전인 미완료 항목은 구간과 관계없이 "지금 해야 할 일" */
export function sectionOf(item: Item, trip: Pick<Trip, 'startDate'>, today: string): SectionKey {
  if (item.status === 'todo' && item.dueDate < today) return 'late';
  return sectionByDue(item.dueDate, trip.startDate);
}

const ord = (i: Item) => (i.templateOrder == null ? 9999 : i.templateOrder);
export function compareItems(a: Item, b: Item): number {
  const da = a.status === 'done';
  const db = b.status === 'done';
  if (da !== db) return da ? 1 : -1; // 완료 항목은 구간 맨 아래
  if (da && db) return (a.completedAt ?? '').localeCompare(b.completedAt ?? ''); // 완료 시각이 빠른 순
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1; // 기한이 빠른 순
  if (ord(a) !== ord(b)) return ord(a) - ord(b); // 같은 기한이면 준비 항목 목록 순서, 직접 추가 항목은 맨 뒤
  return a.createdAt.localeCompare(b.createdAt);
}

export type Section = { key: SectionKey; title: string; items: Item[] };
/** 항목이 없는 구간도 제목과 개수(0)를 보여준다. */
export function buildSections(items: Item[], trip: Pick<Trip, 'startDate'>, today: string, onlyTodo: boolean): Section[] {
  const visible = onlyTodo ? items.filter((i) => i.status === 'todo') : items;
  return SECTION_ORDER.map((key) => ({
    key,
    title: SECTION_TITLE[key],
    items: visible.filter((i) => sectionOf(i, trip, today) === key).sort(compareItems),
  }));
}

export type Badge = { kind: 'late' | 'day' | 'dday' | 'done'; label: string };
export function badgeOf(item: Item, today: string): Badge {
  if (item.status === 'done') return { kind: 'done', label: '완료' };
  const n = diffDays(today, item.dueDate);
  if (n < 0) return { kind: 'late', label: '기한 지남' };
  if (n === 0) return { kind: 'dday', label: 'D-Day' };
  return { kind: 'day', label: `D-${n}일` };
}
export function ddayLabel(startDate: string, today: string): string {
  const n = diffDays(today, startDate);
  return n === 0 ? 'D-Day' : n > 0 ? `D-${n}` : `D+${-n}`;
}

export function progress(items: Item[]) {
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// ---------- F-05 alerts ----------
export type TripAlert = { todayCount: number; lateCount: number };
export function tripAlertCounts(items: Item[], today: string): TripAlert {
  let todayCount = 0;
  let lateCount = 0;
  for (const i of items) {
    if (i.status !== 'todo') continue;
    if (i.dueDate === today) todayCount++;
    else if (i.dueDate < today) lateCount++;
  }
  return { todayCount, lateCount };
}
export function alertMessage(name: string, c: TripAlert): string {
  const tail = '지금 확인해 보세요.';
  if (c.todayCount > 0 && c.lateCount > 0)
    return `${name} · 오늘 준비할 일 ${c.todayCount}개, 기한이 지난 항목 ${c.lateCount}개가 있어요. ${tail}`;
  if (c.todayCount > 0) return `${name} · 오늘 준비할 일 ${c.todayCount}개가 남았어요. ${tail}`;
  return `${name} · 기한이 지난 항목이 ${c.lateCount}개 있어요. ${tail}`;
}
/** 알림이 있는 여행이 여러 개면 출발일이 가장 가까운 여행의 알림 1건만 보여준다. */
export function pickAlert(trips: Trip[], itemsOf: (tripId: string) => Item[], today: string) {
  const cand = trips
    .filter((t) => isActiveTrip(t, today))
    .map((t) => ({ trip: t, counts: tripAlertCounts(itemsOf(t.id), today) }))
    .filter((x) => x.counts.todayCount + x.counts.lateCount > 0)
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
  return cand[0] ?? null;
}
/** 알림에 포함되는 항목 id (오늘 기한 + 기한 지남 미완료) */
export function alertItemIds(items: Item[], today: string): string[] {
  return items.filter((i) => i.status === 'todo' && i.dueDate <= today).map((i) => i.id);
}

// ---------- F-01 date edit ----------
/** 출발일이 바뀌면 자동 생성한 미완료 항목의 기한만 다시 계산한다.
 *  완료한 항목과 사용자가 직접 정한 기한은 유지하되, 새 출발일보다 늦으면 새 출발일로 맞춘다. */
export function recalcOnStartChange(items: Item[], newStart: string): { id: string; patch: ItemPatch }[] {
  const out: { id: string; patch: ItemPatch }[] = [];
  for (const i of items) {
    if (i.status === 'done') continue;
    let due = i.dueDate;
    if (!i.isCustom && !i.isDueEdited && i.offsetDays != null) due = addDays(newStart, -i.offsetDays);
    else if (due > newStart) due = newStart;
    if (due !== i.dueDate) out.push({ id: i.id, patch: { dueDate: due } });
  }
  return out;
}

export function dateRangeKo(t: Pick<Trip, 'startDate'>): string {
  return `출발 ${fmtKo(t.startDate)}`;
}
