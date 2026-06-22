-- ============================================================================
-- 이음 — 30일 리추얼 · Supabase 스키마 (전용 프로젝트)
-- 실행: Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 실행
-- 시간 기준: 한국 시간(Asia/Seoul) 자정을 하루 마감으로 사용
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- (1) 프로필 — auth.users 와 1:1. 멤버/코치/관리자 공통.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null default 'member' check (role in ('member','coach','admin')),
  status      text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  avatar_url  text,
  affirmation text default '',
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists profiles_role_idx   on profiles(role);
create index if not exists profiles_status_idx on profiles(status);

-- (2) 30일 관리 1건 = 멤버↔코치 고정 연결 (회차)
create table if not exists enrollments (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references profiles(id) on delete cascade,
  coach_id     uuid not null references profiles(id) on delete restrict,
  round        int  not null default 1,
  start_date   date not null default (now() at time zone 'Asia/Seoul')::date,
  end_date     date not null default ((now() at time zone 'Asia/Seoul')::date + 29),
  status       text not null default 'active' check (status in ('active','completed','paused')),
  goal_summary text default '',
  created_at   timestamptz not null default now()
);
create index if not exists enrollments_member_idx on enrollments(member_id);
create index if not exists enrollments_coach_idx  on enrollments(coach_id);

-- (3) 매일 미션 인증 (enrollment 당 30행)
create table if not exists daily_tasks (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null references enrollments(id) on delete cascade,
  member_id           uuid not null references profiles(id) on delete cascade,
  day_number          smallint not null check (day_number between 1 and 30),
  date                date not null,
  mission             text not null default '오늘의 미션',
  status              text not null default 'locked'
                        check (status in ('locked','today','pending_review','approved','failed','skipped')),
  proof_url           text,
  proof_text          text default '',
  submission_deadline timestamptz not null,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid references profiles(id) on delete set null,
  review_note         text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (enrollment_id, day_number)
);
create index if not exists daily_tasks_enroll_idx on daily_tasks(enrollment_id);
create index if not exists daily_tasks_member_idx on daily_tasks(member_id);
create index if not exists daily_tasks_status_idx on daily_tasks(status);

-- (4) 감정/상태 일지 (하루 1행)
create table if not exists mood_logs (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  member_id     uuid not null references profiles(id) on delete cascade,
  date          date not null,
  mood          smallint not null check (mood between 1 and 5),
  energy        smallint check (energy between 1 and 5),
  note          text default '',
  created_at    timestamptz not null default now(),
  unique (enrollment_id, date)
);
create index if not exists mood_logs_enroll_idx on mood_logs(enrollment_id, date);

-- (5) 목표 (enrollment 당 N개)
create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  member_id     uuid not null references profiles(id) on delete cascade,
  title         text not null,
  target_value  numeric not null default 1,
  current_value numeric not null default 0,
  unit          text default '회',
  sort          int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists goals_enroll_idx on goals(enrollment_id);

-- (6) 목표 진척 기록
create table if not exists goal_checkins (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references goals(id) on delete cascade,
  value       numeric not null default 1,
  note        text default '',
  recorded_at timestamptz not null default now()
);
create index if not exists goal_checkins_goal_idx on goal_checkins(goal_id);

-- (7) 코치 만남 노트
create table if not exists session_notes (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  coach_id      uuid not null references profiles(id) on delete set null,
  summary       text not null default '',
  next_focus    text default '',
  created_at    timestamptz not null default now()
);
create index if not exists session_notes_enroll_idx on session_notes(enrollment_id);

-- (8) 살펴볼 신호(케어 알림)
create table if not exists alerts (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  member_id     uuid not null references profiles(id) on delete cascade,
  type          text not null check (type in ('missed_streak','mood_drop','no_login')),
  severity      text not null default 'mid' check (severity in ('high','mid','low')),
  message       text not null,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists alerts_enroll_idx on alerts(enrollment_id) where resolved = false;

-- (9) 코치↔멤버 메시지
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  sender_id     uuid not null references profiles(id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists messages_enroll_idx on messages(enrollment_id, created_at);

-- (10) 공지
create table if not exists notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  pinned     boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. HELPER FUNCTIONS  (RLS 에서 호출)
-- ============================================================================

create or replace function is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = uid and role = 'admin');
$$;

create or replace function is_coach(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = uid and role in ('coach','admin'));
$$;

-- 이 enrollment 에 접근 가능?  (본인 멤버 / 담당 코치 / 관리자)
create or replace function can_access_enrollment(p_enrollment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from enrollments e
    where e.id = p_enrollment
      and (e.member_id = auth.uid() or e.coach_id = auth.uid() or is_admin(auth.uid()))
  );
$$;

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- (a) 회원가입 시 profiles 자동 생성 (이름은 메타데이터에서)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- (b) enrollment 생성 시 → 30일치 daily_tasks 자동 생성
create or replace function seed_daily_tasks()
returns trigger language plpgsql security definer set search_path = public as $$
declare i int; d date;
begin
  if new.status = 'active' then
    for i in 1..30 loop
      d := new.start_date + (i - 1);
      insert into daily_tasks (enrollment_id, member_id, day_number, date, status, submission_deadline)
      values (
        new.id, new.member_id, i, d,
        case when d = (now() at time zone 'Asia/Seoul')::date then 'today'
             when d <  (now() at time zone 'Asia/Seoul')::date then 'failed'
             else 'locked' end,
        ((d + 1)::timestamp at time zone 'Asia/Seoul')
      )
      on conflict (enrollment_id, day_number) do nothing;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists on_enrollment_created on enrollments;
create trigger on_enrollment_created
  after insert on enrollments for each row execute function seed_daily_tasks();

-- (c) 목표 진척 기록 시 → goals.current_value 누적
create or replace function apply_goal_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update goals set current_value = current_value + new.value where id = new.goal_id;
  return new;
end;
$$;
drop trigger if exists on_goal_checkin on goal_checkins;
create trigger on_goal_checkin
  after insert on goal_checkins for each row execute function apply_goal_checkin();

-- (d) updated_at 자동 갱신
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists daily_tasks_touch on daily_tasks;
create trigger daily_tasks_touch before update on daily_tasks
  for each row execute function touch_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
alter table profiles      enable row level security;
alter table enrollments   enable row level security;
alter table daily_tasks   enable row level security;
alter table mood_logs     enable row level security;
alter table goals         enable row level security;
alter table goal_checkins enable row level security;
alter table session_notes enable row level security;
alter table alerts        enable row level security;
alter table messages      enable row level security;
alter table notices       enable row level security;

-- profiles
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_coach(auth.uid()));
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin(auth.uid()))
  with check (id = auth.uid() or is_admin(auth.uid()));

