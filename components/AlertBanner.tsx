'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { alertMessage, pickAlert } from '@/lib/logic';
import { IconBellWhite, IconChevTeal } from './Icons';

/** 서비스 페이지 상단 알림. 닫기 버튼은 없다. 항목을 처리하면 사라진다. */
export function AlertBanner() {
  const store = useStore();
  const router = useRouter();
  const pick = store.settings.alertsEnabled ? pickAlert(store.trips, store.itemsOf, store.today) : null;
  const tripId = pick?.trip.id;
  useEffect(() => {
    if (pick) store.noteReminderExposed(pick.trip.id, store.itemsOf(pick.trip.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, pick?.counts.todayCount, pick?.counts.lateCount]);
  if (!pick) return null;
  const msg = alertMessage(pick.trip.name, pick.counts);
  const [name, ...rest] = msg.split(' · ');
  return (
    <button
      className="banner"
      data-testid="alert-banner"
      onClick={() => {
        store.noteReminderClicked(pick.trip.id);
        router.push(`/trips/${pick.trip.id}?from=alert&hl=1`);
      }}
    >
      <span className="ico"><IconBellWhite /></span>
      <span className="txt"><b>{name}</b> · {rest.join(' · ')}</span>
      <IconChevTeal />
    </button>
  );
}
