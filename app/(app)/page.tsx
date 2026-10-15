'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { usePopup } from '@/components/Popup';
import { AlertBanner } from '@/components/AlertBanner';
import { Logo } from '@/components/Logo';
import { IconBell, IconChevGray, IconPlusWhite } from '@/components/Icons';
import { MSG } from '@/lib/messages';
import { MAX_ACTIVE_TRIPS, ddayLabel, isActiveTrip, isPastTrip, progress, tripAlertCounts } from '@/lib/logic';
import { fmtKo } from '@/lib/dates';
import type { Trip } from '@/lib/types';

export default function Home() {
  const store = useStore();
  const auth = useAuth();
  const popup = usePopup();
  const router = useRouter();
  const [pastOpen, setPastOpen] = useState(false);
  const { today } = store;
  const active = store.trips.filter((t) => isActiveTrip(t, today));
  const past = store.trips.filter((t) => isPastTrip(t, today));

  function newTrip() {
    if (active.length >= MAX_ACTIVE_TRIPS) return popup.alert(MSG.tripLimit); // 3개이면 안내만 하고 이동하지 않는다
    router.push('/trips/new');
  }
  function removeTrip(t: Trip) {
    popup.confirm(MSG.tripDelete, async () => {
      await store.deleteTrip(t.id);
    });
  }
  function logoutMenu() {
    popup.open(MSG.logoutChoice, [
      { label: '취소', kind: 'secondary' },
      {
        label: '탈퇴',
        kind: 'danger',
        onClick: () =>
          popup.confirm(MSG.withdraw, async () => {
            try {
              await auth.withdraw();
              router.replace('/login');
            } catch (e) {
              console.error(e);
              popup.alert(MSG.serverError);
            }
          }),
      },
      {
        label: '로그아웃', // 확인 없이 바로 처리한다
        kind: 'primary',
        onClick: async () => {
          await auth.logout();
          router.replace('/login');
        },
      },
    ]);
  }

  function card(t: Trip, readOnly: boolean) {
    const items = store.itemsOf(t.id);
    const p = progress(items);
    const c = tripAlertCounts(items, today);
    return (
      <div className="trip" key={t.id} data-testid="trip-card">
        <button className="trip-main" onClick={() => router.push(`/trips/${t.id}`)}>
          <div className="trip-top">
            <div>
              <div className="trip-name">{t.name}</div>
              <div className="trip-sub">출발 {fmtKo(t.startDate)}</div>
            </div>
            {!readOnly && <span className="badge badge-dday">{ddayLabel(t.startDate, today)}</span>}
          </div>
          <div style={{ width: '100%' }}>
            <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
            <div className="prog-txt"><b>{p.pct}%</b><span>{p.done}/{p.total} 완료</span></div>
          </div>
        </button>
        {!readOnly && (
          <div className="trip-foot">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.todayCount > 0 && <span className="chip chip-teal">오늘 할 일 {c.todayCount}개</span>}
              {c.lateCount > 0 && <span className="chip chip-red">기한 지난 항목 {c.lateCount}개</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => router.push(`/trips/${t.id}/edit`)}>수정</button>
              <button className="btn btn-sm btn-secondary" onClick={() => removeTrip(t)}>삭제</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <Logo width={76} />
        <button className="btn btn-sm btn-secondary" style={{ height: 34 }} onClick={() => router.push('/settings/alerts')}>
          <IconBell />알림 설정
        </button>
      </div>
      <div className="page" style={{ paddingTop: 4 }}>
        <AlertBanner />
        <div style={{ fontSize: 16, fontWeight: 700 }}>진행 중인 여행 {active.length}/{MAX_ACTIVE_TRIPS}</div>
        {active.map((t) => card(t, false))}
        <button className="btn btn-primary btn-full" onClick={newTrip} data-testid="new-trip"><IconPlusWhite />새 여행 만들기</button>
        {pastOpen && past.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{past.map((t) => card(t, true))}</div>}
      </div>
      <div className="home-foot">
        <button className="link-btn" onClick={() => setPastOpen((v) => !v)} aria-expanded={pastOpen}>
          지난 여행 {past.length}개<IconChevGray open={pastOpen} />
        </button>
        <button className="btn btn-sm btn-secondary" onClick={logoutMenu} data-testid="logout">로그아웃</button>
      </div>
    </>
  );
}
