'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { AlertBanner } from '@/components/AlertBanner';
import { Character } from '@/components/Character';
import { IconBack, IconCheck, IconPlusTeal } from '@/components/Icons';
import { MSG } from '@/lib/messages';
import { alertItemIds, badgeOf, buildSections, ddayLabel, isPastTrip, progress } from '@/lib/logic';
import { fmtKo } from '@/lib/dates';
import type { Item } from '@/lib/types';

function Checklist() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const store = useStore();
  const router = useRouter();
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const trip = store.trips.find((t) => t.id === id);
  const items = useMemo(() => store.itemsOf(id), [store, id]);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!trip) router.replace('/');
  }, [trip, router]);
  useEffect(() => {
    if (trip) store.track('checklist_viewed', { trip_id: trip.id, from: sp.get('from') ?? 'home' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);
  const hl = useMemo(() => (sp.get('hl') ? new Set(alertItemIds(items, store.today)) : new Set<string>()), [sp, items, store.today]);
  useEffect(() => {
    if (hl.size && !scrolled.current) {
      const el = document.querySelector('[data-hl="true"]');
      if (el) {
        scrolled.current = true;
        el.scrollIntoView({ block: 'center' });
      }
    }
  }, [hl, items]);

  if (!trip) return <div className="center">불러오는 중…</div>;
  const readOnly = isPastTrip(trip, store.today); // 지난 여행은 읽기 전용
  const p = progress(items);
  const sections = buildSections(items, trip, store.today, onlyTodo);

  async function toggle(it: Item) {
    if (busyIds.includes(it.id)) return; // 같은 요청이 두 번 전송되지 않게
    setBusyIds((b) => [...b, it.id]);
    try {
      await store.toggleItem(it);
    } finally {
      setBusyIds((b) => b.filter((x) => x !== it.id));
    }
  }

  return (
    <>
      <div className="topbar-col">
        <AlertBanner />
        <div className="row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button className="icon-btn" aria-label="뒤로" onClick={() => router.push('/')}><IconBack /></button>
            <div style={{ minWidth: 0 }}>
              <div className="page-title" data-testid="trip-title">{trip.name}</div>
              <div className="page-sub">출발 {fmtKo(trip.startDate)}{readOnly ? ' · 지난 여행' : ` · ${ddayLabel(trip.startDate, store.today)}`}</div>
            </div>
          </div>
          {!readOnly && (
            <button className="btn btn-sm btn-secondary" style={{ color: 'var(--teal)', borderColor: '#b9e2db' }} onClick={() => router.push(`/trips/${trip.id}/items/new`)} data-testid="add-item">
              <IconPlusTeal />항목 추가
            </button>
          )}
        </div>
        <div className="pcard">
          <div className="pc-top">
            <span className="lab2">진행률</span>
            <span className="num"><b data-testid="pct">{p.pct}</b>% · {p.done}/{p.total} 완료</span>
          </div>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${p.pct}%` }} /></div>
        </div>
      </div>
      <div className="page" style={{ paddingTop: 8, gap: 8 }}>
        {p.total > 0 && p.done === p.total && (
          <div className="done-card" data-testid="all-done">
            <div className="ch"><Character width={96} /><div className="shadow-e" style={{ width: 84, height: 10, marginTop: -4 }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="done-title">준비 완료</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)', marginTop: 4 }}>{MSG.allDone}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--teal)', fontWeight: 700, marginTop: 2 }}>{MSG.wish}</div>
            </div>
          </div>
        )}
        <div className="seg" style={{ alignSelf: 'flex-start' }} role="group" aria-label="필터">
          <button aria-pressed={!onlyTodo} onClick={() => setOnlyTodo(false)}>전체</button>
          <button aria-pressed={onlyTodo} onClick={() => setOnlyTodo(true)}>미완료만</button>
        </div>
        {sections.map((s) => (
          <div key={s.key} data-testid={`section-${s.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className={'sec' + (s.key === 'late' ? ' late' : '')}>
              <span className="dot" />{s.title} <span className="n">· {s.items.length}</span>
            </div>
            <div className="list">
              {s.items.map((it) => {
                const b = badgeOf(it, store.today);
                const done = it.status === 'done';
                return (
                  <div key={it.id} className={'item' + (done ? ' done' : '') + (hl.has(it.id) ? ' hl' : '')} data-testid="item" data-hl={hl.has(it.id)}>
                    <button className="cb-hit" role="checkbox" aria-checked={done} aria-label={it.title} disabled={readOnly || busyIds.includes(it.id)} onClick={() => toggle(it)}>
                      <span className={'cb' + (done ? ' on' : '')}>{done && <IconCheck />}</span>
                    </button>
                    <button className="item-main" onClick={() => router.push(`/trips/${trip.id}/items/${it.id}`)}>
                      <div className="item-body">
                        <div className="item-title">{it.title}</div>
                        {it.memo && <div className="memo">{it.memo}</div>}
                      </div>
                      <span className={`badge badge-${b.kind}`}>{b.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="center">불러오는 중…</div>}>
      <Checklist />
    </Suspense>
  );
}
