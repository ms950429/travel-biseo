import { describe, it, expect } from 'vitest';
import { addDays, diffDays } from '../lib/dates';
import {
  alertMessage, autoName, badgeOf, buildSections, ddayLabel, generateItems, isActiveTrip, isPastTrip, pickAlert,
  progress, recalcOnStartChange, sectionByDue, sectionOf, tripAlertCounts, validateDates,
} from '../lib/logic';
import { TEMPLATES } from '../lib/templates';
import type { Item, Trip } from '../lib/types';

const T = '2026-10-13'; // today
const mkItem = (o: Partial<Item>): Item => ({
  id: o.id ?? Math.random().toString(36).slice(2), tripId: 't1', templateId: 'T-01', templateOrder: 0, offsetDays: 30, title: 'x',
  dueDate: '2026-10-20', status: 'todo', completedAt: null, memo: '', isCustom: false, isDueEdited: false, createdAt: '2026-10-01T00:00:00Z', ...o,
});
const mkTrip = (o: Partial<Trip>): Trip => ({
  id: 't1', name: '도쿄 11/05~08', isNameCustom: false, country: 'JP', city: '도쿄', startDate: '2026-11-05', endDate: '2026-11-08', createdAt: '', ...o,
});

describe('dates', () => {
  it('diffDays / addDays', () => {
    expect(diffDays('2026-10-13', '2026-11-05')).toBe(23);
    expect(addDays('2026-11-05', -30)).toBe('2026-10-06');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('autoName (여행 이름 자동 생성)', () => {
  it('같은 달', () => expect(autoName('도쿄', '2026-10-20', '2026-10-23')).toBe('도쿄 10/20~23'));
  it('도시가 없으면 국가 이름', () => expect(autoName(null, '2026-10-20', '2026-10-23')).toBe('일본 10/20~23'));
  it('달이 다르면 월/일을 모두', () => expect(autoName('도쿄', '2026-10-30', '2026-11-02')).toBe('도쿄 10/30~11/02'));
  it('날짜가 없으면 빈 값', () => expect(autoName('도쿄', '', '')).toBe(''));
});

describe('validateDates', () => {
  it('귀국일이 출발일보다 앞서면 오류', () => expect(validateDates('2026-10-20', '2026-10-19', T).endError).toContain('앞서'));
  it('30일까지는 허용, 31일부터 오류', () => {
    expect(validateDates('2026-10-20', '2026-11-19', T).endError).toBeNull();
    expect(validateDates('2026-10-20', '2026-11-20', T).endError).toContain('30일');
  });
  it('출발일은 오늘 이후', () => {
    expect(validateDates('2026-10-12', '2026-10-14', T).startError).not.toBeNull();
    expect(validateDates(T, '2026-10-14', T).startError).toBeNull();
  });
});

describe('generateItems (F-02)', () => {
  const items = generateItems({ country: 'JP', startDate: '2026-11-05', endDate: '2026-11-08' });
  it('일본 기준 20개, 중복 없음', () => {
    expect(items).toHaveLength(20);
    expect(new Set(items.map((i) => i.templateId)).size).toBe(20);
  });
  it('모든 항목에 권장 시점이 있고 기한 = 출발일 - 권장 시점', () => {
    for (const i of items) {
      expect([30, 14, 7, 1]).toContain(i.offsetDays);
      expect(i.dueDate).toBe(addDays('2026-11-05', -(i.offsetDays as number)));
    }
  });
  it('같은 조건이면 같은 구성', () => {
    expect(generateItems({ country: 'JP', startDate: '2026-11-05', endDate: '2026-11-08' })).toEqual(items);
  });
  it('시트와 같은 시점별 개수 (4/4/5/7)', () => {
    const by = (n: number) => TEMPLATES.filter((t) => t.offsetDays === n).length;
    expect([by(30), by(14), by(7), by(1)]).toEqual([4, 4, 5, 7]);
  });
});

describe('구간 (F-03)', () => {
  it('경계: D-30 이상 / 14~29 / 7~13 / 0~6', () => {
    const s = '2026-11-30';
    const sec = (before: number) => sectionByDue(addDays(s, -before), s);
    expect(sec(45)).toBe('D-30');
    expect(sec(30)).toBe('D-30');
    expect(sec(29)).toBe('D-14');
    expect(sec(14)).toBe('D-14');
    expect(sec(13)).toBe('D-7');
    expect(sec(7)).toBe('D-7');
    expect(sec(6)).toBe('D-1');
    expect(sec(0)).toBe('D-1');
  });
  it('기한이 지난 미완료는 "지금 해야 할 일", 완료 항목은 기한 구간에 남는다', () => {
    const trip = mkTrip({});
    const late = mkItem({ dueDate: '2026-10-06' });
    const doneLate = mkItem({ dueDate: '2026-10-06', status: 'done', completedAt: '2026-10-01T00:00:00Z' });
    expect(sectionOf(late, trip, T)).toBe('late');
    expect(sectionOf(doneLate, trip, T)).toBe('D-30');
  });
  it('항목이 없는 구간도 제목과 개수 0을 보여주고, 순서가 고정된다', () => {
    const sections = buildSections([], mkTrip({}), T, false);
    expect(sections.map((s) => s.key)).toEqual(['late', 'D-30', 'D-14', 'D-7', 'D-1']);
    expect(sections.every((s) => s.items.length === 0)).toBe(true);
  });
  it('정렬: 미완료는 기한 순 → 목록 순서 → 직접 추가 항목 맨 뒤, 완료는 맨 아래', () => {
    const trip = mkTrip({});
    const a = mkItem({ id: 'a', dueDate: '2026-10-21', templateOrder: 5 });
    const b = mkItem({ id: 'b', dueDate: '2026-10-22', templateOrder: 9 });
    const c = mkItem({ id: 'c', dueDate: '2026-10-22', templateOrder: 2 });
    const custom = mkItem({ id: 'custom', dueDate: '2026-10-22', templateOrder: null, isCustom: true, createdAt: '2026-10-05T00:00:00Z' });
    const done = mkItem({ id: 'done', dueDate: '2026-10-20', status: 'done', completedAt: '2026-10-02T00:00:00Z' });
    const sec = buildSections([a, b, c, custom, done], trip, T, false).find((s) => s.key === 'D-14')!;
    expect(sec.items.map((i) => i.id)).toEqual(['a', 'c', 'b', 'custom', 'done']);
  });
  it('미완료만 보기', () => {
    const trip = mkTrip({});
    const done = mkItem({ id: 'd', dueDate: '2026-10-22', status: 'done', completedAt: 'x' });
    const todo = mkItem({ id: 't', dueDate: '2026-10-22' });
    const sections = buildSections([done, todo], trip, T, true);
    expect(sections.flatMap((s) => s.items.map((i) => i.id))).toEqual(['t']);
  });
});

describe('배지·진행률·D-Day', () => {
  it('배지', () => {
    expect(badgeOf(mkItem({ dueDate: '2026-10-12' }), T)).toEqual({ kind: 'late', label: '기한 지남' });
    expect(badgeOf(mkItem({ dueDate: T }), T)).toEqual({ kind: 'dday', label: 'D-Day' });
    expect(badgeOf(mkItem({ dueDate: '2026-10-22' }), T)).toEqual({ kind: 'day', label: 'D-9일' });
    expect(badgeOf(mkItem({ status: 'done' }), T)).toEqual({ kind: 'done', label: '완료' });
  });
  it('진행률은 소수점 첫째 자리에서 반올림', () => {
    const mk = (done: number, total: number) => Array.from({ length: total }, (_, i) => mkItem({ status: i < done ? 'done' : 'todo' }));
    expect(progress(mk(1, 19)).pct).toBe(5);
    expect(progress(mk(1, 20)).pct).toBe(5);
    expect(progress(mk(8, 20)).pct).toBe(40);
    expect(progress(mk(2, 3)).pct).toBe(67);
    expect(progress([]).pct).toBe(0);
  });
  it('D-Day 표시', () => {
    expect(ddayLabel('2026-11-05', T)).toBe('D-23');
    expect(ddayLabel(T, T)).toBe('D-Day');
  });
});

describe('지난 여행 경계', () => {
  it('출발일 당일은 진행 중, 다음 날부터 지난 여행', () => {
    expect(isActiveTrip({ startDate: T }, T)).toBe(true);
    expect(isPastTrip({ startDate: '2026-10-12' }, T)).toBe(true);
    expect(isPastTrip({ startDate: T }, T)).toBe(false);
  });
});

describe('알림 (F-05)', () => {
  it('문구 3가지', () => {
    expect(alertMessage('도쿄 10/20~23', { todayCount: 5, lateCount: 0 })).toBe('도쿄 10/20~23 · 오늘 준비할 일 5개가 남았어요. 지금 확인해 보세요.');
    expect(alertMessage('도쿄 11/05~08', { todayCount: 0, lateCount: 3 })).toBe('도쿄 11/05~08 · 기한이 지난 항목이 3개 있어요. 지금 확인해 보세요.');
    expect(alertMessage('도쿄 10/20~23', { todayCount: 5, lateCount: 2 })).toBe('도쿄 10/20~23 · 오늘 준비할 일 5개, 기한이 지난 항목 2개가 있어요. 지금 확인해 보세요.');
  });
  it('오늘 기한·기한 지남만 센다 (완료 항목 제외)', () => {
    const items = [mkItem({ dueDate: T }), mkItem({ dueDate: '2026-10-01' }), mkItem({ dueDate: '2026-10-01', status: 'done' }), mkItem({ dueDate: '2026-10-30' })];
    expect(tripAlertCounts(items, T)).toEqual({ todayCount: 1, lateCount: 1 });
  });
  it('여러 여행이면 출발일이 가장 가까운 여행의 알림 1건', () => {
    const a = mkTrip({ id: 'a', startDate: '2026-12-01', endDate: '2026-12-04' });
    const b = mkTrip({ id: 'b', startDate: '2026-10-20', endDate: '2026-10-23' });
    const past = mkTrip({ id: 'p', startDate: '2026-10-01', endDate: '2026-10-03' });
    const all: Item[] = [mkItem({ tripId: 'a', dueDate: '2026-10-01' }), mkItem({ tripId: 'b', dueDate: T }), mkItem({ tripId: 'p', dueDate: '2026-09-01' })];
    const pick = pickAlert([a, b, past], (id) => all.filter((i) => i.tripId === id), T);
    expect(pick?.trip.id).toBe('b'); // 지난 여행(p)은 제외
  });
});

describe('출발일 수정 시 기한 재계산', () => {
  it('자동 생성 미완료 항목만 다시 계산하고, 직접 정한 기한과 완료 항목은 유지', () => {
    const auto = mkItem({ id: 'auto', offsetDays: 14, dueDate: '2026-10-22' });
    const edited = mkItem({ id: 'edited', offsetDays: 14, dueDate: '2026-10-25', isDueEdited: true });
    const custom = mkItem({ id: 'custom', templateId: null, offsetDays: null, isCustom: true, isDueEdited: true, dueDate: '2026-10-30' });
    const done = mkItem({ id: 'done', offsetDays: 14, dueDate: '2026-10-22', status: 'done' });
    const patches = recalcOnStartChange([auto, edited, custom, done], '2026-11-10');
    const m = Object.fromEntries(patches.map((p) => [p.id, p.patch.dueDate]));
    expect(m.auto).toBe('2026-10-27'); // 11/10 - 14일
    expect(m.edited).toBeUndefined();
    expect(m.custom).toBeUndefined();
    expect(m.done).toBeUndefined();
  });
  it('새 출발일보다 늦은 직접 기한은 새 출발일로 맞춘다', () => {
    const custom = mkItem({ id: 'custom', isCustom: true, isDueEdited: true, dueDate: '2026-11-04' });
    const patches = recalcOnStartChange([custom], '2026-11-02');
    expect(patches).toEqual([{ id: 'custom', patch: { dueDate: '2026-11-02' } }]);
  });
});
