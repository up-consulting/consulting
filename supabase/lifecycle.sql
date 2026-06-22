-- ============================================================================
-- 이음 — 30일 리추얼 · 라이프사이클 자동화
-- 실행: schema.sql 실행 이후 SQL Editor 에서 실행
-- 매일 KST 자정(=UTC 15:00) 자동:
--   · today 미제출 → failed,  locked 중 오늘 → today
--   · 30일 끝난 enrollment → completed
--   · 살펴볼 신호 생성: 연속 미제출 / 기분 하락
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 살펴볼 신호 임계값 (필요하면 숫자만 바꾸세요)
--   missed_streak : 며칠 연속 미제출이면 알림      → 기본 3일
--   mood_drop     : 최근 N일 평균 기분이 이 값 이하 → 기본 최근 3일 평균 2.5 이하
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1) 30일 완료 정산
-- ----------------------------------------------------------------------------
create or replace function finalize_enrollment(p_enrollment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- 남은 미완료 → failed
  update daily_tasks set status = 'failed'
    where enrollment_id = p_enrollment and status in ('today','locked','pending_review');
  -- 종료 처리
  update enrollments set status = 'completed' where id = p_enrollment;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) 연속 미제출 / 기분 하락 신호 생성
-- ----------------------------------------------------------------------------
create or replace function generate_alerts()
returns void language plpgsql security definer set search_path = public as $$
declare
  r            record;
  v_streak     int;
  v_mood_avg   numeric;
  v_today      date := (now() at time zone 'Asia/Seoul')::date;
  c_miss_days  constant int := 3;       -- 연속 미제출 임계
  c_mood_days  constant int := 3;       -- 기분 평균 기준 일수
  c_mood_th    constant numeric := 2.5; -- 기분 평균 임계
begin
  for r in select id, member_id from enrollments where status = 'active' loop

    -- (a) 연속 미제출
    select count(*) into v_streak
    from daily_tasks
    where enrollment_id = r.id and status = 'failed'
      and date >= v_today - c_miss_days and date < v_today;
    if v_streak >= c_miss_days then
      insert into alerts (enrollment_id, member_id, type, severity, message)
      select r.id, r.member_id, 'missed_streak', 'high',
             v_streak || '일 연속 미션 미제출'
      where not exists (
        select 1 from alerts a where a.enrollment_id = r.id
          and a.type = 'missed_streak' and a.resolved = false
      );
    end if;

    -- (b) 최근 N일 평균 기분 하락
    select avg(mood) into v_mood_avg
    from mood_logs
    where enrollment_id = r.id and date >= v_today - c_mood_days;
    if v_mood_avg is not null and v_mood_avg <= c_mood_th then
      insert into alerts (enrollment_id, member_id, type, severity, message)
      select r.id, r.member_id, 'mood_drop', 'mid',
             '최근 ' || c_mood_days || '일 평균 기분 ' || round(v_mood_avg,1)
      where not exists (
        select 1 from alerts a where a.enrollment_id = r.id
          and a.type = 'mood_drop' and a.resolved = false
      );
    end if;

  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) 매일 자정 날짜 전이 + 정산 + 신호
-- ----------------------------------------------------------------------------
create or replace function advance_day()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  r record;
begin
  -- (a) 마감 지난 미제출 → failed
  update daily_tasks set status = 'failed'
    where status = 'today' and now() >= submission_deadline;

  -- (b) 오늘 날짜의 locked → today
  update daily_tasks set status = 'today'
    where status = 'locked' and date = v_today;

  -- (c) 30일 모두 종결된 active enrollment → 정산
  for r in
    select e.id from enrollments e
    where e.status = 'active'
      and not exists (
        select 1 from daily_tasks t
        where t.enrollment_id = e.id
          and (t.status in ('today','locked','pending_review') or now() < t.submission_deadline)
      )
  loop
    perform finalize_enrollment(r.id);
  end loop;

  -- (d) 신호 생성
  perform generate_alerts();
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) pg_cron 등록 — 매일 KST 자정 (UTC 15:00)
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'care30_daily_advance';
exception when others then null;
end$$;

select cron.schedule('care30_daily_advance', '0 15 * * *', $$select public.advance_day();$$);

-- ============================================================================
-- 확인:
--   select * from cron.job where jobname = 'care30_daily_advance';
--   select advance_day();   -- 수동 테스트
-- ============================================================================
