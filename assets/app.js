/* ============================================================================
   이음 — 30일 리추얼 · 공통 로직 (Mock 데이터 / Supabase 미연동)
   ============================================================================ */

/* ----------------------------- Mock 데이터 ----------------------------- */
const MOCK = {
  me: { name: '지수', coach: '민지 코치', day: 12, totalDays: 30 },

  todayTask: {
    title: '아침 10분 산책하고 사진 남기기',
    desc: '가벼운 움직임으로 하루를 열어요. 풍경이든 발걸음이든 좋아요.',
    status: 'today',
  },

  // 30일 트래커 (1~30) — done/wait/fail/today/locked
  tracker: [
    'done','done','fail','done','done','done','done',
    'done','wait','done','done','today','locked','locked',
    'locked','locked','locked','locked','locked','locked','locked',
    'locked','locked','locked','locked','locked','locked','locked',
    'locked','locked',
  ],

  mood:   [3,4,2,3,4,4,5,3,2,3,4,4,3,4],
  energy: [2,3,2,3,3,4,4,3,2,2,3,4,3,4],

  goals: [
    { title: '주 4회 이상 운동하기', cur: 9,  target: 16, unit: '회' },
    { title: '11시 전 잠들기',       cur: 14, target: 30, unit: '일' },
    { title: '감사 한 줄 쓰기',      cur: 11, target: 30, unit: '일' },
  ],

  // ----- 코치 관점 -----
  members: [
    { name: '지수', day: 12, rate: 83, mood: 3.6, alert: null },
    { name: '민준', day:  8, rate: 62, mood: 2.4, alert: 'mood_drop' },
    { name: '서연', day: 21, rate: 95, mood: 4.2, alert: null },
    { name: '도윤', day:  5, rate: 40, mood: 3.0, alert: 'missed_streak' },
    { name: '하은', day: 27, rate: 88, mood: 3.9, alert: null },
  ],

  reviews: [
    { name: '지수', day: 12, task: '아침 10분 산책',     time: '오늘 09:14', img: true },
    { name: '서연', day: 21, task: '감사 한 줄 쓰기',     time: '오늘 08:02', img: false },
    { name: '하은', day: 27, task: '11시 전 취침 인증',   time: '어제 23:10', img: true },
  ],

  alerts: [
    { type:'missed_streak', sev:'high', who:'도윤', msg:'3일 연속 미션 미제출' },
    { type:'mood_drop',     sev:'mid',  who:'민준', msg:'기분 점수 4일째 하락 (평균 2.4)' },
  ],
};

const MOOD_LABELS = ['많이 힘듦', '조금 힘듦', '보통', '좋음', '아주 좋음'];

/* ----------------------------- 라인 아이콘 ----------------------------- */
const ICON = {
  home:    '<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  book:    '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  target:  '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.3"/><circle cx="12" cy="12" r="1.2"/>',
  user:    '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.4-3.6 4-5.2 7-5.2s5.6 1.6 7 5.2"/>',
  bell:    '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  gear:    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/>',
  edit:    '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  logout:  '<path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4"/><path d="M14 12h7M21 12l-3-3M21 12l-3 3"/>',
  chat:    '<path d="M4 6.5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-5 3.5z"/>',
  info:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  camera:  '<path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>',
};
function icon(n, size = 22) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ''}</svg>`;
}

/* ----------------------------- 헬퍼 ----------------------------- */
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1900);
}
function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

/* 기분 선택 옵션(1~5 숫자 척도) */
function moodOptions() {
  return [1, 2, 3, 4, 5].map(v => `<div class="mood-opt" data-v="${v}">${v}</div>`).join('');
}
/* 컨테이너에 기분 선택기 연결 — onPick(value) 콜백 */
function bindMood(el, onPick) {
  el.innerHTML = moodOptions();
  el.querySelectorAll('.mood-opt').forEach(opt => {
    opt.onclick = () => {
      el.querySelectorAll('.mood-opt').forEach(x => x.classList.remove('on'));
      opt.classList.add('on');
      onPick && onPick(+opt.dataset.v);
    };
  });
}

/* 하단 탭바 */
function renderTabbar(active) {
  const items = [
    { id:'home',    href:'home.html',    ic:'home',     l:'홈' },
    { id:'tracker', href:'tracker.html', ic:'calendar', l:'30일' },
    { id:'journal', href:'journal.html', ic:'book',     l:'일지' },
    { id:'goals',   href:'goals.html',   ic:'target',   l:'목표' },
    { id:'profile', href:'profile.html', ic:'user',     l:'마이' },
  ];
  return `<nav class="tabbar">${items.map(it => `
    <a href="${it.href}" class="${it.id === active ? 'on' : ''}">
      <span class="i">${icon(it.ic, 21)}</span>${it.l}
    </a>`).join('')}</nav>`;
}

/* 간단 SVG 라인 차트 */
function lineChart(series, opts = {}) {
  const w = 320, h = 130, pad = 14;
  const max = opts.max || 5, min = opts.min || 1;
  const colors = opts.colors || ['#4F7C72', '#E89B72'];
  const toPts = (data) => data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
  for (let g = 1; g <= 5; g++) {
    const y = pad + (1 - (g - min) / (max - min)) * (h - pad * 2);
    svg += `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#ECE8E0" stroke-width="1"/>`;
  }
  series.forEach((data, idx) => {
    const pts = toPts(data);
    svg += `<path d="${path(pts)}" fill="none" stroke="${colors[idx]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach(p => { svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="${colors[idx]}"/>`; });
  });
  svg += `</svg>`;
  return svg;
}

/* 다크 모드 */
function applyTheme() {
  document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark');
}
function isDark() { return localStorage.getItem('theme') === 'dark'; }
function toggleTheme() {
  localStorage.setItem('theme', isDark() ? 'light' : 'dark');
  applyTheme();
  return isDark();
}
applyTheme();

/* 현재 연속 인증(스트릭) — day_number 순서로 뒤에서부터 approved 연속 카운트 */
function currentStreak(tasks) {
  const elapsed = (tasks || [])
    .filter(t => ['approved', 'failed', 'pending_review', 'skipped'].includes(t.status))
    .sort((a, b) => a.day_number - b.day_number);
  let s = 0;
  for (let i = elapsed.length - 1; i >= 0; i--) {
    if (elapsed[i].status === 'approved') s++; else break;
  }
  return s;
}

/* 멤버 배지 계산 — { key, emoji, label, on } 배열 */
function computeBadges({ done = 0, streak = 0, journal = 0, rate = 0, day = 0 } = {}) {
  return [
    { emoji: '🌱', label: '첫 인증',     on: done >= 1 },
    { emoji: '🔥', label: '7일 연속',    on: streak >= 7 },
    { emoji: '📝', label: '기록왕',      on: journal >= 7 },
    { emoji: '⭐', label: '성실러 80%',  on: rate >= 80 },
    { emoji: '💪', label: '절반 돌파',   on: day >= 15 },
    { emoji: '🏆', label: '30일 완주',   on: day >= 30 },
  ];
}

// 참고: 아래 MOCK 객체는 더 이상 사용하지 않습니다(레이아웃 참고용). 모든 페이지는 API(Supabase) 연동.
