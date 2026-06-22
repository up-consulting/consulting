-- ============================================================================
-- 이음 — 역할 분리 가입 마이그레이션
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행 (1회)
--   · 멤버가 가입 시 입력한 "담당 코치 이름"을 저장할 컬럼 추가
--   · 가입 트리거가 메타데이터(role / requested_coach)를 profiles 에 반영
--     (단, 'admin' 자가가입은 차단 — coach 아니면 모두 member)
-- ============================================================================

-- (1) 멤버가 지정한 담당 코치 이름
alter table profiles add column if not exists requested_coach text default '';

-- (2) 가입 트리거 갱신
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  -- 메타데이터의 role 이 'coach' 면 코치, 그 외(누락/임의값)는 모두 member
  v_role := case when (new.raw_user_meta_data->>'role') = 'coach' then 'coach' else 'member' end;

  insert into profiles (id, email, name, role, status, requested_coach)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_role,
    'approved',
    coalesce(new.raw_user_meta_data->>'requested_coach', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 트리거 자체는 schema.sql 에서 이미 생성됨(on_auth_user_created). 함수만 교체하면 적용됨.

-- ============================================================================
-- 확인용:
--   select id, name, role, status, requested_coach from profiles order by created_at desc;
-- ============================================================================
