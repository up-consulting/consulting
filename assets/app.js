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

/* ===== 마스코트 '오늘이' (SVG · 완료 미션 수에 따라 7단계 성장) ===== */
const TODAYI_LABELS = ['씨앗', '떡잎', '새싹', '쑥쑥', '꽃봉오리', '활짝', '만개'];
function todayiStage(done = 0) {
  return done >= 30 ? 6 : done >= 22 ? 5 : done >= 14 ? 4 : done >= 7 ? 3 : done >= 3 ? 2 : done >= 1 ? 1 : 0;
}
function todayiMessage(stage, wilt) {
  if (wilt) return '오늘이가 목말라 해요. 오늘 인증으로 물 주기 💧';
  return ['씨앗을 심었어요. 첫 인증으로 깨워주세요!', '떡잎이 빼꼼 🌱', '새싹이 자라는 중!',
    '쑥쑥 크고 있어요', '곧 꽃이 필 것 같아요', '꽃이 활짝 피었어요 🌸', '완전히 만개했어요! 🏆'][stage];
}
function todayiSvg(stage, opt = {}) {
  const s = opt.size || 130;
  const leaf = (x, y, r, sc, c) =>
    `<path d="M0 0C9 -2 15 -11 13 -22C3 -18 -3 -9 0 0Z" transform="translate(${x} ${y}) rotate(${r}) scale(${sc})" fill="${c}"/>`;
  const soil = '<ellipse cx="60" cy="101" rx="31" ry="7.5" fill="#E4D5BD"/><path d="M30 100c5 5 55 5 60 0 0 6-14 9-30 9s-35-3-30-9z" fill="#CDB893"/>';
  const face = '<circle cx="53.5" cy="66" r="2.6" fill="#33403B"/><circle cx="66.5" cy="66" r="2.6" fill="#33403B"/>'
    + '<path d="M55.5 72q4.5 3.6 9 0" stroke="#33403B" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    + '<circle cx="48.5" cy="70.5" r="2.5" fill="#F1A88A" opacity=".75"/><circle cx="71.5" cy="70.5" r="2.5" fill="#F1A88A" opacity=".75"/>';
  const body = '<path d="M60 95c-14 0-23-10-23-23 0-14 10-25 23-25s23 11 23 25c0 13-9 23-23 23z" fill="#7CAB9D"/>'
    + '<path d="M60 95c-9 0-15-6-18-13 6 3 30 3 36 0-3 7-9 13-18 13z" fill="#6B9A8C" opacity=".45"/>' + face;
  const flower = (cx, cy) => `<g transform="translate(${cx} ${cy})">`
    + [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-11" rx="6.5" ry="9.5" fill="#F0A98A" transform="rotate(${a})"/>`).join('')
    + '<circle r="6" fill="#F6C84C"/></g>';

  let inner = soil;
  if (stage === 0) {
    inner += '<g transform="rotate(-14 60 90)"><ellipse cx="60" cy="89" rx="8.5" ry="11.5" fill="#B98A57"/>'
      + '<path d="M60 79c4 3 5 9 2 15" stroke="#9C6E3D" stroke-width="1.6" fill="none"/></g>';
    return `<svg viewBox="0 0 120 120" width="${s}" height="${s}">${inner}</svg>`;
  }
  // 줄기 + 잎 (단계별)
  inner += '<path d="M60 96V52" stroke="#5E978A" stroke-width="4.5" stroke-linecap="round"/>';
  if (stage >= 2) { inner += leaf(60, 78, -55, 0.8, '#5E978A') + leaf(60, 78, 235, -0.8, '#6BA091'); }
  if (stage >= 3) { inner += leaf(60, 66, -45, 0.7, '#6BA091') + leaf(60, 66, 225, -0.7, '#5E978A'); }
  inner += leaf(60, 51, -28, 0.85, '#6FA294') + leaf(60, 51, 208, -0.85, '#5E978A'); // 머리 잎(항상)
  inner += body;
  if (stage === 4) inner += '<path d="M60 40c-7 0-11-6-11-13 0-6 5-12 11-12s11 6 11 12c0 7-4 13-11 13z" fill="#8FBAAE"/><path d="M60 18c3 4 4 13 0 22" stroke="#E89B72" stroke-width="2" fill="none" opacity=".6"/>';
  if (stage === 5) inner += flower(60, 36);
  if (stage === 6) inner += flower(60, 34)
    + '<text x="92" y="34" font-size="13" fill="#F6C84C">✦</text><text x="24" y="44" font-size="10" fill="#E89B72">✦</text><text x="86" y="60" font-size="9" fill="#7CAB9D">✦</text>';
  const filt = opt.wilt ? ' style="filter:grayscale(.45) brightness(.97);"' : '';
  return `<svg viewBox="0 0 120 120" width="${s}" height="${s}"${filt}>${inner}</svg>`;
}

/* ===== 마스코트 영상(오늘이) — 30일을 4단계 + 시듦 ===== */
const CHAR4_LABELS = ['첫걸음', '차근차근', '몰입 모드', '완전체'];
const CHAR4_MSG = [
  '포근하게 첫걸음 떼는 중 — 천천히 가도 괜찮아요 🧣',
  '따뜻한 차 한 잔처럼, 꾸준함이 쌓이고 있어요 ☕',
  '집중하는 모습 멋져요. 조금만 더 가볼까요? 📖',
  '어엿하게 자랐어요. 끝까지 함께 가요 🏆',
];
function charStage4(done = 0) { return done >= 24 ? 4 : done >= 16 ? 3 : done >= 8 ? 2 : 1; }
function charStageMsg(stage, wilt) {
  if (wilt) return '오늘이가 방전됐어요. 오늘 인증으로 충전해줘요 ⚡';
  return CHAR4_MSG[stage - 1];
}
// which: 1~4 또는 'wilt'
function charVideo(which, opt = {}) {
  const size = opt.size || 160;
  const src = which === 'wilt' ? 'assets/character/wilt.mp4' : `assets/character/s${which}.mp4`;
  return `<video class="todayi-vid" style="width:${size}px;height:${size}px;" autoplay loop muted playsinline preload="auto"><source src="${src}" type="video/mp4"></video>`;
}

/* 브랜드 톤 SVG 다람쥐 '오늘이' — 4단계(+방전). 도토리에서 시작해 자라는 컨셉 */
function charSvg(which, opt = {}) {
  const s = opt.size || 160;
  const wilt = which === 'wilt';
  const stage = wilt ? 1 : which;
  const FUR = '#C79A6A', FUR_D = '#A9814F', CREAM = '#F3ECDD', TIP = '#E7D6BB', NOSE = '#6B4E38', EYE = '#3A2E22', BL = '#F1A88A';
  const leaf = (x, y, r, sc, c) => `<path d="M0 0C8 -2 13 -10 11 -19C3 -16 -3 -8 0 0Z" transform="translate(${x} ${y}) rotate(${r}) scale(${sc})" fill="${c}"/>`;
  const acorn = (cx, cy) => `<ellipse cx="${cx}" cy="${cy + 2}" rx="8" ry="9" fill="#C68A4C"/>`
    + `<path d="M${cx - 9} ${cy - 3}q9 -7 18 0q-1 4.5 -9 4.5q-8 0 -9 -4.5z" fill="#8A6238"/>`
    + `<path d="M${cx} ${cy - 7}v-3" stroke="#8A6238" stroke-width="2" stroke-linecap="round"/>`;

  // 앞에 안고 있는 것 (단계별 성장): 도토리 → 새싹 → 잎 → 꽃
  let plant;
  if (wilt) {
    plant = `<path d="M60 100v-7q0-6-6-8" stroke="#B79C79" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M56 88q-7 0-10 6" stroke="#B79C79" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else if (stage === 1) {
    plant = acorn(60, 92);
  } else if (stage === 2) {
    plant = acorn(60, 94) + `<path d="M60 87V80" stroke="#5E978A" stroke-width="2.6" stroke-linecap="round"/>`
      + leaf(60, 82, -45, 0.5, '#6FA294') + leaf(60, 82, 225, -0.5, '#5E978A');
  } else {
    const top = stage >= 4 ? 80 : 84;
    plant = `<path d="M60 101V${top}" stroke="#5E978A" stroke-width="3.2" stroke-linecap="round"/>`
      + leaf(60, 95, -48, 0.62, '#6FA294') + leaf(60, 95, 228, -0.62, '#5E978A')
      + leaf(60, 89, -52, 0.55, '#6BA091') + leaf(60, 89, 232, -0.55, '#6FA294');
    if (stage >= 4) plant += `<g transform="translate(60 79)">`
      + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-7.5" rx="4.6" ry="7" fill="#F0A98A" transform="rotate(${a})"/>`).join('')
      + `<circle r="4.2" fill="#F6C84C"/></g>`;
  }

  const eyes = wilt
    ? `<path d="M43 55q5 -4 10 0" stroke="${EYE}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M67 55q5 -4 10 0" stroke="${EYE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : `<circle cx="49" cy="55" r="5.4" fill="${EYE}"/><circle cx="51" cy="53" r="1.7" fill="#fff"/><circle cx="71" cy="55" r="5.4" fill="${EYE}"/><circle cx="73" cy="53" r="1.7" fill="#fff"/>`;

  return `<svg viewBox="0 0 120 120" width="${s}" height="${s}"${wilt ? ' style="filter:grayscale(.28);"' : ''}>
    <!-- 큰 꼬리 -->
    <path d="M78 96C116 96 116 30 86 26C108 36 102 82 78 82Z" fill="${FUR}"/>
    <path d="M88 36C102 44 100 70 84 76" fill="none" stroke="${TIP}" stroke-width="7" stroke-linecap="round"/>
    <!-- 발 -->
    <ellipse cx="47" cy="107" rx="6.5" ry="4.4" fill="${FUR_D}"/><ellipse cx="70" cy="107" rx="6.5" ry="4.4" fill="${FUR_D}"/>
    <!-- 몸 -->
    <ellipse cx="57" cy="88" rx="24" ry="22" fill="${FUR}"/>
    <ellipse cx="57" cy="92" rx="14" ry="14" fill="${CREAM}"/>
    <!-- 귀 -->
    <path d="M42 24q-5 -15 5 -18q9 5 7 18z" fill="${FUR}"/><path d="M78 24q5 -15 -5 -18q-9 5 -7 18z" fill="${FUR}"/>
    <path d="M44 22q-2 -9 3 -11q4 3 3 11z" fill="${TIP}"/><path d="M76 22q2 -9 -3 -11q-4 3 -3 11z" fill="${TIP}"/>
    <!-- 머리 -->
    <circle cx="60" cy="52" r="28" fill="${FUR}"/>
    <path d="M60 30q9 8 9 20q0 10 -9 16q-9 -6 -9 -16q0 -12 9 -20z" fill="${CREAM}" opacity=".55"/>
    ${eyes}
    <ellipse cx="60" cy="64" rx="10" ry="7.5" fill="${CREAM}"/>
    <path d="M60 60l-3.5 3.5h7z" fill="${NOSE}"/>
    <path d="M60 63.5v3" stroke="${NOSE}" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="57.6" y="66.5" width="4.8" height="5" rx="1.3" fill="#fff" stroke="#E3DAC8" stroke-width=".6"/>
    <path d="M60 66.5v5" stroke="#E3DAC8" stroke-width=".6"/>
    <circle cx="45" cy="63" r="3.2" fill="${BL}" opacity=".5"/><circle cx="75" cy="63" r="3.2" fill="${BL}" opacity=".5"/>
    <!-- 앞발(안기) -->
    <ellipse cx="51" cy="98" rx="5.2" ry="6.8" fill="${FUR}" transform="rotate(18 51 98)"/>
    <ellipse cx="66" cy="98" rx="5.2" ry="6.8" fill="${FUR}" transform="rotate(-18 66 98)"/>
    ${plant}
    ${wilt ? '<text x="82" y="38" font-size="12">💤</text>' : ''}
  </svg>`;
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
