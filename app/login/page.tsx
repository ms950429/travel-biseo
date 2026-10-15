'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Character } from '@/components/Character';

/**
 * 체험판: "체험하기" 버튼을 누르면 데모 모드로 들어간다. (데이터는 이 브라우저에만 저장된다)
 * Google 로그인 코드(auth.signInGoogle)는 남겨 두었고, 정식 서비스로 전환할 때 이 버튼에 다시 연결하면 된다.
 */
export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === 'authed') router.replace('/');
  }, [auth.status, router]);

  function startTrial() {
    auth.enterDemo();
    router.replace('/');
  }

  return (
    <main className="login">
      <div className="cloud" style={{ left: -50, top: 64, width: 220, height: 80, background: 'radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,0))' }} />
      <div className="cloud" style={{ right: -60, top: 176, width: 240, height: 90, background: 'radial-gradient(closest-side,rgba(255,255,255,.85),rgba(255,255,255,0))' }} />
      <div style={{ position: 'relative', padding: '84px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>여행 준비, 필요한 순간에 챙겨주는 비서</div>
        <div className="logo-hit" data-testid="logo">
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
        <button className="btn btn-primary btn-full" onClick={startTrial} data-testid="trial" style={{ height: 52, borderRadius: 14 }}>
          체험하기
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--text-3)' }}>
          계속하면 <Link href="/terms"><u>이용약관</u></Link>·<Link href="/privacy"><u>개인정보 처리방침</u></Link>에 동의한 것으로 봐요.
        </div>
      </div>
    </main>
  );
}
