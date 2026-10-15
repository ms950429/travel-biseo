'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { IconBack } from '@/components/Icons';
import { TITLE_MAX, isPastTrip } from '@/lib/logic';
import { isValidDate } from '@/lib/dates';

export default function NewItem() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const trip = store.trips.find((t) => t.id === id);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  if (!trip) return <div className="center">여행을 찾을 수 없어요.</div>;
  if (isPastTrip(trip, store.today)) return <div className="center">지난 여행은 항목을 추가할 수 없어요.</div>;
  const dueOk = isValidDate(due) && due <= trip.startDate;
  const canAdd = title.trim() !== '' && dueOk && !busy;

  async function add() {
    if (!canAdd || !trip) return;
    setBusy(true);
    try {
      const ok = await store.addItem(trip.id, {
        templateId: null, templateOrder: null, offsetDays: null, title: title.trim(), dueDate: due,
        status: 'todo', completedAt: null, memo: '', isCustom: true, isDueEdited: true,
      });
      if (ok) router.replace(`/trips/${trip.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <button className="icon-btn" aria-label="뒤로" onClick={() => router.push(`/trips/${trip.id}`)}><IconBack /></button>
        <div className="page-title">항목 추가</div>
      </div>
      <div className="page" style={{ paddingTop: 10 }}>
        <div className="field">
          <label className="lab" htmlFor="n-title">제목 (필수)</label>
          <div className="wrap">
            <input id="n-title" className="inp" value={title} maxLength={TITLE_MAX} placeholder="예) 포켓 와이파이 대여" onChange={(e) => setTitle(e.target.value)} />
            <span className="counter">{title.length}/{TITLE_MAX}</span>
          </div>
        </div>
        <div className="field">
          <label className="lab" htmlFor="n-due">기한 (필수)</label>
          <input id="n-due" type="date" className={'inp' + (!dueOk && due ? ' err' : '')} value={due} max={trip.startDate} onChange={(e) => setDue(e.target.value)} />
          {!dueOk && due ? <div className="err-t" role="alert">기한은 출발일까지 선택할 수 있어요.</div> : <div className="hint">출발일까지 선택할 수 있어요.</div>}
        </div>
        <button className={'btn btn-primary btn-full' + (busy ? ' loading' : '')} style={{ marginTop: 'auto' }} disabled={!canAdd} onClick={add} data-testid="submit-item">
          {busy && <span className="spin" />}추가
        </button>
      </div>
    </>
  );
}
