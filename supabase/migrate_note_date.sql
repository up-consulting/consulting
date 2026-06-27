-- ============================================================================
-- 오늘일기 — 코치 노트 날짜 지정 기능
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행 (1회)
--   · session_notes 에 노트 날짜 컬럼 추가 (코치가 직접 지정)
-- ============================================================================

alter table session_notes
  add column if not exists note_date date not null default (now() at time zone 'Asia/Seoul')::date;

create index if not exists session_notes_date_idx on session_notes(enrollment_id, note_date desc);

-- 확인용:
--   select summary, note_date, created_at from session_notes order by note_date desc;
