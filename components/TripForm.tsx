'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { usePopup } from '@/components/Popup';
import { IconBack } from '@/components/Icons';
import { MSG } from '@/lib/messages';
import { CITIES_JP, COUNTRY_NAME } from '@/lib/templates';
import { MAX_ACTIVE_TRIPS, NAME_MAX, autoName, generateItems, isActiveTrip, recalcOnStartChange, validateDates } from '@/lib/logic';
import { diffDays, isValidDate } from '@/lib/dates';
import type { Trip } from '@/lib/types';

/** S-02: 새 여행 만들기와 여행 정보 수정을 함께 쓴다. */
export function TripForm({ trip }: { trip?: Trip }) {
  const edit = !!trip;
  const store = useStore();
  const popup = usePopup();
  const router = useRouter();
  const { today } = store;

  const [city, setCity] = useState(trip?.city ?? '');
  const [start, setStart] = useState(trip?.startDate ?? '');
  const [end, setEnd] = useState(trip?.endDate ?? '');
  const [name, setName] = useState(trip?.name ?? '');
  const [custom, setCustom] = useState(trip?.isNameCustom ?? false);
  const [busy, setBusy] = useState(false);

  // 이름 기본값은 자동 생성 값이며, 이름을 직접 고치면 그 이름을 유지한다.
  const auto = useMemo(() => autoName(city || null, start, end), [city, start, end]);
  useEffect(() => {
    if (!custom) setName(auto);
  }, [auto, custom]);

  const { startError, endError } = validateDates(start, end, today);
  const filled = isValidDate(start) && isValidDate(end);
  const imminent = isValidDate(start) && !startError && diffDays(today, start) <= 1;
  const canSubmit = filled && !startError && !endError && !busy;

  function onName(v: string) {
    const nv = v.slice(0, NAME_MAX);
    setName(nv);
    setCustom(nv.trim() !== ''); // 비우면 자동 생성 값으로 돌아간다
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const finalName = (name.trim() || auto).slice(0, NAME_MAX);
      const isCustom = custom && name.trim() !== '' && name.trim() !== auto;
      if (!edit) {
        if (store.trips.filter((t) => isActiveTrip(t, today)).length >= MAX_ACTIVE_TRIPS) {
          popup.alert(MSG.tripLimit, () => router.replace('/'));
          return;
        }
        let items;
        try {
          items = generateItems({ country: 'JP', startDate: start, endDate: end });
          if (items.length === 0) throw new Error('empty checklist');
        } catch (e) {
          console.error(e);
          popup.alert(MSG.generateFail, () => router.replace('/')); // 여행을 저장하지 않고 S-01로 돌아간다
          return;
        }
        const created = await store.createTrip(
          { name: finalName, isNameCustom: isCustom, country: 'JP', city: city || null, startDate: start, endDate: end },
          items,
        );
        if (created === 'fail') popup.alert(MSG.generateFail, () => router.replace('/')); // 저장하지 않고 S-01로
        else if (created !== 'offline') router.replace(`/trips/${created.id}?from=create`);
      } else if (trip) {
        const startChanged = start !== trip.startDate;
        const patches = startChanged ? recalcOnStartChange(store.itemsOf(trip.id), start) : [];
        const ok = await store.updateTrip(
          trip.id,
          { name: finalName, isNameCustom: isCustom, city: city || null, startDate: start, endDate: end },
          patches,
        );
        if (ok) router.replace('/'); // 수정 후 S-01로 돌아간다. 체크리스트는 새로 만들지 않는다.
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <button className="icon-btn" aria-label="뒤로" onClick={() => router.back()}><IconBack /></button>
        <div className="page-title">{edit ? '여행 정보 수정' : '여행 정보 입력'}</div>
      </div>
      <div className="page" style={{ paddingTop: 10 }}>
        <div>
          <div className="field">
            <label className="lab" htmlFor="f-name">여행 이름</label>
            <div className="wrap">
              <input id="f-name" className="inp" value={name} maxLength={NAME_MAX} onChange={(e) => onName(e.target.value)} placeholder="날짜를 입력하면 자동으로 채워져요" />
              <span className="counter">{name.length}/{NAME_MAX}</span>
            </div>
          </div>
          <div className="field">
            <label className="lab" htmlFor="f-country">여행 국가{edit ? '' : ' (필수)'}</label>
            <select id="f-country" className="inp" value="JP" disabled={edit} onChange={() => undefined}>
              <option value="JP">{COUNTRY_NAME.JP}</option>
            </select>
          </div>
          <div className="field">
            <label className="lab" htmlFor="f-city">도시 (선택)</label>
            <select id="f-city" className="inp" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">선택 안 함</option>
              {CITIES_JP.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="lab" htmlFor="f-start">출발일 (필수)</label>
            <input id="f-start" type="date" className={'inp' + (startError ? ' err' : '')} value={start} min={today} onChange={(e) => setStart(e.target.value)} />
            {startError && <div className="err-t" role="alert">{startError}</div>}
          </div>
          <div className="field">
            <label className="lab" htmlFor="f-end">귀국일 (필수)</label>
            <input id="f-end" type="date" className={'inp' + (endError ? ' err' : '')} value={end} onChange={(e) => setEnd(e.target.value)} />
            {endError ? <div className="err-t" role="alert">{endError}</div> : <div className="hint">귀국일은 출발일로부터 30일 이내로 입력할 수 있어요.</div>}
          </div>
        </div>
        {imminent && <div className="notice" role="status">{MSG.imminent}</div>}
        <button className={'btn btn-primary btn-full' + (busy ? ' loading' : '')} style={{ marginTop: 'auto' }} disabled={!canSubmit} onClick={submit} data-testid="submit">
          {busy && <span className="spin" />}
          {edit ? '수정' : '준비 시작!'}
        </button>
      </div>
    </>
  );
}
