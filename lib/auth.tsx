'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import { demoRepo, DEMO_FLAG, DEMO_TODAY, clearDemoData } from './repo/demo';
import { supabaseRepo } from './repo/supabase';
import type { Repo } from './repo/types';
import { setTodayOverride } from './dates';

type Mode = 'demo' | 'supabase';
type Auth = {
  status: 'loading' | 'authed' | 'anon';
  mode: Mode | null;
  repo: Repo;
  /** Google 로그인 시작. Supabase가 연결되지 않았으면 실패를 던진다. */
  signInGoogle: () => Promise<void>;
  /** 로그인 페이지에서 로고를 8번 연속 누르면 들어가는 데모 모드 */
  enterDemo: () => void;
  /** 로그아웃. 데이터는 그대로 보존한다. */
  logout: () => Promise<void>;
  /** 탈퇴. 사용자와 모든 여행·항목 데이터를 삭제한다. */
  withdraw: () => Promise<void>;
};
const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Auth['status']>('loading');
  const [mode, setMode] = useState<Mode | null>(null);

  const applyDemo = useCallback(() => {
    setTodayOverride(localStorage.getItem(DEMO_TODAY)); // 데모 모드에서만 오늘 날짜를 바꿔 볼 수 있다
    setMode('demo');
    setStatus('authed');
  }, []);

  useEffect(() => {
    if (localStorage.getItem(DEMO_FLAG) === '1') {
      applyDemo();
      return;
    }
    if (!supabase) {
      setStatus('anon');
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setMode('supabase');
        setStatus('authed');
      } else setStatus('anon');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (localStorage.getItem(DEMO_FLAG) === '1') return;
      setMode(session ? 'supabase' : null);
      setStatus(session ? 'authed' : 'anon');
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applyDemo]);

  const value = useMemo<Auth>(
    () => ({
      status,
      mode,
      repo: mode === 'supabase' ? supabaseRepo : demoRepo,
      async signInGoogle() {
        if (!supabase) {
          console.warn('[여행비서] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없어 Google 로그인을 시작할 수 없어요.');
          throw new Error('supabase not configured');
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/' },
        });
        if (error) throw error;
      },
      enterDemo() {
        localStorage.setItem(DEMO_FLAG, '1');
        applyDemo();
      },
      async logout() {
        if (mode === 'demo') {
          localStorage.removeItem(DEMO_FLAG);
          setTodayOverride(null);
        } else if (supabase) {
          await supabase.auth.signOut();
        }
        setMode(null);
        setStatus('anon');
      },
      async withdraw() {
        if (mode === 'demo') {
          clearDemoData();
          localStorage.removeItem(DEMO_FLAG);
          setTodayOverride(null);
        } else if (supabase) {
          const { error } = await supabase.rpc('delete_my_account');
          if (error) throw error;
          await supabase.auth.signOut();
        }
        setMode(null);
        setStatus('anon');
      },
    }),
    [status, mode, applyDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
export { supabaseConfigured };
