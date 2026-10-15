import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase 환경 변수가 없으면 null. 이 경우 Google 로그인은 동작하지 않고 데모 모드만 쓸 수 있다. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        // 로그인 상태는 브라우저를 닫아도 유지한다 (명세서 F-00).
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const supabaseConfigured = supabase !== null;
