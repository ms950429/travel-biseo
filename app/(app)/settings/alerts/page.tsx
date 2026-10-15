'use client';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { IconBack } from '@/components/Icons';
import { MSG } from '@/lib/messages';

export default function AlertSettings() {
  const store = useStore();
  const router = useRouter();
  const on = store.settings.alertsEnabled;
  return (
    <>
      <div className="topbar" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <button className="icon-btn" aria-label="뒤로" onClick={() => router.push('/')}><IconBack /></button>
        <div className="page-title">알림 설정</div>
      </div>
      <div className="page" style={{ paddingTop: 10 }}>
        <div className="setrow">
          <b style={{ fontSize: 16 }}>알림 받기</b>
          <button className="sw" role="switch" aria-checked={on} aria-label="알림 받기" onClick={() => store.setAlertsEnabled(!on)} data-testid="alert-switch" />
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{MSG.alertsHint}</div>
      </div>
    </>
  );
}
