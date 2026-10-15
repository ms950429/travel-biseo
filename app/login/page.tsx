'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { MSG } from '@/lib/messages';
import { Logo } from '@/components/Logo';
import { Character } from '@/components/Character';

/** 로고를 이 간격(ms) 안에 이어서 이 횟수만큼 누르면 데모 모드로 들어간다. */
const DEMO_CLICKS = 8;
const DEMO_GAP_MS = 2000;

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const clicks = useRef({ n: 0, last: 0 });

  useEffect(() => {
    if (auth.status === 'authed') router.replace('/');
  }, [auth.status, router]);

  function onLogoClick() {
    const now = Date.now();
    const c = clicks.current;
    c.n = c.n > 0 && now - c.last <= DEMO_GAP_MS ? c.n + 1 : 1; // 연속 클릭만 센다
    c.last = now;
    if (c.n >= DEMO_CLICKS) {
      c.n = 0;
      auth.enterDemo();
      router.replace('/');
    }
  }

  async function google() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await auth.signInGoogle(); // 성공하면 Google 인증 화면으로 이동한다
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="cloud" style={{ left: -50, top: 64, width: 220, height: 80, background: 'radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,0))' }} />
      <div className="cloud" style={{ right: -60, top: 176, width: 240, height: 90, background: 'radial-gradient(closest-side,rgba(255,255,255,.85),rgba(255,255,255,0))' }} />
      <div style={{ position: 'relative', padding: '84px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>여행 준비, 필요한 순간에 챙겨주는 비서</div>
        <div className="logo-hit" onClick={onLogoClick} data-testid="logo">
          <Logo width={200} />
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', marginTop: 6 }}>
          여행 준비사항을 미리 알려주고,<br />하나씩 완료할 수 있도록 도와주는<br />개인화 체크리스트 서비스
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0, padding: '16px 0' }}>
        <Character width={164} />
        <div className="shadow-e" style={{ width: 130, height: 16, marginTop: -8 }} />
      </div>
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        {failed && <div role="alert" style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--danger)', lineHeight: 1.5 }}>{MSG.loginFail}</div>}
        <button className="btn btn-full" onClick={google} disabled={busy}
          style={{ background: '#fff', color: 'var(--navy)', border: '1.5px solid #9fb0c4', boxShadow: 'var(--shadow-1)', height: 52, borderRadius: 14 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #193656', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>G</span>
          Google로 시작하기
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--text-3)' }}>
          계속하면 <Link href="/terms"><u>이용약관</u></Link>·<Link href="/privacy"><u>개인정보 처리방침</u></Link>에 동의한 것으로 봐요.
        </div>
      </div>
    </main>
  );
}
