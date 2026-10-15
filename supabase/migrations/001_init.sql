-- 여행비서 초기 스키마 (Supabase SQL Editor에 그대로 붙여넣어 실행하세요)
-- 모든 테이블은 RLS(행 단위 보안)로 "본인 데이터만" 읽고 쓸 수 있게 막아 둡니다. (명세서 11장 접근 제어)

create extension if not exists pgcrypto;

-- ---------- 여행 ----------
create table if not exists public.trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 20),
  is_name_custom boolean not null default false,       -- 사용자가 이름을 직접 고쳤는지
  country        text not null default 'JP' check (country = 'JP'), -- MVP는 일본만 지원
  city           text,
  start_date     date not null,
  end_date       date not null,
  created_at     timestamptz not null default now(),
  constraint trips_dates check (end_date >= start_date and end_date <= start_date + 30) -- 귀국일은 출발일로부터 30일 이내
);
create index if not exists trips_user_start_idx on public.trips (user_id, start_date);

-- ---------- 여행 항목 ----------
create table if not exists public.trip_items (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id    text,                                  -- null = 사용자가 직접 추가한 항목
  template_order int,                                   -- 준비 항목 목록 순서 (정렬용)
  offset_days    int check (offset_days in (30, 14, 7, 1)), -- 권장 시점. 직접 추가한 항목은 null
  title          text not null check (char_length(title) between 1 and 40),
  due_date       date not null,
  status         text not null default 'todo' check (status in ('todo', 'done')),
  completed_at   timestamptz,
  memo           text not null default '' check (char_length(memo) <= 50),
  is_custom      boolean not null default false,
  is_due_edited  boolean not null default false,        -- 사용자가 기한을 직접 바꾼 항목
  created_at     timestamptz not null default now()
);
create index if not exists trip_items_trip_idx on public.trip_items (trip_id);
create index if not exists trip_items_user_idx on public.trip_items (user_id);

-- ---------- 알림 설정 ----------
create table if not exists public.notification_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  is_enabled boolean not null default true               -- 기본값은 켜짐
);

-- ---------- 이벤트 로그 (명세서 10장) ----------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on public.events (name, created_at);

-- ---------- RLS ----------
alter table public.trips                 enable row level security;
alter table public.trip_items            enable row level security;
alter table public.notification_settings enable row level security;
alter table public.events                enable row level security;

create policy "trips: own rows" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "trip_items: own rows" on public.trip_items
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create policy "notification_settings: own row" on public.notification_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events: insert own" on public.events
  for insert with check (user_id = auth.uid());
create policy "events: read own" on public.events
  for select using (user_id = auth.uid());

-- ---------- 진행 중인 여행은 최대 3개 (서버에서도 한 번 더 막습니다) ----------
-- 기준 날짜는 한국 시간(KST)입니다. 출발일 당일까지는 진행 중, 다음 날부터 지난 여행.
create or replace function public.enforce_active_trip_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.trips
        where user_id = new.user_id
          and start_date >= (now() at time zone 'Asia/Seoul')::date) >= 3 then
    raise exception 'active trip limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trips_active_limit on public.trips;
create trigger trips_active_limit before insert on public.trips
  for each row execute function public.enforce_active_trip_limit();

-- ---------- 탈퇴: 본인 계정과 모든 데이터를 삭제 ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid(); -- trips, trip_items, settings, events는 on delete cascade로 함께 삭제
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
