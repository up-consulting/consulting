/* ============================================================================
   이음 — 데이터 계층 (Supabase 래퍼)
   페이지 JS 는 이 API 함수만 호출한다. (supabase-client.js · supabase-js CDN 필요)
   ============================================================================ */

const API = {
  /* ----------------------------- 인증 ----------------------------- */
  async signUp(email, password, name, role = 'member', requestedCoach = '') {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, role, requested_coach: requestedCoach } },
    });
    if (error) throw error;
    return data;
  },
  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() { await sb.auth.signOut(); },

  // 현재 로그인 사용자의 profiles 행 (없으면 null)
  async me() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
    return data || null;
  },

  // 페이지 가드: 로그인/역할 확인 후 아니면 리다이렉트
  async guard(role /* 'member' | 'coach' | null */) {
    if (!CONFIG_OK) { location.href = 'setup.html'; return null; }
    const me = await this.me();
    if (!me) { location.href = 'login.html'; return null; }
    if (role === 'coach' && !['coach', 'admin'].includes(me.role)) { location.href = 'home.html'; return null; }
    if (role === 'member' && me.role !== 'member') { location.href = 'admin.html'; return null; }
    return me;
  },

  /* ----------------------------- 멤버 ----------------------------- */
  async myEnrollment() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from('enrollments')
      .select('*, coach:profiles!enrollments_coach_id_fkey(name)')
      .eq('member_id', user.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data || null;
  },

  async tracker(enrollmentId) {
    const { data } = await sb.from('daily_tasks')
      .select('*').eq('enrollment_id', enrollmentId).order('day_number');
    return data || [];
  },
  async todayTask(enrollmentId) {
    const { data } = await sb.from('daily_tasks')
      .select('*').eq('enrollment_id', enrollmentId).eq('status', 'today')
      .order('day_number').limit(1).maybeSingle();
    return data || null;
  },
  async submitTask(task, file, text) {
    let proof_url = task.proof_url || null;
    if (file) {
      const { data: { user } } = await sb.auth.getUser();
      const path = `${user.id}/${task.id}.jpg`;
      const up = await sb.storage.from('proofs').upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      proof_url = path;
    }
    const { error } = await sb.from('daily_tasks').update({
      status: 'pending_review', proof_url, proof_text: text || '', submitted_at: new Date().toISOString(),
    }).eq('id', task.id);
    if (error) throw error;
  },

  async moodToday(enrollmentId, dateStr) {
    const { data } = await sb.from('mood_logs')
      .select('*').eq('enrollment_id', enrollmentId).eq('date', dateStr).maybeSingle();
    return data || null;
  },
  async logMood(enrollmentId, mood, energy, note) {
    const { data: { user } } = await sb.auth.getUser();
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // KST 기준

    const { error } = await sb.from('mood_logs').upsert(
      { enrollment_id: enrollmentId, member_id: user.id, date, mood, energy, note: note || '' },
      { onConflict: 'enrollment_id,date' }
    );
    if (error) throw error;
  },
  async moodSeries(enrollmentId, days = 14) {
    const { data } = await sb.from('mood_logs')
      .select('date, mood, energy').eq('enrollment_id', enrollmentId)
      .order('date', { ascending: true }).limit(days);
    return data || [];
  },
  // 일지 전체 (note 포함, 오래된 → 최신 순)
  async moodAll(enrollmentId) {
    const { data } = await sb.from('mood_logs')
      .select('date, mood, energy, note').eq('enrollment_id', enrollmentId)
      .order('date', { ascending: true });
    return data || [];
  },

  async goals(enrollmentId) {
    const { data } = await sb.from('goals')
      .select('*').eq('enrollment_id', enrollmentId).order('sort');
    return data || [];
  },
  async addGoal(enrollmentId, title, target, unit) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('goals').insert({
      enrollment_id: enrollmentId, member_id: user.id, title, target_value: target, unit,
    });
    if (error) throw error;
  },
  async updateGoal(goalId, title, target, unit) {
    const { error } = await sb.from('goals')
      .update({ title, target_value: target, unit }).eq('id', goalId);
    if (error) throw error;
  },
  async deleteGoal(goalId) {
    const { error } = await sb.from('goals').delete().eq('id', goalId);
    if (error) throw error;
  },
  async checkinGoal(goalId, value, note) {
    const { error } = await sb.from('goal_checkins').insert({ goal_id: goalId, value, note: note || '' });
    if (error) throw error;
  },

  /* ----------------------------- 코치 ----------------------------- */
  // 담당 멤버 목록 + 계산된 이행률/평균기분
  async coachMembers(coachId) {
    const { data: enrolls } = await sb.from('enrollments')
      .select('*, member:profiles!enrollments_member_id_fkey(name)')
      .eq('coach_id', coachId).eq('status', 'active');
    const out = [];
    for (const e of enrolls || []) {
      const stats = await this.enrollmentStats(e.id);
      out.push({ ...e, ...stats });
    }
    return out;
  },
  async enrollmentStats(enrollmentId) {
    const tasks = await this.tracker(enrollmentId);
    const done = tasks.filter(t => t.status === 'approved').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const wait = tasks.filter(t => t.status === 'pending_review').length;
    const elapsed = done + failed + wait || 1;
    const today = tasks.find(t => t.status === 'today');
    const moods = await this.moodSeries(enrollmentId, 30);
    const moodAvg = moods.length ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length) : 0;
    return {
      day: today ? today.day_number : (done + failed),
      done, failed, wait,
      rate: Math.round((done / elapsed) * 100),
      moodAvg: Math.round(moodAvg * 10) / 10,
    };
  },

  async pendingReviews(coachId) {
    const { data } = await sb.from('daily_tasks')
      .select('*, enrollment:enrollments!inner(coach_id), member:profiles!daily_tasks_member_id_fkey(name)')
      .eq('status', 'pending_review').eq('enrollment.coach_id', coachId)
      .order('submitted_at', { ascending: false });
    return data || [];
  },
  async reviewTask(taskId, approve, note) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('daily_tasks').update({
      status: approve ? 'approved' : 'failed',
      review_note: note || '', reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq('id', taskId);
    if (error) throw error;
  },

  async alerts(coachId) {
    const { data } = await sb.from('alerts')
      .select('*, enrollment:enrollments!inner(coach_id), member:profiles!alerts_member_id_fkey(name)')
      .eq('resolved', false).eq('enrollment.coach_id', coachId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async notes(enrollmentId) {
    const { data } = await sb.from('session_notes')
      .select('*').eq('enrollment_id', enrollmentId).order('created_at', { ascending: false });
    return data || [];
  },
  async addNote(enrollmentId, summary, nextFocus) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('session_notes').insert({
      enrollment_id: enrollmentId, coach_id: user.id, summary, next_focus: nextFocus || '',
    });
    if (error) throw error;
  },

  // 연결 대기 멤버 — 이 코치 이름을 지정했고 아직 active enrollment 없는 member
  async unconnectedMembers(coachName) {
    const { data: members } = await sb.from('profiles')
      .select('id, name, email, requested_coach').eq('role', 'member');
    const { data: active } = await sb.from('enrollments').select('member_id').eq('status', 'active');
    const taken = new Set((active || []).map(e => e.member_id));
    const want = (coachName || '').trim().toLowerCase();
    return (members || []).filter(m =>
      !taken.has(m.id) && (m.requested_coach || '').trim().toLowerCase() === want
    );
  },
  // 연결 시 입력한 목표 = 메인 목표(= 오늘의 미션). enrollment.goal_summary 에 저장.
  async connectMember(memberId, coachId, goalSummary) {
    const { error } = await sb.from('enrollments').insert({
      member_id: memberId, coach_id: coachId, goal_summary: (goalSummary || '').trim(),
    });
    if (error) throw error;
  },
  // 코치가 메인 목표(미션)를 중간에 수정
  async updateEnrollmentGoal(enrollmentId, goalSummary) {
    const { error } = await sb.from('enrollments')
      .update({ goal_summary: (goalSummary || '').trim() }).eq('id', enrollmentId);
    if (error) throw error;
  },
};
