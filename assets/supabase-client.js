/* ============================================================================
   Supabase 클라이언트 초기화 — 이음(care30) 전용 프로젝트
   ----------------------------------------------------------------------------
   ▼▼▼ 새 Supabase 프로젝트의 값으로 아래 두 줄만 채우세요 ▼▼▼
   Supabase 대시보드 → Project Settings → API 에서 확인:
     - Project URL      →  SUPABASE_URL
     - anon public key  →  SUPABASE_ANON_KEY
   (anon 키는 공개되어도 안전합니다. 실제 보안은 RLS 가 담당)
   ============================================================================ */

const SUPABASE_URL      = 'https://jbziqbzepvkglxsgjjhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiemlxYnplcHZrZ2x4c2dqamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTcxNzMsImV4cCI6MjA5NzY5MzE3M30.EMe2txc_Eak1RDAqcWytsgx4RRRvN9abLBbtd7SDOmc';

const CONFIG_OK = !SUPABASE_URL.includes('YOUR-PROJECT-REF');

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
