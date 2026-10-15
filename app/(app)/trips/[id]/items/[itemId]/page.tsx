'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { usePopup } from '@/components/Popup';
import { IconBack } from '@/components/Icons';
import { MSG } from '@/lib/messages';
import { MEMO_MAX, TITLE_MAX, isPastTrip } from '@/lib/logic';
import { fmtKo, isValidDate } from '@/lib/dates';

export default function ItemDetail() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const store = useStore();
  const popup = usePopup();
  const router = useRouter();
  const trip = store.trips.find((t) => t.id === id);
  const item = store.items.find((i) => i.id === itemId && i.tripId === id);
  const [title, setTitle] = useState(item?.title ?? '');
  const [memo, setMemo] = useState(item?.memo ?? '');
  const [due, setDue] = useState(item?.dueDate ?? '');
  const [busy, setBusy] = useState(false);

  if (!trip || !item) return <div className="center">항목을 찾을 수 없어요.</div>;
  const readOnly = isPastTrip(trip, store.today);
  const back = () => router.push(`/trips/${trip.id}`); // 저장하지 않고 뒤로 가면 변경 내용은 사라진다
  const dueOk = isValidDate(due) && due <= trip.startDate; // 출발일을 지나지 않는 날짜만 (오늘 이전 날짜도 가능)
  const titleOk = !item.isCustom || title.trim() !== '';
  const canSave = !readOnly && dueOk && titleOk && !busy;

  async function save() {
    if (!canSave || !item || !trip) return;
    setBusy(true);
    try {
      const ok = await store.saveItem(item.id, {
        memo: memo.slice(0, MEMO_MAX),
        dueDate: due,
        isDueEdited: item.isDueEdited || due !== item.dueDate,
        ...(item.isCustom ? { title: title.trim() } : {}),
      });
      if (ok) router.push(`/trips/${trip.id}`);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    popup.confirm(MSG.itemDelete, async () => {
      if (!item || !trip) return;
      const ok = await store.deleteItem(item.id);
      if (ok) router.replace(`/trips/${trip.id}`);
    });
  }

  return (
    <>
      <div className="topbar" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <button className="icon-btn" aria-label="뒤로" onClick={back}><IconBack /></button>
        <div className="page-title">항목 상세</div>
      </div>
      <div className="page" style={{ paddingTop: 10 }}>
        {item.isCustom ? (
          <div className="field">
            <label className="lab" htmlFor="i-title">제목</label>
            <div className="wrap">
              <input id="i-title" className="inp" value={title} maxLength={TITLE_MAX} disabled={readOnly} onChange={(e) => setTitle(e.target.value)} />
              <span className="counter">{title.length}/{TITLE_MAX}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 800 }}>{item.title}</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.offsetDays != null && <span className="tag">권장 시점 D-{item.offsetDays}</span>}
          <span className="tag">기한 {isValidDate(due) ? fmtKo(due) : '-'}</span>
        </div>
        <div className="field wrap-area">
          <label className="lab" htmlFor="i-memo">메모</label>
          <div className="wrap wrap-area">
            <textarea id="i-memo" className="area" value={memo} maxLength={MEMO_MAX} disabled={readOnly} placeholder="메모를 남겨 보세요." onChange={(e) => setMemo(e.target.value)} />
            <span className="counter">{memo.length}/{MEMO_MAX}</span>
          </div>
        </div>
        <div className="field">
          <label className="lab" htmlFor="i-due">기한</label>
          <input id="i-due" type="date" className={'inp' + (!dueOk && due ? ' err' : '')} value={due} max={trip.startDate} disabled={readOnly} onChange={(e) => setDue(e.target.value)} />
          {!dueOk && due ? <div className="err-t" role="alert">기한은 출발일까지 선택할 수 있어요.</div> : null}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={remove} data-testid="delete-item">삭제</button>
            <button className={'btn btn-primary' + (busy ? ' loading' : '')} style={{ flex: 1 }} disabled={!canSave} onClick={save} data-testid="save-item">
              {busy && <span className="spin" />}저장
            </button>
          </div>
        )}
      </div>
    </>
  );
}
