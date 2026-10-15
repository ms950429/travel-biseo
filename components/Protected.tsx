'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

/** 로그인하지 않은 상태로 S-01~S-05에 접근하면 S-00으로 이동한다. */
export function Protected({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { ready } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);
  if (status !== 'authed' || !ready) return <div className="center">불러오는 중…</div>;
  return <>{children}</>;
}