-- enrollments  (멤버 본인 / 담당 코치 / 관리자)
drop policy if exists enroll_select on enrollments;
create policy enroll_select on enrollments for select
  using (member_id = auth.uid() or coach_id = auth.uid() or is_admin(auth.uid()));
drop policy if exists enroll_write on enrollments;
create policy enroll_write on enrollments for all
  using (is_coach(auth.uid())) with check (is_coach(auth.uid()));

-- daily_tasks
drop policy if exists tasks_select on daily_tasks;
create policy tasks_select on daily_tasks for select
  using (can_access_enrollment(enrollment_id));
drop policy if exists tasks_member_update on daily_tasks;
create policy tasks_member_update on daily_tasks for update
  using (
    (member_id = auth.uid() and now() < submission_deadline)  -- 멤버는 마감 전 본인 인증
    or is_coach(auth.uid())                                   -- 코치는 검토
  )
  with check (
    (member_id = auth.uid() and now() < submission_deadline)
    or is_coach(auth.uid())
  );
drop policy if exists tasks_coach_insert on daily_tasks;
create policy tasks_coach_insert on daily_tasks for insert
  with check (is_coach(auth.uid()));

-- mood_logs  (멤버 본인 작성/조회, 코치 조회)
drop policy if exists mood_select on mood_logs;
create policy mood_select on mood_logs for select using (can_access_enrollment(enrollment_id));
drop policy if exists mood_write on mood_logs;
create policy mood_write on mood_logs for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- goals
drop policy if exists goals_select on goals;
create policy goals_select on goals for select using (can_access_enrollment(enrollment_id));
drop policy if exists goals_write on goals;
create policy goals_write on goals for all
  using (member_id = auth.uid() or is_coach(auth.uid()))
  with check (member_id = auth.uid() or is_coach(auth.uid()));

-- goal_checkins  (해당 goal 의 멤버만)
drop policy if exists checkins_select on goal_checkins;
create policy checkins_select on goal_checkins for select
  using (exists(select 1 from goals g where g.id = goal_id and can_access_enrollment(g.enrollment_id)));
drop policy if exists checkins_insert on goal_checkins;
create policy checkins_insert on goal_checkins for insert
  with check (exists(select 1 from goals g where g.id = goal_id and g.member_id = auth.uid()));

-- session_notes  (코치 전용 작성, 멤버는 조회)
drop policy if exists notes_select on session_notes;
create policy notes_select on session_notes for select using (can_access_enrollment(enrollment_id));
drop policy if exists notes_write on session_notes;
create policy notes_write on session_notes for all
  using (is_coach(auth.uid())) with check (is_coach(auth.uid()));

-- alerts  (코치/관리자 전용)
drop policy if exists alerts_select on alerts;
create policy alerts_select on alerts for select using (is_coach(auth.uid()));
drop policy if exists alerts_write on alerts;
create policy alerts_write on alerts for all
  using (is_coach(auth.uid())) with check (is_coach(auth.uid()));

-- messages
drop policy if exists msg_select on messages;
create policy msg_select on messages for select using (can_access_enrollment(enrollment_id));
drop policy if exists msg_insert on messages;
create policy msg_insert on messages for insert
  with check (sender_id = auth.uid() and can_access_enrollment(enrollment_id));

-- notices
drop policy if exists notices_select on notices;
create policy notices_select on notices for select using (auth.uid() is not null);
drop policy if exists notices_write on notices;
create policy notices_write on notices for all
  using (is_coach(auth.uid())) with check (is_coach(auth.uid()));

-- ============================================================================
-- 5. STORAGE — 인증 사진 버킷 (private)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('proofs','proofs', false)
on conflict (id) do nothing;

drop policy if exists proofs_select on storage.objects;
create policy proofs_select on storage.objects for select
  using (bucket_id = 'proofs'
    and (auth.uid()::text = (storage.foldername(name))[1] or is_coach(auth.uid())));

drop policy if exists proofs_insert on storage.objects;
create policy proofs_insert on storage.objects for insert
  with check (bucket_id = 'proofs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists proofs_modify on storage.objects;
create policy proofs_modify on storage.objects for update
  using (bucket_id = 'proofs' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- 끝. 확인용:
--   select tablename from pg_tables where schemaname='public';
--   -- 코치 계정 승격(가입 후):  update profiles set role='coach', status='approved' where email='코치이메일';
-- ============================================================================
