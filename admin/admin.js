/* 지유공간개발 관리자 화면 — KPI 대시보드 · 상담 문의 · 회원 관리 */
(function () {
  'use strict';

  /* =========================================================== utils */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NF = new Intl.NumberFormat('ko-KR');
  const CF = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });
  const fmt = {
    n: (v) => (v === null || v === undefined || isNaN(v) ? '–' : NF.format(Math.round(v))),
    c: (v) => (Math.abs(v) >= 10000 ? CF.format(v) : NF.format(Math.round(v * 10) / 10)),
    pct: (v) => (v === null || v === undefined || isNaN(v) ? '–' : (v * 100 >= 10 || v === 0 ? Math.round(v * 100) : (v * 100).toFixed(1)) + '%'),
    dur: (ms) => {
      if (!ms || ms < 500) return '0초';
      const s = Math.round(ms / 1000);
      if (s < 60) return s + '초';
      const m = Math.floor(s / 60), r = s % 60;
      if (m < 60) return m + '분' + (r ? ' ' + r + '초' : '');
      return Math.floor(m / 60) + '시간 ' + (m % 60) + '분';
    },
    hours: (ms) => {
      if (!ms) return '–';
      const h = ms / 3600000;
      if (h < 1) return Math.max(1, Math.round(ms / 60000)) + '분';
      if (h < 48) return (h < 10 ? h.toFixed(1) : Math.round(h)) + '시간';
      return (h / 24).toFixed(1) + '일';
    },
    md: (day) => (day ? +day.slice(5, 7) + '.' + +day.slice(8, 10) : ''),
    ymd: (day) => (day ? day.replace(/-/g, '.') : ''),
    dt: (ms) => {
      if (!ms) return '–';
      const d = new Date(ms + 9 * 3600000);
      return d.toISOString().slice(0, 10).replace(/-/g, '.') + ' ' + d.toISOString().slice(11, 16);
    },
    hm: (ms) => new Date(ms + 9 * 3600000).toISOString().slice(11, 16),
    ago: (ms) => {
      if (!ms) return '–';
      const s = (Date.now() - ms) / 1000;
      if (s < 60) return '방금';
      if (s < 3600) return Math.floor(s / 60) + '분 전';
      if (s < 86400) return Math.floor(s / 3600) + '시간 전';
      if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
      return fmt.dt(ms).slice(0, 10);
    },
  };

  /* =========================================================== labels */
  const CH = { search: '검색', social: 'SNS · 커뮤니티', referral: '다른 사이트', campaign: '캠페인 · 광고', direct: '직접 방문', internal: '사이트 안 이동', unknown: '기록 없음' };
  const CH_COLOR = { search: 'var(--s1)', direct: 'var(--s2)', social: 'var(--s3)', referral: 'var(--s4)', campaign: 'var(--s5)', unknown: '#c6cdd8', internal: '#c6cdd8' };
  const CH_DARK = { referral: true, unknown: true, internal: true };
  const SRC = {
    naver: '네이버', google: '구글', daum: '다음', bing: '빙', zum: '줌', yahoo: '야후', duckduckgo: '덕덕고',
    'naver-blog': '네이버 블로그', 'naver-cafe': '네이버 카페', 'naver-map': '네이버 지도', 'daum-cafe': '다음 카페',
    kakao: '카카오톡', instagram: '인스타그램', facebook: '페이스북', youtube: '유튜브', x: 'X(트위터)', threads: '스레드',
    linkedin: '링크드인', band: '밴드', direct: '직접 방문', 'tistory.com': '티스토리', 'brunch.co.kr': '브런치', unknown: '기록 없음',
  };
  const DEV = { desktop: 'PC', mobile: '모바일', tablet: '태블릿' };
  const GRP = { home: '홈', about: '회사소개', business: '사업영역', process: '진행절차 · 상품', clients: '고객별 솔루션', insights: '인사이트', contact: '상담문의', member: '회원', privacy: '개인정보처리방침', etc: '기타' };
  const EV = { click: '일반 클릭', cta: '상담 버튼', tel: '전화 걸기', mail: '이메일', map: '지도 보기', outbound: '외부 링크', menu: '메뉴 이동', check: '자가진단 완료', form_start: '상담 폼 작성 시작', signup: '회원가입', login: '로그인', withdraw: '회원 탈퇴', download: '자료 내려받기', share: '공유' };
  const AREA = { menu: '상단 메뉴', footer: '하단', 'mobile-bar': '모바일 하단 바', body: '본문', server: '서버' };
  const CHECK = { fm: '시설관리 FM', pm: '자산관리 PM', leasing: '공실관리 · 임차사관리', green: '노후건물 개선', vu: '공실개발 · 자산가치 증대', ops: '공간운영 · 수익화', ipm: '인테리어 · 디자인 PM' };
  const ST = { new: '신규 접수', contacted: '연락 완료', consulting: '상담 진행', proposal: '제안 · 견적', won: '계약', hold: '보류', closed: '종료' };
  const PAGE = {
    '/': '홈', '/about': '회사소개', '/business': '사업영역 전체', '/business/fm': '시설관리 FM', '/business/pm': '자산관리 PM',
    '/business/leasing': '공실관리 · 임차사관리', '/business/value-up': '공실개발 · 자산가치 증대', '/business/interior-pm': '인테리어 · 디자인 PM',
    '/business/space-operation': '공간운영 · 수익화', '/business/green': '노후건물 개선 · 그린 밸류업', '/process': '진행절차 · 상품',
    '/clients': '고객별 솔루션', '/insights': '인사이트 목록', '/contact': '상담문의', '/privacy': '개인정보처리방침',
    '/member/join': '회원가입', '/member/login': '로그인', '/member/mypage': '마이페이지', '/member/reset': '비밀번호 재설정', '/member/terms': '이용약관',
  };
  const REGION = [
    [/seoul/i, '서울'], [/gyeonggi/i, '경기'], [/incheon/i, '인천'], [/busan/i, '부산'], [/daegu/i, '대구'], [/daejeon/i, '대전'],
    [/gwangju/i, '광주'], [/ulsan/i, '울산'], [/sejong/i, '세종'], [/gangwon/i, '강원'], [/chungcheongbuk|north chungcheong/i, '충북'],
    [/chungcheongnam|south chungcheong/i, '충남'], [/jeollabuk|jeonbuk|north jeolla/i, '전북'], [/jeollanam|south jeolla/i, '전남'],
    [/gyeongsangbuk|north gyeongsang/i, '경북'], [/gyeongsangnam|south gyeongsang/i, '경남'], [/jeju/i, '제주'],
  ];
  let countryName = (c) => c;
  try { const dn = new Intl.DisplayNames(['ko'], { type: 'region' }); countryName = (c) => { try { return dn.of(c); } catch (e) { return c; } }; } catch (e) { /* */ }
  const regionName = (r, c) => {
    if (c && c !== 'KR') return countryName(c) + (r ? ' · ' + r : '');
    for (const [re, n] of REGION) if (re.test(r || '')) return n;
    return r || '알 수 없음';
  };
  const TITLES = {};
  const pageName = (path, title) => PAGE[path] || ((title || TITLES[path]) ? String(title || TITLES[path]).split(/\s[—|]\s/)[0] : path);
  /* 받침 유무에 따라 조사 고르기: josa('공실관리', '을/를') → '공실관리를' */
  function josa(word, pair) {
    const [a, b] = pair.split('/');
    const w = String(word).replace(/[\s」』)\]'"·.]+$/, '');
    const ch = w.charCodeAt(w.length - 1);
    let has;
    if (ch >= 0xac00 && ch <= 0xd7a3) has = (ch - 0xac00) % 28 !== 0;
    else if (/[0-9]$/.test(w)) has = '013678'.includes(w.slice(-1));
    else if (/[a-z]$/i.test(w)) has = /[lmnr]$/i.test(w);
    else has = false;
    return word + (has ? a : b);
  }
  const srcName = (s) => SRC[s] || s || '–';
  const chName = (c) => CH[c] || c || '–';

  const LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#0f1c36"/><rect x="9" y="8" width="22" height="4" fill="#fff"/><rect x="9" y="14" width="22" height="4" fill="#fff"/><rect x="9" y="20" width="22" height="4" fill="#fff"/><rect x="9" y="26" width="22" height="4" fill="#17a35f"/><rect x="9" y="32" width="22" height="2" fill="#fff" opacity=".6"/></svg>';
  const IC = {
    overview: '<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
    traffic: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    pages: '<path d="M6 3h9l5 5v13H6V3Z"/><path d="M14 3v6h6M9 13h8M9 17h6"/>',
    content: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z"/>',
    sources: '<path d="M4 12h6m4 0h6M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 5h4l4 7-4 7H4"/>',
    actions: '<path d="M9 9l11 4-5 2-2 5-4-11Z"/><path d="M5 5l2 2M3 10h3M10 3v3"/>',
    leads: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    members: '<path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 19v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    down: '<path d="M12 4v12m-5-5 5 5 5-5M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4m0 3h.01"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

  const NAV = [
    { id: 'overview', name: '대시보드', desc: '핵심 KPI를 한 화면에서 봅니다.' },
    { id: 'traffic', name: '방문 분석', desc: '언제, 어떤 기기로, 얼마나 자주 오는지 봅니다.' },
    { id: 'pages', name: '페이지 분석', desc: '페이지마다 얼마나 보고, 얼마나 머물고, 어디서 나가는지 봅니다.' },
    { id: 'content', name: '인기 정보', desc: '방문자가 가장 관심을 가진 사업영역과 자료를 봅니다.' },
    { id: 'sources', name: '유입 경로', desc: '방문자가 어디를 거쳐 들어왔는지 봅니다.' },
    { id: 'actions', name: '클릭 · 전환', desc: '버튼 클릭부터 상담 신청까지 이어지는 행동을 봅니다.' },
    { group: '운영' },
    { id: 'leads', name: '상담 문의', desc: '홈페이지로 들어온 상담을 확인하고 진행 상태를 관리합니다.' },
    { id: 'members', name: '회원 관리', desc: '회원 목록과 가입 추이를 봅니다.' },
    { group: '' },
    { id: 'settings', name: '설정', desc: '설치 상태, 데이터 보관, 지표 설명.' },
  ];

  /* =========================================================== state & api */
  const state = { status: null, preset: 'd30', from: null, to: null, metric: 'uv', view: 'overview', timers: [] };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };

  async function api(path, opts = {}) {
    const res = await fetch('/api/admin/' + path, {
      method: opts.body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (res.status === 401 && path !== 'login') { gate(); throw new Error('auth'); }
    if (!res.ok) { const err = new Error((data && data.error) || 'http-' + res.status); err.status = res.status; err.data = data; throw err; }
    if (data && Array.isArray(data.titles)) data.titles.forEach((x) => { if (x.t) TITLES[x.path] = x.t; });
    return data;
  }

  /* =========================================================== dates */
  const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const shift = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const days = (a, b) => { const out = []; for (let d = a; d <= b; d = shift(d, 1)) out.push(d); return out; };
  const PRESETS = [['today', '오늘'], ['yesterday', '어제'], ['d7', '최근 7일'], ['d30', '최근 30일'], ['d90', '최근 90일'], ['month', '이번 달'], ['lastmonth', '지난달'], ['custom', '직접 선택']];
  function presetRange(p) {
    const t = today();
    switch (p) {
      case 'today': return [t, t];
      case 'yesterday': return [shift(t, -1), shift(t, -1)];
      case 'd7': return [shift(t, -6), t];
      case 'd90': return [shift(t, -89), t];
      case 'month': return [t.slice(0, 8) + '01', t];
      case 'lastmonth': { const end = shift(t.slice(0, 8) + '01', -1); return [end.slice(0, 8) + '01', end]; }
      case 'custom': return [state.from || shift(t, -29), state.to || t];
      default: return [shift(t, -29), t];
    }
  }
  function setPreset(p, from, to) {
    state.preset = p;
    if (p === 'custom') { state.from = from; state.to = to; } else { [state.from, state.to] = presetRange(p); }
    store.set('gu_admin_range', JSON.stringify({ p, from: state.from, to: state.to }));
  }
  (function initRange() {
    let saved = null;
    try { saved = JSON.parse(store.get('gu_admin_range') || 'null'); } catch (e) { saved = null; }
    if (saved && saved.p) setPreset(saved.p, saved.from, saved.to); else setPreset('d30');
  })();
  const rangeQS = () => `from=${state.from}&to=${state.to}`;
  const rangeLabel = () => {
    const p = PRESETS.find((x) => x[0] === state.preset);
    if (state.preset !== 'custom' && p) return p[1];
    return fmt.ymd(state.from) + ' ~ ' + fmt.ymd(state.to);
  };
  const single = () => state.from === state.to;

  /* =========================================================== small renderers */
  function delta(cur, prev, goodUp = true, isRate = false) {
    if (cur === null || cur === undefined || prev === null || prev === undefined) return '<span class="delta flat">비교 자료 없음</span>';
    if (!prev && !cur) return '<span class="delta flat">변화 없음</span>';
    if (!prev) return `<span class="delta ${goodUp ? 'up' : 'down'}">새로 생김</span>`;
    let d, txt;
    if (isRate) { d = cur - prev; txt = Math.abs(d * 100).toFixed(1) + '%p'; }
    else { d = (cur - prev) / prev; txt = Math.abs(d * 100) >= 10 ? Math.round(Math.abs(d * 100)) + '%' : Math.abs(d * 100).toFixed(1) + '%'; }
    if (Math.abs(d) < 0.0005) return '<span class="delta flat">변화 없음</span>';
    const up = d > 0, good = up === goodUp;
    return `<span class="delta ${good ? 'up' : 'down'}" title="이전 기간 대비">${up ? '▲' : '▼'} ${txt}<span class="vs">이전 대비</span></span>`;
  }
  function spark(values, color = 'var(--s1)') {
    const v = values.map((x) => x || 0);
    if (v.length < 2) return '';
    const max = Math.max(...v, 1), W = 84, H = 26, p = 3;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * (W - p * 2) + p, H - p - (y / max) * (H - p * 2)]);
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline fill="none" stroke="#b9c3d1" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((q) => q.join(',')).join(' ')}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/></svg>`;
  }
  const helpBtn = (t) => (t ? `<button type="button" class="help" data-help="${esc(t)}" aria-label="설명: ${esc(t)}">?</button>` : '');
  function kpi({ k, v, unit = '', d = '', s = '', help = '', goal = false, sub = '' }) {
    return `<div class="kpi${goal ? ' goal' : ''}"><div class="k">${esc(k)} ${helpBtn(help)}</div><div class="v">${v}${unit ? `<small>${unit}</small>` : ''}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}<div class="row">${d}${s}</div></div>`;
  }
  function bars(rows, { color = 'var(--s1)', fmtV = fmt.n, total = null, click = '' } = {}) {
    if (!rows.length) return empty('아직 기록이 없습니다.');
    const max = Math.max(...rows.map((r) => r.v), 1);
    const sum = total || rows.reduce((a, r) => a + r.v, 0);
    return `<div class="bars">${rows.map((r) => `<div class="b${click ? ' click' : ''}"${click ? ` data-${click}="${esc(r.key)}" tabindex="0" role="button"` : ''}>
      <div class="l" title="${esc(r.label)}">${esc(r.label)}${r.small ? `<small>${esc(r.small)}</small>` : ''}</div>
      <div class="val">${fmtV(r.v)}${sum && r.share !== false ? `<small>${fmt.pct(r.v / sum)}</small>` : ''}</div>
      <div class="track"><div class="fill" style="width:${(r.v / max) * 100}%;background:${r.color || color}"></div></div>
      ${r.meta ? `<div class="meta">${r.meta}</div>` : ''}</div>`).join('')}</div>`;
  }
  function segbar(parts) {
    const total = parts.reduce((a, p) => a + p.v, 0);
    if (!total) return empty('아직 기록이 없습니다.');
    const vis = parts.filter((p) => p.v > 0);
    return `<div class="segbar" role="img" aria-label="${esc(vis.map((p) => p.label + ' ' + fmt.pct(p.v / total)).join(', '))}">${vis.map((p) => {
      const w = (p.v / total) * 100;
      return `<div style="flex:${p.v} 1 0;background:${p.color}" class="${p.dark ? 'dark' : ''}" title="${esc(p.label)} ${fmt.n(p.v)} (${fmt.pct(p.v / total)})">${w >= 12 ? fmt.pct(p.v / total) : ''}</div>`;
    }).join('')}</div><ul class="seglist">${vis.map((p) => `<li><i style="background:${p.color}"></i><span>${esc(p.label)}</span><b>${fmt.n(p.v)}</b><span class="p">${fmt.pct(p.v / total)}</span></li>`).join('')}</ul>`;
  }
  const empty = (t, sub = '') => `<div class="empty"><b>${esc(t)}</b>${sub}</div>`;
  const card = (title, body, { sub = '', more = '', cls = '', desc = '' } = {}) =>
    `<section class="card ${cls}"><div class="card-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ''}${more}</div>${desc ? `<p class="desc">${desc}</p>` : ''}${body}</section>`;
  const chip = (st) => `<span class="chip st-${esc(st)}"><i></i>${esc(ST[st] || st)}</span>`;

  /* =========================================================== line chart */
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function lineChart(el, { labels, xFmt, tipFmt, series, yFmt = fmt.c, valFmt = fmt.n, height = 250, int = true }) {
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.hidden = true;
    let idx = -1, geom = null;
    function draw() {
      const W = Math.max(280, el.clientWidth || 600), H = height, m = { l: 46, r: 14, t: 12, b: 26 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b, n = labels.length;
      const all = series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined));
      const vmax = Math.max(int ? 4 : 0.0001, ...all);
      let step = niceStep(vmax / 4); if (int) step = Math.max(1, Math.round(step));
      const max = Math.ceil(vmax / step) * step || step;
      const x = (i) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
      const y = (v) => m.t + ih - (v / max) * ih;
      geom = { x, y, m, iw, ih, n, W, H };
      let g = '<g class="grid">';
      for (let v = 0; v <= max + 1e-9; v += step) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      g += '</g><g class="axis">';
      for (let v = 0; v <= max + 1e-9; v += step) g += `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${yFmt(v)}</text>`;
      const every = Math.max(1, Math.ceil(n / (W < 520 ? 4 : W < 900 ? 7 : 10)));
      for (let i = 0; i < n; i += every) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(xFmt(labels[i], i))}</text>`;
      g += `</g><line class="base" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
      let p = '';
      series.slice().reverse().forEach((s) => {
        const pts = s.values.map((v, i) => (v === null || v === undefined ? null : [x(i), y(v)]));
        let d = '', on = false;
        pts.forEach((q) => { if (!q) { on = false; return; } d += (on ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); on = true; });
        if (s.area && n > 1) p += `<path d="${d}L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z" fill="${s.wash || 'var(--s1-wash)'}"/>`;
        p += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
        if (n === 1 && pts[0]) p += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
      });
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" tabindex="0" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))} 추이. 방향키로 날짜별 값을 볼 수 있습니다.">${g}${p}<g class="hl"></g><rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
      el.appendChild(tip);
      const svg = el.querySelector('svg');
      svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; show(Math.round(((px - m.l) / iw) * (n - 1))); });
      svg.addEventListener('pointerleave', hide);
      svg.addEventListener('focus', () => show(idx >= 0 ? idx : n - 1));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { show(Math.max(0, idx - 1)); e.preventDefault(); }
        if (e.key === 'ArrowRight') { show(Math.min(n - 1, idx + 1)); e.preventDefault(); }
      });
      if (idx >= 0 && !tip.hidden) show(idx);
    }
    function show(i) {
      const { x, y, m, ih, n, W } = geom;
      i = Math.max(0, Math.min(n - 1, isNaN(i) ? 0 : i)); idx = i;
      const hl = el.querySelector('.hl');
      let s = `<line class="hair" x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${m.t + ih}"/>`;
      series.forEach((se) => { const v = se.values[i]; if (v !== null && v !== undefined) s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${se.color}" stroke="#fff" stroke-width="2"/>`; });
      hl.innerHTML = s;
      tip.innerHTML = `<div class="t">${esc(tipFmt ? tipFmt(labels[i], i) : xFmt(labels[i], i))}</div>` + series.map((se) => `<div class="r"><i style="background:${se.color}"></i><b>${se.values[i] === null || se.values[i] === undefined ? '–' : esc(valFmt(se.values[i]))}</b><span>${esc(se.name)}</span></div>`).join('');
      tip.hidden = false;
      const rect = el.getBoundingClientRect(), sx = rect.width / W;
      let left = x(i) * sx + 14;
      if (left + tip.offsetWidth > rect.width) left = x(i) * sx - tip.offsetWidth - 14;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = '8px';
    }
    function hide() { tip.hidden = true; const hl = el.querySelector('.hl'); if (hl) hl.innerHTML = ''; }
    draw();
    let rt;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(draw, 120); });
    ro.observe(el);
    state.timers.push(() => ro.disconnect());
  }

  /* daily/hourly series helper */
  function seriesFrom(rows, keyField, valField, labels) {
    const map = {};
    (rows || []).forEach((r) => (map[r[keyField]] = r[valField]));
    return labels.map((l) => map[l] || 0);
  }
  function axis() {
    if (single()) {
      const hrs = Array.from({ length: 24 }, (_, i) => i);
      return { labels: hrs, key: 'hour', xFmt: (h) => h + '시', tipFmt: (h) => `${fmt.ymd(state.from)} ${h}시`, prevTip: () => '' };
    }
    const cur = days(state.from, state.to);
    const n = cur.length, pFrom = shift(state.from, -n);
    return { labels: cur, key: 'day', xFmt: (d) => fmt.md(d), tipFmt: (d, i) => `${fmt.ymd(d)} (이전 기간 ${fmt.md(shift(pFrom, i))})` };
  }
  const prevLabels = (labels) => (single() ? labels : labels.map((_, i) => shift(state.from, -labels.length + i)));

  /* =========================================================== tooltip for help & heat */
  let floatTip;
  function bindFloatTips(root) {
    if (!floatTip) { floatTip = document.createElement('div'); floatTip.className = 'tip'; floatTip.hidden = true; floatTip.style.position = 'fixed'; floatTip.style.whiteSpace = 'normal'; floatTip.style.maxWidth = '280px'; document.body.appendChild(floatTip); }
    const showT = (el, html) => {
      floatTip.innerHTML = html; floatTip.hidden = false;
      const r = el.getBoundingClientRect();
      let left = r.left, top = r.bottom + 8;
      if (left + floatTip.offsetWidth > innerWidth - 8) left = innerWidth - floatTip.offsetWidth - 8;
      if (top + floatTip.offsetHeight > innerHeight - 8) top = r.top - floatTip.offsetHeight - 8;
      floatTip.style.left = Math.max(8, left) + 'px'; floatTip.style.top = top + 'px';
    };
    const hideT = () => { floatTip.hidden = true; };
    $$('[data-help]', root).forEach((b) => {
      const h = () => showT(b, `<div style="font-size:12.5px;line-height:1.6;color:var(--ink-2)">${esc(b.dataset.help)}</div>`);
      b.addEventListener('mouseenter', h); b.addEventListener('focus', h); b.addEventListener('click', h);
      b.addEventListener('mouseleave', hideT); b.addEventListener('blur', hideT);
    });
    $$('[data-tipv]', root).forEach((c) => {
      const h = () => showT(c, `<div class="t">${esc(c.dataset.tipt)}</div><div class="r"><b>${esc(c.dataset.tipv)}</b><span>${esc(c.dataset.tipu || '')}</span></div>`);
      c.addEventListener('mouseenter', h); c.addEventListener('focus', h);
      c.addEventListener('mouseleave', hideT); c.addEventListener('blur', hideT);
    });
  }

  /* =========================================================== heatmap & funnel */
  const RAMP = ['#f1f3f7', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'];
  function heatmap(rows) {
    const M = Array.from({ length: 7 }, () => Array(24).fill(0));
    rows.forEach((r) => (M[r.dow][r.hour] = r.n));
    const max = Math.max(1, ...M.flat());
    const order = [1, 2, 3, 4, 5, 6, 0], dn = ['일', '월', '화', '수', '목', '금', '토'];
    let h = '<div class="heat" role="grid" aria-label="요일·시간대별 방문 수"><div></div>';
    for (let i = 0; i < 24; i++) h += `<div class="h">${i % 3 === 0 ? i : ''}</div>`;
    order.forEach((d) => {
      h += `<div class="d">${dn[d]}</div>`;
      for (let i = 0; i < 24; i++) {
        const v = M[d][i];
        const lvl = v ? Math.min(6, 1 + Math.floor((v / max) * 5.999)) : 0;
        h += `<div class="c" tabindex="-1" style="background:${RAMP[lvl]}" data-tipt="${dn[d]}요일 ${i}시" data-tipv="${fmt.n(v)}회" data-tipu="방문" aria-label="${dn[d]}요일 ${i}시 방문 ${v}회"></div>`;
      }
    });
    h += '</div><div class="heat-legend">적음 ' + RAMP.slice(1).map((c) => `<i style="background:${c}"></i>`).join('') + ' 많음</div>';
    return h;
  }
  function funnel(f) {
    if (!f || !f.a) return empty('아직 방문 기록이 없습니다.');
    const steps = [
      ['방문', '사이트에 들어온 사람', f.a], ['사업 정보 열람', '사업영역 · 절차 · 인사이트', f.b],
      ['상담 페이지 도달', '상담문의 페이지를 본 사람', f.c], ['폼 작성 시작', '상담 폼에 입력을 시작', f.d], ['상담 신청', '접수 완료', f.e],
    ];
    const colors = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', 'var(--point)'];
    return `<div class="funnel">${steps.map((s, i) => `
      ${i ? `<div class="drop">앞 단계의 ${fmt.pct(steps[i - 1][2] ? s[2] / steps[i - 1][2] : 0)}가 이어짐</div>` : ''}
      <div class="st"><div class="nm">${s[0]}<small>${s[1]}</small></div><div class="tr"><div class="fl" style="width:${(s[2] / f.a) * 100}%;background:${colors[i]}"></div></div>
      <div class="n">${fmt.n(s[2])}<small>${fmt.pct(s[2] / f.a)}</small></div></div>`).join('')}</div>`;
  }

  /* =========================================================== tables */
  function sortableTable(el, cols, rows, { sortKey, onRow, rowKey } = {}) {
    let key = sortKey || cols.find((c) => c.sort)?.key, dir = -1;
    function render() {
      const sorted = rows.slice().sort((a, b) => {
        const x = a[key], y = b[key];
        if (typeof x === 'string' || typeof y === 'string') return String(x || '').localeCompare(String(y || ''), 'ko') * dir;
        return ((x || 0) - (y || 0)) * dir;
      });
      el.innerHTML = rows.length ? `<div class="tbl-wrap"><table class="t"><thead><tr>${cols.map((c) => `<th class="${c.r ? 'r ' : ''}${c.sort ? 'sort' : ''}" ${c.sort ? `data-k="${c.key}" tabindex="0"` : ''} ${c.key === key ? `aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}>${c.name}${c.help ? ' ' + helpBtn(c.help) : ''}</th>`).join('')}</tr></thead>
        <tbody>${sorted.map((r) => `<tr class="${onRow ? 'row' : ''}" ${onRow ? `data-key="${esc(r[rowKey])}" tabindex="0"` : ''}>${cols.map((c) => `<td class="${c.r ? 'r' : ''}">${c.html ? c.html(r) : esc(c.fmt ? c.fmt(r[c.key]) : r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : empty('이 기간에 기록이 없습니다.');
      $$('th.sort', el).forEach((th) => {
        const go = () => { if (key === th.dataset.k) dir = -dir; else { key = th.dataset.k; dir = -1; } render(); };
        th.addEventListener('click', (e) => { if (!e.target.closest('.help')) go(); });
        th.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      });
      if (onRow) $$('tr.row', el).forEach((tr) => {
        tr.addEventListener('click', () => onRow(tr.dataset.key));
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') onRow(tr.dataset.key); });
      });
      bindFloatTips(el);
    }
    render();
  }

  /* =========================================================== drawer & toast */
  function drawer(title, html, onMount) {
    let dr = $('#dr');
    if (!dr) { dr = document.createElement('div'); dr.id = 'dr'; dr.className = 'dr'; document.body.appendChild(dr); }
    const prevFocus = document.activeElement;
    dr.innerHTML = `<div class="bg"></div><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ph"><h2>${esc(title)}</h2><button type="button" aria-label="닫기">${icon('close')}</button></div><div class="pb">${html}</div></div>`;
    dr.classList.add('open');
    const close = () => { dr.classList.remove('open'); dr.innerHTML = ''; document.removeEventListener('keydown', onKey); if (location.hash.split('/').length > 1) history.replaceState(null, '', '#' + state.view); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.bg', dr).addEventListener('click', close);
    $('.ph button', dr).addEventListener('click', close);
    $('.ph button', dr).focus();
    if (onMount) onMount($('.pb', dr), close);
    return close;
  }
  function toast(t) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; el.setAttribute('role', 'status');
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }

  /* =========================================================== gate (login / setup) */
  function gate(mode) {
    clearTimers();
    const st = state.status || {};
    const app = $('#app');
    const brand = `<div class="brand">${LOGO}<div><b>지유공간개발</b><span>홈페이지 관리자</span></div></div>`;
    if (!st.configured || !st.db) {
      app.innerHTML = `<div class="gate"><div class="box">${brand}<h1>관리자 기능 설정이 필요합니다</h1>
        <p>Cloudflare 대시보드에서 아래 항목을 마치면 이 화면이 로그인 화면으로 바뀝니다. 자세한 순서는 저장소의 README 「관리자 · 방문 통계」 항목에 있습니다.</p>
        <ol>
          <li>${st.db ? '✓ ' : ''}<b>D1 데이터베이스 연결</b> — Workers &amp; Pages → D1에서 데이터베이스를 만들고, 이 Pages 프로젝트 Settings → Bindings에 변수 이름 <code>DB</code>로 연결합니다.</li>
          <li>${st.configured ? '✓ ' : ''}<b>관리자 비밀번호</b> — Settings → Variables and Secrets에 <code>ADMIN_PASSWORD</code>를 비밀(Secret) 값으로 추가합니다.</li>
          <li><b>다시 배포</b> — Deployments에서 최신 배포를 Retry 하면 적용됩니다.</li>
        </ol>
        <a class="back" href="../index.html">← 홈페이지로 돌아가기</a></div></div>`;
      return;
    }
    app.innerHTML = `<div class="gate"><div class="box">${brand}<h1>관리자 로그인</h1><p>${mode === 'expired' ? '로그인 시간이 지나 다시 로그인해 주세요.' : 'Cloudflare에 설정한 관리자 비밀번호를 입력하세요.'}</p>
      <form id="login"><label class="small muted" for="pw">비밀번호</label><input id="pw" type="password" autocomplete="current-password" required>
      <div class="err" role="alert"></div><button class="btn btn-primary" type="submit">로그인</button></form>
      <a class="back" href="../index.html">← 홈페이지로 돌아가기</a></div></div>`;
    const f = $('#login'), err = $('.err', f);
    $('#pw').focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const b = $('button', f); b.disabled = true;
      try {
        await api('login', { body: { password: $('#pw').value } });
        state.status = await api('status');
        shell();
      } catch (ex) {
        err.textContent = ex.message === 'too-many' ? '로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해 주세요.' : '비밀번호가 맞지 않습니다.';
        b.disabled = false; $('#pw').select();
      }
    });
  }

  /* =========================================================== shell */
  function shell() {
    const app = $('#app');
    app.innerHTML = `<div class="app"><aside class="side" id="side">
        <a class="brand" href="#overview">${LOGO}<div><b>지유공간개발</b><span>홈페이지 관리자</span></div></a>
        <nav aria-label="관리자 메뉴">${NAV.map((n) => (n.group !== undefined ? `<div class="grp">${n.group}</div>` : `<a href="#${n.id}" data-v="${n.id}">${icon(n.id)}<span>${n.name}</span>${n.id === 'leads' ? '<span class="badge" id="badge-leads" hidden></span>' : ''}</a>`)).join('')}</nav>
        <div class="foot"><a href="../index.html" target="_blank" rel="noopener">${icon('out')}홈페이지 보기</a><button type="button" id="logout">${icon('logout')}로그아웃</button></div>
      </aside>
      <div class="main"><div class="topbar"><button type="button" id="menu" aria-label="메뉴 열기">${icon('menu')}</button><b id="tb-title"></b></div><div class="content" id="content"></div></div></div>`;
    $('#content').dataset.view = '';
    $('#logout').addEventListener('click', async () => { try { await api('logout', { body: {} }); } catch (e) { /* */ } gate(); });
    const side = $('#side');
    $('#menu').addEventListener('click', () => {
      side.classList.add('open');
      const s = document.createElement('div'); s.className = 'scrim'; s.addEventListener('click', () => { side.classList.remove('open'); s.remove(); }); document.body.appendChild(s);
    });
    $$('nav a', side).forEach((a) => a.addEventListener('click', () => { side.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); }));
    route();
  }

  function clearTimers() { state.timers.forEach((f) => { try { f(); } catch (e) { /* */ } }); state.timers = []; }

  function route() {
    const [v, id] = (location.hash.slice(1) || 'overview').split('/');
    const view = VIEWS[v] ? v : 'overview';
    state.view = view;
    clearTimers();
    $$('#side nav a').forEach((a) => (a.getAttribute('data-v') === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    const meta = NAV.find((n) => n.id === view);
    $('#tb-title').textContent = meta.name;
    document.title = meta.name + ' | 지유공간개발 관리자';
    const c = $('#content');
    if (c.dataset.view !== view) {
      c.dataset.view = view;
      c.innerHTML = `<div class="page-head"><div><h1>${meta.name}</h1><p>${meta.desc}</p></div><div class="tools" id="tools"></div></div>
        <div id="filters">${view === 'settings' ? '' : filterRow()}</div><div id="view"></div>`;
    } else {
      $('#filters').innerHTML = view === 'settings' ? '' : filterRow();
      $('#view').classList.add('loading');
    }
    bindFilters();
    const box = $('#view');
    VIEWS[view](box, id).then(() => box.classList.remove('loading')).catch((e) => {
      box.classList.remove('loading');
      if (e.message === 'auth') return;
      box.innerHTML = `<div class="notice">${icon('warn')}<div>자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. <span class="muted">(${esc(e.message)})</span></div></div>`;
    });
    refreshBadge();
  }

  function filterRow() {
    return `<div class="filters" role="group" aria-label="기간 선택"><div class="seg">${PRESETS.map(([k, n]) => `<button type="button" data-p="${k}" aria-pressed="${state.preset === k}">${n}</button>`).join('')}</div>
      <span class="custom-range" ${state.preset === 'custom' ? '' : 'hidden'}><input type="date" id="rf" value="${state.from}" max="${today()}" aria-label="시작일"> ~ <input type="date" id="rt" value="${state.to}" max="${today()}" aria-label="종료일"></span>
      <span class="range-label num">${fmt.ymd(state.from)}${single() ? '' : ' ~ ' + fmt.ymd(state.to)}</span></div>`;
  }
  function bindFilters() {
    $$('.filters [data-p]').forEach((b) => b.addEventListener('click', () => {
      setPreset(b.dataset.p, state.from, state.to);
      route();
    }));
    const rf = $('#rf'), rt = $('#rt');
    if (rf && rt) [rf, rt].forEach((i) => i.addEventListener('change', () => { if (rf.value && rt.value) { setPreset('custom', rf.value <= rt.value ? rf.value : rt.value, rf.value <= rt.value ? rt.value : rf.value); route(); } }));
  }
  async function refreshBadge() {
    try {
      const r = await api('leads?status=new&page=1');
      const n = (r.counts.find((x) => x.k === 'new') || {}).n || 0;
      const b = $('#badge-leads');
      if (b) { b.hidden = !n; b.textContent = n; }
    } catch (e) { /* */ }
  }
  const tools = (html) => { const t = $('#tools'); if (t) t.innerHTML = html; };
  const exportBtn = (type, label = 'CSV 내려받기') => `<a class="btn" href="/api/admin/export?type=${type}&${rangeQS()}">${icon('down')}${label}</a>`;

  /* =========================================================== VIEW: overview */
  const VIEWS = {};
  VIEWS.overview = async (el) => {
    tools(`<button class="btn" type="button" id="reload">${icon('refresh')}새로고침</button>`);
    $('#reload').addEventListener('click', route);
    const [d, st] = await Promise.all([api('overview?' + rangeQS()), api('status')]);
    state.status = st;
    const c = d.cur, p = d.prev;
    const ax = axis();
    const src = single() ? d.hourly : d.daily;
    const pl = prevLabels(ax.labels);
    const S = {
      uv: [seriesFrom(src.cur, ax.key, 'uv', ax.labels), seriesFrom(src.prev, ax.key, 'uv', pl)],
      ss: [seriesFrom(src.cur, ax.key, 'ss', ax.labels), seriesFrom(src.prev, ax.key, 'ss', pl)],
      pv: [seriesFrom(src.cur, ax.key, 'pv', ax.labels), seriesFrom(src.prev, ax.key, 'pv', pl)],
      clk: [seriesFrom(src.clk, ax.key, 'n', ax.labels), seriesFrom(src.pclk, ax.key, 'n', pl)],
      inq: [seriesFrom(src.inq, ax.key, 'n', ax.labels), seriesFrom(src.pinq, ax.key, 'n', pl)],
      mem: [seriesFrom(src.mem, ax.key, 'n', ax.labels), seriesFrom(src.pmem, ax.key, 'n', pl)],
    };
    const dur = seriesFrom(d.daily.sess, 'day', 'dur', days(state.from, state.to));
    const bounce = seriesFrom(d.daily.sess, 'day', 'bounce', days(state.from, state.to));
    const top = d.pages[0];
    const noData = !st.counts || !st.counts.pageviews;

    let brief;
    if (noData) {
      brief = `<div class="notice">${icon('warn')}<div><b>아직 쌓인 방문 기록이 없습니다.</b> 배포된 홈페이지에 첫 방문이 들어오면 바로 집계가 시작됩니다. 관리자로 로그인한 브라우저의 방문은 통계에서 빠지므로, 확인하려면 다른 브라우저나 휴대폰으로 홈페이지를 열어 보세요.</div></div>`;
    } else {
      const chg = p.visitors ? (c.visitors - p.visitors) / p.visitors : null;
      const parts = [`<b>${esc(rangeLabel())}</b> 동안 <b>${fmt.n(c.visitors)}명</b>이 ${fmt.n(c.sessions)}번 방문해 ${fmt.n(c.pageviews)}페이지를 봤습니다.`];
      if (chg !== null && Math.abs(chg) >= 0.01) parts.push(`방문자는 이전 기간보다 ${fmt.pct(Math.abs(chg))} ${chg > 0 ? '늘었습니다' : '줄었습니다'}.`);
      if (top) parts.push(`가장 많이 본 정보는 「${esc(pageName(top.path, top.title))}」입니다.`);
      parts.push(`상담 신청은 <b>${fmt.n(c.inquiries)}건</b>${c.visitors ? `(방문자 대비 ${fmt.pct(c.conversionRate)})` : ''}, 신규 회원은 <b>${fmt.n(c.signups)}명</b>입니다.`);
      if (d.openInquiries) parts.push(`아직 연락하지 않은 상담이 <a href="#leads" style="text-decoration:underline"><b>${d.openInquiries}건</b></a> 있습니다.`);
      brief = `<div class="brief">${parts.join(' ')}</div>`;
    }
    const ch = d.channels.map((r) => ({ label: chName(r.ch), v: r.ss, color: CH_COLOR[r.ch] || '#c6cdd8', dark: CH_DARK[r.ch] }));
    const dev = d.devices.map((r, i) => ({ label: DEV[r.k] || r.k, v: r.n, color: ['var(--s1)', 'var(--s2)', 'var(--s3)'][i] || '#c6cdd8' }));
    const METRICS = [['uv', '방문자'], ['ss', '방문 횟수'], ['pv', '페이지뷰'], ['clk', '클릭'], ['inq', '상담 신청'], ['mem', '회원가입']];
    if (!METRICS.find((m) => m[0] === state.metric)) state.metric = 'uv';

    el.innerHTML = `${brief}
      <div class="kpis">
        ${kpi({ k: '방문자', v: fmt.n(c.visitors), unit: '명', d: delta(c.visitors, p.visitors), s: spark(S.uv[0]), help: '기간 동안 사이트를 연 사람 수입니다. 같은 브라우저로 여러 번 와도 한 명으로 셉니다.' })}
        ${kpi({ k: '방문 횟수', v: fmt.n(c.sessions), unit: '회', d: delta(c.sessions, p.sessions), s: spark(S.ss[0]), help: '사이트에 들어와서 나갈 때까지를 한 번으로 셉니다. 30분 넘게 쉬었다가 다시 오면 새 방문입니다.' })}
        ${kpi({ k: '페이지뷰', v: fmt.n(c.pageviews), unit: '회', d: delta(c.pageviews, p.pageviews), s: spark(S.pv[0]), help: '페이지가 열린 총횟수입니다.' })}
        ${kpi({ k: '평균 체류시간', v: fmt.dur(c.avgSession), d: delta(c.avgSession, p.avgSession), s: spark(dur), help: '방문 한 번에 화면을 실제로 보고 있던 평균 시간입니다. 다른 탭을 보거나 2분 넘게 움직임이 없으면 시간을 세지 않습니다.' })}
        ${kpi({ k: '이탈률', v: fmt.pct(c.bounceRate), d: delta(c.bounceRate, p.bounceRate, false, true), s: spark(bounce, 'var(--s2)'), help: '한 페이지만 보고 10초 안에 나간 방문의 비율입니다. 낮을수록 좋습니다.' })}
        ${kpi({ k: '클릭', v: fmt.n(c.clicks), unit: '회', d: delta(c.clicks, p.clicks), s: spark(S.clk[0]), help: '메뉴, 버튼, 전화·이메일·지도 링크 등을 누른 횟수입니다.', sub: `연락 행동(전화·이메일·지도) ${fmt.n(c.contactIntent)}회` })}
        ${kpi({ k: '상담 신청', v: fmt.n(c.inquiries), unit: '건', d: delta(c.inquiries, p.inquiries), s: spark(S.inq[0], 'var(--point)'), help: '상담 폼으로 접수된 건수입니다. 이 사이트의 최종 목표 지표입니다.', goal: true, sub: `방문자 대비 전환율 ${fmt.pct(c.conversionRate)}` })}
        ${kpi({ k: '신규 회원', v: fmt.n(c.signups), unit: '명', d: delta(c.signups, p.signups), s: spark(S.mem[0], 'var(--point)'), help: '기간 동안 회원가입한 사람 수입니다.', goal: true, sub: `전체 회원 ${fmt.n(d.totalMembers)}명` })}
      </div>
      <div class="grid g-21 mt">
        ${card('추이', `<div class="metric-tabs" role="tablist">${METRICS.map(([k, n]) => `<button type="button" role="tab" data-m="${k}" aria-selected="${state.metric === k}">${n}</button>`).join('')}</div>
          <div class="legend" style="margin-bottom:8px"><span><i style="background:var(--s1)"></i>이번 기간</span><span><i style="background:var(--prev)"></i>이전 기간 (${fmt.ymd(d.range.prevFrom)}${single() ? '' : ' ~ ' + fmt.ymd(d.range.prevTo)})</span></div>
          <div class="chart" id="trend"></div><div id="trend-table" class="trend-table" hidden></div>`, { more: '<a class="more" href="#" id="tt">표로 보기</a>' })}
        ${card('실시간', '<div id="live">불러오는 중…</div>', { sub: '30초마다 갱신' })}
      </div>
      <div class="grid g-2 mt">
        ${card('많이 본 페이지', bars(d.pages.slice(0, 6).map((r) => ({ label: pageName(r.path, r.title), v: r.uv, key: r.path, meta: `페이지뷰 ${fmt.n(r.pv)} · 평균 ${fmt.dur(r.dur)}` })), { click: 'path', total: c.visitors }), { sub: '방문자 수', more: '<a class="more" href="#pages">전체 보기</a>' })}
        <div class="stack">
          ${card('유입 채널', segbar(ch), { sub: '방문 횟수', more: '<a class="more" href="#sources">자세히</a>' })}
          ${card('기기', segbar(dev), { sub: '방문자 수', more: '<a class="more" href="#traffic">자세히</a>' })}
        </div>
      </div>
      <div class="grid g-12 mt">
        ${card('상담까지 가는 길', funnel(d.funnel), { sub: '방문자 기준', more: '<a class="more" href="#actions">자세히</a>' })}
        <div class="grid g-2">
          ${card('최근 상담 신청', d.recentInquiries.length ? `<ul class="list">${d.recentInquiries.map((r) => `<li><div class="who"><b><a href="#leads/${r.id}">${esc(r.name)}</a></b><span>${esc(r.space || r.who || '문의')} · ${esc(srcName(r.source))}</span></div>${chip(r.status)}<time>${fmt.ago(r.created_at)}</time></li>`).join('')}</ul>` : empty('아직 상담 신청이 없습니다.'), { more: '<a class="more" href="#leads">전체</a>' })}
          ${card('최근 가입 회원', d.recentMembers.length ? `<ul class="list">${d.recentMembers.map((r) => `<li><div class="who"><b><a href="#members/${r.id}">${esc(r.name)}</a></b><span>${esc([r.company, r.who].filter(Boolean).join(' · ') || '–')}</span></div><time>${fmt.ago(r.created_at)}</time></li>`).join('')}</ul>` : empty('아직 가입한 회원이 없습니다.'), { more: '<a class="more" href="#members">전체</a>' })}
        </div>
      </div>`;

    const trendEl = $('#trend');
    function drawTrend() {
      const [cur, prev] = S[state.metric];
      const name = METRICS.find((m) => m[0] === state.metric)[1];
      trendEl.innerHTML = '';
      lineChart(trendEl, {
        labels: ax.labels, xFmt: ax.xFmt, tipFmt: ax.tipFmt, height: 360,
        series: [
          { name: name + ' · 이번 기간', values: cur, color: state.metric === 'inq' || state.metric === 'mem' ? 'var(--point)' : 'var(--s1)', area: true, wash: state.metric === 'inq' || state.metric === 'mem' ? 'rgba(23,163,95,.10)' : undefined },
          { name: '이전 기간', values: prev, color: 'var(--prev)', width: 1.5 },
        ],
      });
      $('#trend-table').innerHTML = `<div class="tbl-wrap"><table class="t"><thead><tr><th>${single() ? '시간' : '날짜'}</th><th class="r">${name}</th><th class="r">이전 기간</th></tr></thead><tbody>${ax.labels.map((l, i) => `<tr><td>${esc(single() ? l + '시' : fmt.ymd(l))}</td><td class="r">${fmt.n(cur[i])}</td><td class="r">${fmt.n(prev[i])}</td></tr>`).join('')}</tbody></table></div>`;
    }
    drawTrend();
    $$('.metric-tabs button', el).forEach((b) => b.addEventListener('click', () => {
      state.metric = b.dataset.m;
      $$('.metric-tabs button', el).forEach((x) => x.setAttribute('aria-selected', x === b));
      drawTrend();
    }));
    $('#tt').addEventListener('click', (e) => {
      e.preventDefault();
      const t = $('#trend-table'), show = t.hidden;
      t.hidden = !show; trendEl.hidden = show; e.target.textContent = show ? '그래프로 보기' : '표로 보기';
    });
    $$('[data-path]', el).forEach((b) => b.addEventListener('click', () => pageDrawer(b.dataset.path)));
    bindFloatTips(el);
    live();
    const iv = setInterval(live, 30000);
    state.timers.push(() => clearInterval(iv));
  };

  async function live() {
    const box = $('#live');
    if (!box) return;
    let r;
    try { r = await api('realtime'); } catch (e) { return; }
    const items = [
      ...r.feedPv.map((x) => ({ ts: x.ts, html: `<b>${esc(pageName(x.path, x.title))}</b> <span>${x.entry ? '· ' + esc(srcName(x.source)) + '에서 들어옴' : ''} · ${esc(DEV[x.device] || '')}</span>` })),
      ...r.feedEv.map((x) => ({ ts: x.ts, html: `<b>${esc(EV[x.type] || x.type)}</b> <span>· ${esc(x.type === 'check' ? CHECK[x.label] || x.label : x.label || '')}${x.path ? ' · ' + esc(pageName(x.path)) : ''}</span>` })),
      ...r.feedInq.map((x) => ({ ts: x.ts, html: `<b style="color:var(--point-deep)">상담 신청 접수</b> <span>· ${esc(x.name)}</span>` })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 5);
    box.innerHTML = `<div class="live"><span class="dot" aria-hidden="true"></span><span class="big num">${fmt.n(r.active5)}</span><span class="muted">명이 지금 보고 있습니다</span></div>
      <p class="small muted" style="margin-top:6px">최근 30분 방문자 ${fmt.n(r.active30)}명 · 페이지뷰 ${fmt.n(r.pv30)}</p>
      ${r.pages.length ? `<div class="sec-t">최근 30분 많이 본 페이지</div>${bars(r.pages.slice(0, 4).map((p) => ({ label: pageName(p.path), v: p.n, share: false })), { fmtV: (v) => v + '명' })}` : ''}
      <div class="sec-t">최근 활동</div>${items.length ? `<ul class="feed">${items.map((i) => `<li><time>${fmt.hm(i.ts)}</time><div>${i.html}</div></li>`).join('')}</ul>` : empty('최근 활동이 없습니다.')}`;
  }

  /* =========================================================== page detail drawer */
  async function pageDrawer(path) {
    drawer(pageName(path), '<p class="muted">불러오는 중…</p>', async (pb) => {
      const [d, list] = await Promise.all([api('page?' + rangeQS() + '&path=' + encodeURIComponent(path)), api('pages?' + rangeQS())]);
      const row = list.rows.find((r) => r.path === path) || {};
      const sc = {}; d.scroll.forEach((x) => (sc[x.k] = x.n));
      const tot = Object.values(sc).reduce((a, b) => a + b, 0) || 1;
      const reach = [25, 50, 75, 100].map((k) => ({ label: k + '% 이상 내려 봄', v: [25, 50, 75, 100].filter((x) => x >= k).reduce((a, x) => a + (sc[x] || 0), 0), share: false }));
      pb.innerHTML = `<p class="small muted" style="margin-bottom:12px">${esc(path)} · ${esc(rangeLabel())}</p>
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${kpi({ k: '페이지뷰', v: fmt.n(row.pv), unit: '회' })}${kpi({ k: '방문자', v: fmt.n(row.uv), unit: '명' })}
          ${kpi({ k: '평균 체류', v: fmt.dur(row.dur) })}${kpi({ k: '완독률', v: fmt.pct(row.readRate), help: '페이지의 75% 이상까지 내려 본 비율' })}
          ${kpi({ k: '이탈률', v: fmt.pct(row.exitRate), help: '이 페이지를 마지막으로 보고 나간 비율' })}${kpi({ k: '상담 연결', v: fmt.n(row.conv), unit: '명', help: '이 페이지를 본 뒤 같은 기간에 상담을 신청한 방문자 수' })}
        </div>
        <div class="sec-t">날짜별 방문자</div><div class="chart" id="pd-chart"></div>
        <div class="sec-t">어디까지 내려 봤나</div>${bars(reach.map((r) => ({ ...r, v: r.v })), { fmtV: (v) => fmt.pct(v / tot) })}
        <div class="sec-t">이 페이지 직전에 본 페이지</div>${bars(d.prev.map((x) => ({ label: x.k ? pageName(x.k) : '(첫 페이지로 들어옴)', v: x.n })))}
        <div class="sec-t">이 페이지 다음에 본 페이지</div>${bars(d.next.map((x) => ({ label: x.k ? pageName(x.k) : '(여기서 나감)', v: x.n })))}
        <div class="sec-t">첫 페이지로 들어온 경로</div>${bars(d.entrySrc.map((x) => ({ label: srcName(x.src), small: chName(x.ch), v: x.n })))}
        <div class="sec-t">이 페이지에서 누른 것</div>${bars(d.clicks.map((x) => ({ label: x.label || '(이름 없음)', small: EV[x.type] || x.type, v: x.n })))}`;
      const labels = days(state.from, state.to);
      lineChart($('#pd-chart', pb), { labels, xFmt: fmt.md, tipFmt: fmt.ymd, series: [{ name: '방문자', values: seriesFrom(d.daily, 'day', 'uv', labels), color: 'var(--s1)', area: true }], height: 180 });
      bindFloatTips(pb);
    });
  }

  /* =========================================================== VIEW: traffic */
  VIEWS.traffic = async (el) => {
    const d = await api('traffic?' + rangeQS());
    const c = d.cur, p = d.prev;
    const lab = days(state.from, state.to);
    const dur = { a: '10초 미만', b: '10~30초', c: '30초~1분', d: '1~3분', e: '3~10분', f: '10분 이상' };
    const dep = { 1: '1페이지', '2-3': '2~3페이지', '4-6': '4~6페이지', '7+': '7페이지 이상' };
    const frq = { 1: '1번', 2: '2번', '3-4': '3~4번', '5+': '5번 이상' };
    const order = (rows, keys, map) => keys.map((k) => ({ label: map[k], v: (rows.find((r) => String(r.k) === String(k)) || {})[rows[0] && 'v' in rows[0] ? 'v' : 'n'] || 0 }));
    const foreign = d.country.filter((r) => r.k && r.k !== 'KR');
    el.innerHTML = `<div class="kpis five">
        ${kpi({ k: '방문자', v: fmt.n(c.visitors), unit: '명', d: delta(c.visitors, p.visitors) })}
        ${kpi({ k: '처음 온 방문자', v: fmt.n(c.newVisitors), unit: '명', d: delta(c.newVisitors, p.newVisitors), help: '이 브라우저로 처음 사이트에 온 사람입니다.' })}
        ${kpi({ k: '재방문 비율', v: fmt.pct(c.visitors ? c.returningVisitors / c.visitors : null), d: delta(c.visitors ? c.returningVisitors / c.visitors : null, p.visitors ? p.returningVisitors / p.visitors : null, true, true), help: '전에 온 적이 있는 방문자의 비율입니다. 관심 고객이 다시 찾는지 보여 줍니다.' })}
        ${kpi({ k: '방문당 페이지', v: (c.pagesPerSession || 0).toFixed(1), unit: '페이지', d: delta(c.pagesPerSession, p.pagesPerSession) })}
        ${kpi({ k: '참여율', v: fmt.pct(c.engagementRate), d: delta(c.engagementRate, p.engagementRate, true, true), help: '2페이지 이상 봤거나 10초 넘게 머문 방문의 비율입니다. 이탈률의 반대입니다.' })}
      </div>
      <div class="grid g-21 mt">
        ${card('날짜별 방문자', `<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--s1)"></i>전체 방문자</span><span><i style="background:var(--s2)"></i>처음 온 방문자</span></div><div class="chart" id="tr-chart"></div>`)}
        <div class="stack">
          ${card('기기', segbar(d.device.map((r, i) => ({ label: DEV[r.k] || r.k, v: r.n, color: ['var(--s1)', 'var(--s2)', 'var(--s3)'][i] || '#c6cdd8' }))), { sub: '방문자 수' })}
          ${card('운영체제', bars(d.os.slice(0, 4).map((r) => ({ label: r.k, v: r.n }))), { sub: '방문자 수' })}
        </div>
      </div>
      <div class="grid mt">${card('요일 · 시간대별 방문', heatmap(d.heat), { sub: '방문 횟수, 한국 시간', desc: '상담 전화를 받을 인력 배치나 게시물 올릴 시간을 정할 때 참고하세요.' })}</div>
      <div class="grid g-3 mt">
        ${card('지역', bars(d.region.slice(0, 7).map((r) => ({ label: regionName(r.k, r.c), v: r.n }))), { sub: '방문자 수', desc: '접속 위치로 추정한 대략적인 지역입니다.' })}
        ${card('브라우저', bars(d.browser.slice(0, 7).map((r) => ({ label: r.k, v: r.n }))), { sub: '방문자 수' })}
        ${card('한 번에 머문 시간', bars(order(d.durBuckets, ['a', 'b', 'c', 'd', 'e', 'f'], dur)), { sub: '방문 횟수' })}
      </div>
      <div class="grid g-2 mt">
        ${card('한 번에 본 페이지 수', bars(order(d.depth, ['1', '2-3', '4-6', '7+'], dep)), { sub: '방문 횟수' })}
        ${card('기간 안에 다시 온 횟수', bars(order(d.frequency, ['1', '2', '3-4', '5+'], frq)), { sub: '방문자 수' })}
      </div>
      ${foreign.length ? `<div class="grid mt">${card('국가', bars(d.country.map((r) => ({ label: r.k ? countryName(r.k) : '알 수 없음', v: r.n }))), { sub: '방문자 수' })}</div>` : ''}`;
    lineChart($('#tr-chart'), {
      labels: lab, xFmt: fmt.md, tipFmt: fmt.ymd, height: 320,
      series: [
        { name: '전체 방문자', values: seriesFrom(d.daily, 'day', 'uv', lab), color: 'var(--s1)', area: true },
        { name: '처음 온 방문자', values: seriesFrom(d.daily, 'day', 'nv', lab), color: 'var(--s2)' },
      ],
    });
    bindFloatTips(el);
  };

  /* =========================================================== VIEW: pages */
  VIEWS.pages = async (el) => {
    tools(exportBtn('pages'));
    const d = await api('pages?' + rangeQS());
    const rows = d.rows.map((r) => ({ ...r, name: pageName(r.path, r.title) }));
    const maxPv = Math.max(1, ...rows.map((r) => r.pv));
    el.innerHTML = `<section class="card"><div class="card-head"><h2>페이지별 지표</h2><div class="search"><input type="search" id="pq" placeholder="페이지 이름이나 주소로 찾기" aria-label="페이지 찾기"></div></div>
      <p class="desc">행을 누르면 그 페이지의 날짜별 추이, 앞뒤로 본 페이지, 스크롤 깊이, 클릭한 항목을 볼 수 있습니다.</p><div id="ptable"></div></section>`;
    const cols = [
      { key: 'name', name: '페이지', sort: true, html: (r) => `<span class="pt">${esc(r.name)}</span><span class="pp">${esc(r.path)}</span>` },
      { key: 'pv', name: '페이지뷰', r: true, sort: true, html: (r) => `${fmt.n(r.pv)}<span class="mini-bar" style="width:${(r.pv / maxPv) * 60}px"></span>` },
      { key: 'uv', name: '방문자', r: true, sort: true, fmt: fmt.n },
      { key: 'dur', name: '평균 체류', r: true, sort: true, fmt: fmt.dur, help: '그 페이지를 보고 있던 평균 시간' },
      { key: 'readRate', name: '완독률', r: true, sort: true, fmt: fmt.pct, help: '페이지의 75% 이상까지 내려 본 비율' },
      { key: 'entries', name: '첫 페이지', r: true, sort: true, fmt: fmt.n, help: '이 페이지로 사이트에 처음 들어온 횟수' },
      { key: 'exitRate', name: '이탈률', r: true, sort: true, fmt: fmt.pct, help: '이 페이지를 마지막으로 보고 나간 비율' },
      { key: 'conv', name: '상담 연결', r: true, sort: true, fmt: fmt.n, help: '이 페이지를 본 뒤 같은 기간에 상담을 신청한 방문자 수' },
    ];
    const draw = (q) => sortableTable($('#ptable'), cols, q ? rows.filter((r) => (r.name + r.path).toLowerCase().includes(q.toLowerCase())) : rows, { sortKey: 'pv', onRow: pageDrawer, rowKey: 'path' });
    draw('');
    $('#pq').addEventListener('input', (e) => draw(e.target.value.trim()));
  };

  /* =========================================================== VIEW: content */
  VIEWS.content = async (el) => {
    const d = await api('content?' + rangeQS());
    const items = d.items.map((r) => ({ ...r, name: pageName(r.path, r.title) }));
    const biz = items.filter((r) => r.grp === 'business' && r.path !== '/business').sort((a, b) => b.uv - a.uv);
    const ins = items.filter((r) => r.grp === 'insights' && r.path !== '/insights').sort((a, b) => b.uv - a.uv);
    const rank = items.filter((r) => !['/business', '/insights'].includes(r.path)).sort((a, b) => b.uv - a.uv || b.dur - a.dur).slice(0, 10);
    const totalCheck = d.check.reduce((a, r) => a + r.n, 0);
    const topBiz = biz[0], topIns = ins[0], topCheck = d.check[0];
    const lines = [];
    if (topBiz) lines.push(`사업영역 중에서는 ${josa('「' + esc(topBiz.name) + '」', '을/를')} 가장 많이 봤습니다(방문자 ${fmt.n(topBiz.uv)}명, 평균 ${fmt.dur(topBiz.dur)}).`);
    if (topIns) lines.push(`인사이트 글은 ${josa('「' + esc(topIns.name) + '」', '이/가')} 가장 많이 읽혔고 완독률은 ${fmt.pct(topIns.readRate)}입니다.`);
    if (topCheck) lines.push(`자가진단에서는 「${esc(CHECK[topCheck.k] || topCheck.k)}」 추천이 가장 많이 나왔습니다.`);
    el.innerHTML = `${lines.length ? `<div class="brief">${lines.join(' ')}</div>` : ''}
      <div class="grid g-21">
        ${card('관심 정보 순위', bars(rank.map((r) => ({ label: r.name, small: GRP[r.grp], v: r.uv, key: r.path, meta: `평균 ${fmt.dur(r.dur)} · 완독률 ${fmt.pct(r.readRate)}${r.conv ? ` · 상담 연결 ${r.conv}명` : ''}` })), { click: 'path', total: null }), { sub: '방문자 수 기준', desc: '사업영역, 진행절차, 고객별 솔루션, 인사이트 글을 한데 모아 많이 본 순서로 보여 줍니다.' })}
        ${card('메뉴별 관심', bars(d.groups.filter((g) => g.k !== 'member').map((g) => ({ label: GRP[g.k] || g.k, v: g.uv, meta: `페이지뷰 ${fmt.n(g.pv)} · 평균 ${fmt.dur(g.dur)}` }))), { sub: '방문자 수' })}
      </div>
      <div class="grid g-2 mt">
        ${card('사업영역 7개', bars(biz.map((r) => ({ label: r.name, v: r.uv, key: r.path, meta: `평균 ${fmt.dur(r.dur)} · 완독률 ${fmt.pct(r.readRate)} · 상담 연결 ${fmt.n(r.conv)}명` })), { click: 'path' }), { sub: '방문자 수' })}
        ${card('인사이트 글', bars(ins.map((r) => ({ label: r.name, v: r.uv, key: r.path, meta: `평균 ${fmt.dur(r.dur)} · 완독률 ${fmt.pct(r.readRate)}` })), { click: 'path' }), { sub: '방문자 수' })}
      </div>
      <div class="grid g-3 mt">
        ${card('자가진단 추천 결과', bars(d.check.map((r) => ({ label: CHECK[r.k] || r.k, v: r.n })), { color: 'var(--s3)', total: totalCheck }), { sub: '진단 완료 횟수', desc: '홈 화면 자가진단에서 방문자가 고른 답에 따라 추천된 서비스입니다.' })}
        ${card('상담 신청 공간 유형', bars(d.space.map((r) => ({ label: r.k || '선택 안 함', v: r.n })), { color: 'var(--s3)' }), { sub: '상담 건수' })}
        ${card('상담 신청 고객 유형', bars(d.who.map((r) => ({ label: r.k || '선택 안 함', v: r.n })), { color: 'var(--s3)' }), { sub: '상담 건수' })}
      </div>
      <div class="grid mt">${card('회원 관심 분야', bars(d.interest.map((r) => ({ label: r.k, v: r.n }))), { sub: '전체 회원, 복수 선택' })}</div>`;
    $$('[data-path]', el).forEach((b) => b.addEventListener('click', () => pageDrawer(b.dataset.path)));
  };

  /* =========================================================== VIEW: sources */
  VIEWS.sources = async (el) => {
    const d = await api('sources?' + rangeQS());
    const inq = Object.fromEntries(d.inqCh.map((r) => [r.ch, r.n]));
    const mem = Object.fromEntries(d.memCh.map((r) => [r.ch, r.n]));
    const chRows = d.channels.map((r) => ({ ...r, name: chName(r.ch), engRate: r.ss ? r.eng / r.ss : 0, inq: inq[r.ch] || 0, mem: mem[r.ch] || 0, conv: r.uv ? (inq[r.ch] || 0) / r.uv : 0 }));
    const by = (ch) => d.sources.filter((r) => r.ch === ch).map((r) => ({ label: srcName(r.src), v: r.ss, meta: `방문자 ${fmt.n(r.uv)} · 참여율 ${fmt.pct(r.ss ? r.eng / r.ss : 0)}` }));
    el.innerHTML = `<div class="grid g-12">
        ${card('유입 채널 비중', segbar(d.channels.map((r) => ({ label: chName(r.ch), v: r.ss, color: CH_COLOR[r.ch] || '#c6cdd8', dark: CH_DARK[r.ch] }))), { sub: '방문 횟수' })}
        ${card('채널별 성과', '<div id="chtable"></div>', { desc: '상담 신청과 회원가입은 그 사람이 처음 들어온 경로로 셉니다.' })}
      </div>
      <div class="grid g-3 mt">
        ${card('검색엔진', bars(by('search')), { sub: '방문 횟수' })}
        ${card('SNS · 커뮤니티', bars(by('social')), { sub: '방문 횟수' })}
        ${card('다른 사이트', bars(by('referral')), { sub: '방문 횟수' })}
      </div>
      <div class="grid g-2 mt">
        ${card('첫 방문 페이지', bars(d.landing.map((r) => ({ label: pageName(r.path), v: r.ss, key: r.path, meta: `참여율 ${fmt.pct(r.ss ? r.eng / r.ss : 0)}` })), { click: 'path' }), { sub: '방문 횟수', desc: '검색이나 링크로 처음 도착한 페이지입니다. 참여율이 낮으면 그 페이지의 첫 화면을 손볼 차례입니다.' })}
        ${card('검색어', bars(d.terms.map((r) => ({ label: r.k, small: srcName(r.src), v: r.n }))), { sub: '확인된 것만', desc: '네이버·구글은 대부분 검색어를 넘겨주지 않아 일부만 보입니다. 전체 검색어는 네이버 서치어드바이저와 구글 서치콘솔에서 확인하세요.' })}
      </div>
      <div class="grid g-2 mt">
        ${card('캠페인 (UTM)', d.campaigns.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>캠페인</th><th>출처</th><th class="r">방문</th><th class="r">방문자</th></tr></thead><tbody>${d.campaigns.map((r) => `<tr><td>${esc(r.k)}</td><td>${esc(srcName(r.src))}</td><td class="r">${fmt.n(r.ss)}</td><td class="r">${fmt.n(r.uv)}</td></tr>`).join('')}</tbody></table></div>` : empty('캠페인 링크로 들어온 방문이 없습니다.', '<span class="small">오른쪽 도구로 링크를 만들어 블로그·SNS·문자에 쓰면 여기에 따로 집계됩니다.</span>'))}
        ${card('캠페인 링크 만들기', `<div class="grid" style="gap:10px">
          <div class="field"><label for="u-page">연결할 페이지</label><select id="u-page">${Object.entries(PAGE).filter(([k]) => !k.startsWith('/member')).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></div>
          <div class="grid g-2" style="gap:10px"><div class="field"><label for="u-src">출처 (utm_source)</label><input id="u-src" placeholder="예: naver-blog, kakao, instagram"></div>
          <div class="field"><label for="u-med">종류 (utm_medium)</label><select id="u-med"><option value="social">SNS 게시물</option><option value="blog">블로그 글</option><option value="message">문자 · 카톡 메시지</option><option value="email">이메일</option><option value="qr">QR 코드 · 인쇄물</option><option value="cpc">유료 광고</option></select></div></div>
          <div class="field"><label for="u-camp">캠페인 이름 (utm_campaign)</label><input id="u-camp" placeholder="예: 2026-12-fm-promo"></div>
          <div class="field"><label for="u-out">만들어진 링크</label><input id="u-out" readonly></div>
          <div><button class="btn btn-primary" type="button" id="u-copy">링크 복사</button></div></div>`, { desc: '같은 게시물이라도 이 링크를 쓰면 어느 글에서 몇 명이 들어왔는지 따로 볼 수 있습니다.' })}
      </div>`;
    sortableTable($('#chtable'), [
      { key: 'name', name: '채널', sort: true },
      { key: 'ss', name: '방문', r: true, sort: true, fmt: fmt.n },
      { key: 'uv', name: '방문자', r: true, sort: true, fmt: fmt.n },
      { key: 'engRate', name: '참여율', r: true, sort: true, fmt: fmt.pct, help: '2페이지 이상 봤거나 10초 넘게 머문 방문의 비율' },
      { key: 'dur', name: '평균 체류', r: true, sort: true, fmt: fmt.dur },
      { key: 'inq', name: '상담', r: true, sort: true, fmt: fmt.n },
      { key: 'conv', name: '전환율', r: true, sort: true, fmt: fmt.pct, help: '방문자 대비 상담 신청 비율' },
      { key: 'mem', name: '가입', r: true, sort: true, fmt: fmt.n },
    ], chRows, { sortKey: 'ss' });
    const build = () => {
      const base = location.origin + ($('#u-page').value === '/' ? '/' : $('#u-page').value);
      const qs = new URLSearchParams();
      const s = $('#u-src').value.trim(), m = $('#u-med').value, c = $('#u-camp').value.trim();
      if (s) { qs.set('utm_source', s); qs.set('utm_medium', m); if (c) qs.set('utm_campaign', c); }
      $('#u-out').value = base + (s ? '?' + qs.toString() : '');
    };
    ['u-page', 'u-src', 'u-med', 'u-camp'].forEach((id) => $('#' + id).addEventListener('input', build));
    build();
    $('#u-copy').addEventListener('click', async () => {
      if (!$('#u-src').value.trim()) { toast('출처를 먼저 적어 주세요.'); $('#u-src').focus(); return; }
      try { await navigator.clipboard.writeText($('#u-out').value); toast('링크를 복사했습니다.'); } catch (e) { $('#u-out').select(); toast('링크를 선택했습니다. Ctrl+C로 복사하세요.'); }
    });
    $$('[data-path]', el).forEach((b) => b.addEventListener('click', () => pageDrawer(b.dataset.path)));
  };

  /* =========================================================== VIEW: actions */
  VIEWS.actions = async (el) => {
    const d = await api('actions?' + rangeQS());
    const c = d.cur, p = d.prev, e = c.events, pe = p.events;
    const lab = days(state.from, state.to);
    const byType = (t) => lab.map((day) => (d.daily.find((r) => r.day === day && r.type === t) || {}).n || 0);
    const formRate = (x) => (x.events.form_start ? x.inquiries / (x.events.form_start || 1) : null);
    el.innerHTML = `<div class="kpis">
        ${kpi({ k: '상담 버튼 클릭', v: fmt.n(e.cta), unit: '회', d: delta(e.cta || 0, pe.cta || 0), help: '상담 신청 페이지로 가는 버튼·링크를 누른 횟수입니다.' })}
        ${kpi({ k: '전화 걸기', v: fmt.n(e.tel), unit: '회', d: delta(e.tel || 0, pe.tel || 0), help: '전화번호를 눌러 전화를 건 횟수입니다(주로 휴대폰).' })}
        ${kpi({ k: '이메일 · 지도', v: fmt.n((e.mail || 0) + (e.map || 0)), unit: '회', d: delta((e.mail || 0) + (e.map || 0), (pe.mail || 0) + (pe.map || 0)), sub: `이메일 ${fmt.n(e.mail || 0)} · 지도 ${fmt.n(e.map || 0)}` })}
        ${kpi({ k: '자가진단 완료', v: fmt.n(e.check), unit: '회', d: delta(e.check || 0, pe.check || 0), help: '홈 화면 자가진단에서 세 질문에 모두 답해 추천 결과를 받은 횟수입니다.' })}
        ${kpi({ k: '폼 작성 시작', v: fmt.n(c.events.form_start), unit: '회', d: delta(e.form_start || 0, pe.form_start || 0), help: '상담 폼 입력 칸을 처음 누른 횟수입니다.' })}
        ${kpi({ k: '상담 신청', v: fmt.n(c.inquiries), unit: '건', d: delta(c.inquiries, p.inquiries), goal: true })}
        ${kpi({ k: '폼 완료율', v: fmt.pct(formRate(c)), d: delta(formRate(c), formRate(p), true, true), help: '폼 작성을 시작한 것 대비 실제로 접수된 비율입니다. 낮으면 입력 칸이 많거나 어려운지 살펴보세요.', goal: true })}
        ${kpi({ k: '전체 클릭', v: fmt.n(c.clicks), unit: '회', d: delta(c.clicks, p.clicks) })}
      </div>
      <div class="grid g-2 mt">
        ${card('상담까지 가는 길', funnel(d.funnel), { sub: '방문자 기준', desc: '각 단계에서 다음 단계로 얼마나 넘어가는지 봅니다. 크게 줄어드는 구간이 가장 먼저 고칠 곳입니다.' })}
        ${card('날짜별 상담 행동', `<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--s1)"></i>상담 버튼 클릭</span><span><i style="background:var(--s2)"></i>전화 걸기</span><span><i style="background:var(--point)"></i>상담 신청</span></div><div class="chart" id="ac-chart"></div>`)}
      </div>
      <div class="grid g-12 mt">
        ${card('누른 위치', segbar(d.areas.map((r, i) => ({ label: AREA[r.k] || r.k, v: r.n, color: ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'][i] || '#c6cdd8', dark: i === 3 }))), { sub: '클릭 수', desc: '모바일 하단 바의 비중이 크면 휴대폰 방문자가 상담 버튼을 그 자리에서 찾는다는 뜻입니다.' })}
        ${card('페이지별 연락 행동', '<div id="bptable"></div>', { desc: '상담 버튼, 전화, 이메일, 지도를 어느 페이지에서 많이 눌렀는지 봅니다.' })}
      </div>
      <div class="grid mt">${card('많이 누른 항목', '<div id="toptable"></div>', { sub: '버튼 · 링크, 상위 25개' })}</div>`;
    lineChart($('#ac-chart'), { labels: lab, xFmt: fmt.md, tipFmt: fmt.ymd, height: 230, series: [
      { name: '상담 버튼 클릭', values: byType('cta'), color: 'var(--s1)' },
      { name: '전화 걸기', values: byType('tel'), color: 'var(--s2)' },
      { name: '상담 신청', values: seriesFrom(d.dinq, 'day', 'n', lab), color: 'var(--point)' },
    ] });
    sortableTable($('#toptable'), [
      { key: 'label', name: '항목', sort: true, html: (r) => `<span class="pt">${esc(r.label || '(이름 없음)')}</span><span class="pp">${esc(r.target || '')}</span>` },
      { key: 'typeName', name: '종류', sort: true },
      { key: 'areaName', name: '위치', sort: true },
      { key: 'n', name: '클릭', r: true, sort: true, fmt: fmt.n },
      { key: 'v', name: '누른 사람', r: true, sort: true, fmt: fmt.n },
    ], d.top.slice(0, 25).map((r) => ({ ...r, typeName: EV[r.type] || r.type, areaName: AREA[r.area] || r.area || '본문' })), { sortKey: 'n' });
    sortableTable($('#bptable'), [
      { key: 'name', name: '페이지', sort: true },
      { key: 'cta', name: '상담 버튼', r: true, sort: true, fmt: fmt.n },
      { key: 'tel', name: '전화', r: true, sort: true, fmt: fmt.n },
      { key: 'mail', name: '이메일', r: true, sort: true, fmt: fmt.n },
      { key: 'map', name: '지도', r: true, sort: true, fmt: fmt.n },
      { key: 'n', name: '전체 클릭', r: true, sort: true, fmt: fmt.n },
    ], d.byPage.slice(0, 10).map((r) => ({ ...r, name: pageName(r.path) })), { sortKey: 'cta' });
    bindFloatTips(el);
  };

  /* =========================================================== VIEW: leads */
  let leadFilter = { status: '', q: '', page: 1 };
  VIEWS.leads = async (el, id) => {
    tools(exportBtn('leads', '기간 내 상담 CSV'));
    const [s, list] = await Promise.all([api('leads-summary?' + rangeQS()), api(`leads?status=${leadFilter.status}&q=${encodeURIComponent(leadFilter.q)}&page=${leadFilter.page}`)]);
    const cnt = Object.fromEntries(list.counts.map((r) => [r.k, r.n]));
    const all = list.counts.reduce((a, r) => a + r.n, 0);
    el.innerHTML = `<div class="kpis">
        ${kpi({ k: '기간 내 상담 신청', v: fmt.n(s.cur.n), unit: '건', d: delta(s.cur.n || 0, s.prev.n || 0), goal: true })}
        ${kpi({ k: '아직 연락 안 한 상담', v: fmt.n(cnt.new || 0), unit: '건', help: '상태가 「신규 접수」인 상담입니다. 상태를 바꾸면 첫 연락 시각이 기록됩니다.', sub: '전체 기간' })}
        ${kpi({ k: '첫 연락까지 평균', v: fmt.hours(s.cur.resp), d: s.cur.resp && s.prev.resp ? delta(s.cur.resp, s.prev.resp, false) : '', help: '접수부터 상태를 「신규 접수」에서 다른 상태로 처음 바꾼 때까지 걸린 평균 시간입니다. 빠를수록 계약 가능성이 높아집니다.' })}
        ${kpi({ k: '계약 전환', v: fmt.n(s.cur.won || 0), unit: '건', sub: s.cur.n ? `기간 내 신청의 ${fmt.pct((s.cur.won || 0) / s.cur.n)}` : '', help: '기간 안에 들어온 상담 중 상태가 「계약」인 건입니다.' })}
      </div>
      <section class="card mt"><div class="card-head"><h2>상담 목록 <span class="sub" style="font-weight:500">전체 기간 · 최신순</span></h2><form class="search" id="lq"><input type="search" name="q" value="${esc(leadFilter.q)}" placeholder="이름, 연락처, 위치, 내용으로 찾기" aria-label="상담 검색"><button class="btn" type="submit">찾기</button></form></div>
        <div class="tabs-status" role="group" aria-label="상태 필터"><button type="button" data-s="" aria-pressed="${!leadFilter.status}">전체<b>${all}</b></button>${Object.keys(ST).map((k) => `<button type="button" data-s="${k}" aria-pressed="${leadFilter.status === k}">${ST[k]}<b>${cnt[k] || 0}</b></button>`).join('')}</div>
        ${list.rows.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>접수</th><th>이름 · 회사</th><th>연락처</th><th>고객 유형 · 공간</th><th>유입</th><th>상태</th></tr></thead><tbody>
          ${list.rows.map((r) => `<tr class="row" data-id="${r.id}" tabindex="0"><td class="num" style="white-space:nowrap">${fmt.dt(r.created_at)}</td><td><span class="pt">${esc(r.name)}</span>${r.member_id ? '<span class="pp">회원</span>' : ''}</td><td class="num" style="white-space:nowrap">${esc(r.phone)}</td><td><span class="pt">${esc(r.who || '–')}</span><span class="pp">${esc(r.space || '')}</span></td><td>${esc(srcName(r.source))}</td><td>${chip(r.status)}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="pager"><span>${fmt.n(list.total)}건 중 ${(list.page - 1) * 30 + 1}–${Math.min(list.total, list.page * 30)}</span><span class="btns"><button class="btn" type="button" id="lp" ${list.page <= 1 ? 'disabled' : ''}>이전</button><button class="btn" type="button" id="ln" ${list.page * 30 >= list.total ? 'disabled' : ''}>다음</button></span></div>`
          : empty(leadFilter.status || leadFilter.q ? '조건에 맞는 상담이 없습니다.' : '아직 들어온 상담이 없습니다.', '<span class="small">홈페이지 상담 폼으로 접수되면 여기에 바로 나타납니다.</span>')}
      </section>
      <div class="grid g-3 mt">
        ${card('고객 유형', bars(s.who.map((r) => ({ label: r.k || '선택 안 함', v: r.n })), { color: 'var(--s3)' }), { sub: '기간 내' })}
        ${card('공간 유형', bars(s.space.map((r) => ({ label: r.k || '선택 안 함', v: r.n })), { color: 'var(--s3)' }), { sub: '기간 내' })}
        ${card('처음 들어온 경로', bars(s.ch.map((r) => ({ label: chName(r.k), v: r.n })), { color: 'var(--s3)' }), { sub: '기간 내' })}
      </div>`;
    $$('.tabs-status button', el).forEach((b) => b.addEventListener('click', () => { leadFilter = { ...leadFilter, status: b.dataset.s, page: 1 }; route(); }));
    $('#lq').addEventListener('submit', (e) => { e.preventDefault(); leadFilter = { ...leadFilter, q: e.target.q.value.trim(), page: 1 }; route(); });
    const lp = $('#lp'), ln = $('#ln');
    if (lp) lp.addEventListener('click', () => { leadFilter.page--; route(); });
    if (ln) ln.addEventListener('click', () => { leadFilter.page++; route(); });
    $$('tr.row', el).forEach((tr) => {
      const open = () => { history.replaceState(null, '', '#leads/' + tr.dataset.id); leadDrawer(tr.dataset.id); };
      tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
    bindFloatTips(el);
    if (id) leadDrawer(id);
  };

  function leadDrawer(id) {
    drawer('상담 상세', '<p class="muted">불러오는 중…</p>', async (pb, close) => {
      let d;
      try { d = await api('lead?id=' + encodeURIComponent(id)); } catch (e) { pb.innerHTML = empty('상담을 찾을 수 없습니다.'); return; }
      const L = d.lead;
      const tel = String(L.phone || '').replace(/[^0-9+]/g, '');
      pb.innerHTML = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">${chip(L.status)}<span class="small muted">접수 ${fmt.dt(L.created_at)}${L.first_contact_at ? ' · 첫 연락 ' + fmt.dt(L.first_contact_at) : ''}</span></div>
        <dl class="dl">
          <dt>이름 · 회사</dt><dd>${esc(L.name)}${d.member ? ` <span class="chip ok"><i></i>회원</span>` : ''}</dd>
          <dt>연락처</dt><dd><a href="tel:${esc(tel)}" style="text-decoration:underline">${esc(L.phone)}</a></dd>
          <dt>이메일</dt><dd>${L.email ? `<a href="mailto:${esc(L.email)}" style="text-decoration:underline">${esc(L.email)}</a>` : '–'}</dd>
          <dt>고객 유형</dt><dd>${esc(L.who || '–')}</dd>
          <dt>건물 위치</dt><dd>${esc(L.location || '–')}</dd>
          <dt>공간 유형</dt><dd>${esc(L.space || '–')}</dd>
          <dt>면적 · 공실</dt><dd>${esc(L.size || '–')}</dd>
          <dt>처음 들어온 경로</dt><dd>${L.channel ? esc(chName(L.channel) + ' · ' + srcName(L.source)) : '–'}${L.landing ? ` <span class="muted">(첫 페이지: ${esc(pageName(L.landing))})</span>` : ''}</dd>
          <dt>메일 알림</dt><dd>${L.mailed ? '담당자에게 메일 발송됨' : '메일 발송 안 됨 (메일 설정 전이거나 실패)'}</dd>
        </dl>
        <div class="sec-t">문의 내용</div><div class="msgbox">${esc(L.message || '(내용 없음)')}</div>
        <form id="lf" class="grid" style="gap:12px">
          <div class="field"><label for="ls">진행 상태</label><select id="ls">${Object.keys(ST).map((k) => `<option value="${k}" ${L.status === k ? 'selected' : ''}>${ST[k]}</option>`).join('')}</select></div>
          <div class="field"><label for="lm">내부 메모 <span class="muted" style="font-weight:500">(고객에게 보이지 않습니다)</span></label><textarea id="lm" placeholder="통화 내용, 현장 방문 일정, 견적 금액 등">${esc(L.memo || '')}</textarea></div>
          <div class="actions-row"><button class="btn btn-primary" type="submit">저장</button><button class="btn btn-danger" type="button" id="ldel">삭제</button></div>
        </form>
        ${d.journey.length ? `<div class="sec-t">상담 전에 본 페이지 (${d.journey.length}개)</div><ol class="journey">${d.journey.map((j) => `<li class="${j.entry ? 'in' : ''}"><b>${esc(pageName(j.path, j.title))}</b> <span>${fmt.dt(j.ts)}${j.dur ? ' · ' + fmt.dur(j.dur) : ''}${j.entry ? ' · ' + esc(srcName(j.source)) + '에서 들어옴' : ''}</span></li>`).join('')}<li class="goal"><b>상담 신청</b> <span>${fmt.dt(L.created_at)}</span></li></ol>` : ''}`;
      $('#lf', pb).addEventListener('submit', async (e) => {
        e.preventDefault();
        await api('lead', { body: { id: L.id, status: $('#ls', pb).value, memo: $('#lm', pb).value } });
        toast('저장했습니다.'); close(); route();
      });
      $('#ldel', pb).addEventListener('click', async () => {
        if (!confirm('이 상담 기록을 삭제할까요? 되돌릴 수 없습니다.')) return;
        await api('lead-delete', { body: { id: L.id } });
        toast('삭제했습니다.'); close(); route();
      });
    });
  }

  /* =========================================================== VIEW: members */
  let memFilter = { q: '', who: '', status: '', page: 1 };
  const WHO = ['건물주 · 자산주', '건물주 (관리 위탁 희망)', '법인 유휴자산 담당자', '임차인 · 창업자', '숙박 · 리테일 운영자', '투자자', '관리회사 · 중개법인', '공공 · 지역기관', '기타'];
  VIEWS.members = async (el, id) => {
    tools(exportBtn('members', '회원 목록 CSV'));
    const [s, list] = await Promise.all([api('members-summary?' + rangeQS()), api(`members?q=${encodeURIComponent(memFilter.q)}&who=${encodeURIComponent(memFilter.who)}&status=${memFilter.status}&page=${memFilter.page}`)]);
    const lab = days(state.from, state.to);
    el.innerHTML = `<div class="kpis five">
        ${kpi({ k: '전체 회원', v: fmt.n(s.total), unit: '명', sub: `이용 정지 ${fmt.n(s.total - s.active)}명` })}
        ${kpi({ k: '기간 내 신규 가입', v: fmt.n(s.newCur), unit: '명', d: delta(s.newCur, s.newPrev), goal: true })}
        ${kpi({ k: '소식 수신 동의', v: fmt.pct(s.total ? s.marketing / s.total : null), sub: `${fmt.n(s.marketing)}명`, help: '인사이트 새 글과 법정점검 시기 안내를 받겠다고 동의한 회원의 비율입니다. 이 회원에게만 홍보성 연락을 할 수 있습니다.' })}
        ${kpi({ k: '최근 30일 로그인', v: fmt.n(s.recentLogin), unit: '명', help: '최근 30일 안에 로그인한 회원 수입니다.' })}
        ${kpi({ k: '상담을 신청한 회원', v: fmt.n(s.withInquiry), unit: '명', sub: s.total ? `회원의 ${fmt.pct(s.withInquiry / s.total)}` : '' })}
      </div>
      <div class="grid g-21 mt">
        ${card('날짜별 가입', '<div class="chart" id="mc"></div>', { sub: '가입자 수' })}
        ${card('가입 경로', bars(s.channel.map((r) => ({ label: chName(r.k), v: r.n })), { color: 'var(--s3)' }), { sub: '전체 회원, 처음 들어온 경로' })}
      </div>
      <div class="grid g-2 mt">
        ${card('고객 유형', bars(s.who.map((r) => ({ label: r.k || '선택 안 함', v: r.n })), { color: 'var(--s3)' }), { sub: '전체 회원' })}
        ${card('관심 분야', bars(s.interest.map((r) => ({ label: r.k, v: r.n })), { color: 'var(--s3)', total: s.total }), { sub: '전체 회원, 복수 선택' })}
      </div>
      <section class="card mt"><div class="card-head"><h2>회원 목록 <span class="sub" style="font-weight:500">전체 · 최근 가입순</span></h2>
        <form class="search" id="mq"><input type="search" name="q" value="${esc(memFilter.q)}" placeholder="이름, 이메일, 회사, 연락처" aria-label="회원 검색">
          <select name="who" aria-label="고객 유형"><option value="">고객 유형 전체</option>${WHO.map((w) => `<option ${memFilter.who === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select>
          <select name="status" aria-label="상태"><option value="">전체</option><option value="marketing" ${memFilter.status === 'marketing' ? 'selected' : ''}>소식 수신 동의</option><option value="blocked" ${memFilter.status === 'blocked' ? 'selected' : ''}>이용 정지</option></select>
          <button class="btn" type="submit">찾기</button></form></div>
        ${list.rows.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>가입일</th><th>이름 · 회사</th><th>이메일 · 연락처</th><th>고객 유형</th><th>소식 수신</th><th>최근 로그인</th><th class="r">상담</th></tr></thead><tbody>
          ${list.rows.map((r) => `<tr class="row" data-id="${r.id}" tabindex="0"><td class="num" style="white-space:nowrap">${fmt.dt(r.created_at).slice(0, 10)}</td><td><span class="pt">${esc(r.name)}${r.status === 'blocked' ? ' <span class="chip blocked">정지</span>' : ''}</span><span class="pp">${esc(r.company || '')}</span></td><td><span class="pt" style="font-weight:500">${esc(r.email)}</span><span class="pp">${esc(r.phone || '')}</span></td><td>${esc(r.who || '–')}</td><td>${r.marketing ? '<span class="chip ok"><i></i>동의</span>' : '<span class="muted small">미동의</span>'}</td><td class="num small" style="white-space:nowrap">${fmt.ago(r.last_login)}</td><td class="r">${r.inq || ''}</td></tr>`).join('')}
          </tbody></table></div>
          <div class="pager"><span>${fmt.n(list.total)}명 중 ${(list.page - 1) * 30 + 1}–${Math.min(list.total, list.page * 30)}</span><span class="btns"><button class="btn" type="button" id="mp" ${list.page <= 1 ? 'disabled' : ''}>이전</button><button class="btn" type="button" id="mn" ${list.page * 30 >= list.total ? 'disabled' : ''}>다음</button></span></div>`
          : empty(memFilter.q || memFilter.who || memFilter.status ? '조건에 맞는 회원이 없습니다.' : '아직 가입한 회원이 없습니다.', '<span class="small">홈페이지 상단의 「로그인」 → 회원가입으로 가입하면 여기에 나타납니다.</span>')}
      </section>`;
    lineChart($('#mc'), { labels: lab, xFmt: fmt.md, tipFmt: fmt.ymd, height: 200, series: [{ name: '신규 가입', values: seriesFrom(s.daily, 'day', 'n', lab), color: 'var(--point)', area: true, wash: 'rgba(23,163,95,.10)' }] });
    $('#mq').addEventListener('submit', (e) => { e.preventDefault(); memFilter = { q: e.target.q.value.trim(), who: e.target.who.value, status: e.target.status.value, page: 1 }; route(); });
    const mp = $('#mp'), mn = $('#mn');
    if (mp) mp.addEventListener('click', () => { memFilter.page--; route(); });
    if (mn) mn.addEventListener('click', () => { memFilter.page++; route(); });
    $$('tr.row', el).forEach((tr) => {
      const open = () => { history.replaceState(null, '', '#members/' + tr.dataset.id); memberDrawer(tr.dataset.id); };
      tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
    bindFloatTips(el);
    if (id) memberDrawer(id);
  };

  function memberDrawer(id) {
    drawer('회원 정보', '<p class="muted">불러오는 중…</p>', async (pb, close) => {
      let d;
      try { d = await api('member?id=' + encodeURIComponent(id)); } catch (e) { pb.innerHTML = empty('회원을 찾을 수 없습니다.'); return; }
      const m = d.member;
      pb.innerHTML = `<dl class="dl">
          <dt>이름</dt><dd><b>${esc(m.name)}</b> ${m.status === 'blocked' ? '<span class="chip blocked">이용 정지</span>' : ''}</dd>
          <dt>이메일</dt><dd><a href="mailto:${esc(m.email)}" style="text-decoration:underline">${esc(m.email)}</a></dd>
          <dt>연락처</dt><dd>${esc(m.phone || '–')}</dd>
          <dt>회사 · 소속</dt><dd>${esc(m.company || '–')}</dd>
          <dt>고객 유형</dt><dd>${esc(m.who || '–')}</dd>
          <dt>관심 분야</dt><dd>${esc((m.interest || '').split(',').filter(Boolean).join(', ') || '–')}</dd>
          <dt>건물 위치</dt><dd>${esc(m.location || '–')}</dd>
          <dt>소식 수신</dt><dd>${m.marketing ? '동의' : '미동의'}</dd>
          <dt>가입</dt><dd>${fmt.dt(m.created_at)} · ${esc(chName(m.channel))}${m.source && m.source !== 'direct' ? ' · ' + esc(srcName(m.source)) : ''}</dd>
          <dt>로그인</dt><dd>최근 ${fmt.dt(m.last_login)} · 총 ${fmt.n(m.login_count)}회</dd>
          <dt>방문</dt><dd>${fmt.n(d.visits.ss)}번 방문, ${fmt.n(d.visits.pv)}페이지</dd>
        </dl>
        ${d.inquiries.length ? `<div class="sec-t">상담 신청 (${d.inquiries.length}건)</div><ul class="list">${d.inquiries.map((r) => `<li><div class="who"><b><a href="#leads/${r.id}">${esc(r.space || '상담')}</a></b><span>${fmt.dt(r.created_at)}</span></div>${chip(r.status)}</li>`).join('')}</ul>` : ''}
        ${d.topPages.length ? `<div class="sec-t">많이 본 페이지</div>${bars(d.topPages.map((r) => ({ label: pageName(r.path, r.title), v: r.n })), { color: 'var(--s3)' })}` : ''}
        <form id="mf" class="grid" style="gap:12px;margin-top:18px">
          <div class="field"><label for="mm">내부 메모</label><textarea id="mm" placeholder="통화 내용, 관리 중인 건물 등">${esc(m.memo || '')}</textarea></div>
          <label class="switch"><input type="checkbox" id="mb" ${m.status === 'blocked' ? 'checked' : ''}> 이용 정지 (로그인 불가)</label>
          <div class="actions-row"><button class="btn btn-primary" type="submit">저장</button><button class="btn btn-danger" type="button" id="mdel">회원 삭제</button></div>
        </form>`;
      $('#mf', pb).addEventListener('submit', async (e) => {
        e.preventDefault();
        await api('member', { body: { id: m.id, memo: $('#mm', pb).value, status: $('#mb', pb).checked ? 'blocked' : 'active' } });
        toast('저장했습니다.'); close(); route();
      });
      $('#mdel', pb).addEventListener('click', async () => {
        if (!confirm(`${m.name}님의 회원 정보를 삭제할까요? 상담 기록은 남고 회원 연결만 끊깁니다. 되돌릴 수 없습니다.`)) return;
        await api('member-delete', { body: { id: m.id } });
        toast('삭제했습니다.'); close(); route();
      });
    });
  }

  /* =========================================================== VIEW: settings */
  VIEWS.settings = async (el) => {
    const st = await api('status');
    state.status = st;
    const notrack = store.get('gu_notrack') === '1';
    const item = (ok, t, s) => `<li><span class="ic ${ok ? 'ok' : 'no'}">${ok ? '✓' : '!'}</span><div><b>${t}</b><span>${s}</span></div></li>`;
    el.innerHTML = `<div class="grid g-2">
      ${card('설치 상태', `<ul class="checks">
        ${item(st.db, '데이터베이스(D1) 연결', st.db ? '방문 기록, 회원, 상담이 저장되고 있습니다.' : 'Settings → Bindings에서 변수 이름 DB로 D1을 연결해야 합니다.')}
        ${item(st.configured, '관리자 비밀번호', '환경변수 ADMIN_PASSWORD. 바꾸면 모든 관리자 로그인이 끊기고 새 비밀번호로 다시 들어옵니다.')}
        ${item(st.mail, '상담 접수 메일 알림', st.mail ? '상담이 들어오면 담당자 메일로도 알려 줍니다.' : 'RESEND_API_KEY, CONTACT_TO를 넣으면 상담 접수 메일과 회원 비밀번호 찾기 메일이 동작합니다. 없어도 상담은 이 화면에 쌓입니다.')}
        ${item(!!st.lastHit, '방문 기록 수집', st.lastHit ? `마지막 기록 ${fmt.dt(st.lastHit)} (${fmt.ago(st.lastHit)})` : '아직 기록이 없습니다. 다른 브라우저로 홈페이지를 열어 확인해 보세요.')}
      </ul>`)}
      ${card('저장된 데이터', `<dl class="dl" style="grid-template-columns:140px 1fr">
          <dt>페이지 조회 기록</dt><dd class="num">${fmt.n(st.counts?.pageviews)}건${st.firstDay ? ` <span class="muted">(${fmt.ymd(st.firstDay)}부터)</span>` : ''}</dd>
          <dt>클릭 · 행동 기록</dt><dd class="num">${fmt.n(st.counts?.events)}건</dd>
          <dt>회원</dt><dd class="num">${fmt.n(st.counts?.members)}명</dd>
          <dt>상담 문의</dt><dd class="num">${fmt.n(st.counts?.inquiries)}건</dd></dl>
        <div class="sec-t">오래된 방문 기록 정리</div>
        <p class="small muted" style="margin-bottom:10px">Cloudflare D1 무료 용량(5GB)은 이 규모의 홈페이지라면 몇 년을 써도 넉넉합니다. 그래도 정리하고 싶을 때만 쓰세요. 회원과 상담 기록은 지워지지 않습니다.</p>
        <div class="search"><select id="pd" aria-label="보관 기간"><option value="365">1년보다 오래된 기록</option><option value="730">2년보다 오래된 기록</option><option value="180">6개월보다 오래된 기록</option></select><button class="btn btn-danger" type="button" id="purge">삭제</button></div>`)}
    </div>
    <div class="grid g-2 mt">
      ${card('이 브라우저 방문 제외', `<p class="small muted" style="margin-bottom:12px">관리자로 로그인해 있는 동안의 방문은 자동으로 빠집니다. 로그아웃한 뒤에도 이 브라우저(예: 회사 PC)의 방문을 통계에서 빼려면 켜 두세요.</p>
        <label class="switch"><input type="checkbox" id="nt" ${notrack ? 'checked' : ''}> 이 브라우저의 방문을 기록하지 않음</label>`)}
      ${card('바로가기', `<ul class="list">
        <li><div class="who"><b><a href="../index.html" target="_blank" rel="noopener">홈페이지</a></b><span>새 탭에서 열기</span></div></li>
        <li><div class="who"><b><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare 대시보드</a></b><span>배포, 환경변수, D1 데이터베이스</span></div></li>
        <li><div class="who"><b><a href="https://searchadvisor.naver.com/" target="_blank" rel="noopener">네이버 서치어드바이저</a></b><span>네이버 검색 노출 · 검색어</span></div></li>
        <li><div class="who"><b><a href="https://search.google.com/search-console" target="_blank" rel="noopener">구글 서치콘솔</a></b><span>구글 검색 노출 · 검색어</span></div></li></ul>`)}
    </div>
    <div class="grid mt">${card('지표 설명', `<dl class="gloss">
      <dt>방문자</dt><dd>기간 동안 사이트를 연 사람 수. 브라우저에 저장한 무작위 번호로 구분하므로, 같은 사람이 PC와 휴대폰으로 오면 두 명으로 셉니다.</dd>
      <dt>방문 횟수</dt><dd>들어와서 나갈 때까지를 한 번으로 셉니다. 30분 넘게 아무것도 하지 않다가 다시 보면 새 방문입니다.</dd>
      <dt>페이지뷰</dt><dd>페이지가 열린 총횟수.</dd>
      <dt>체류시간</dt><dd>화면이 실제로 보이고 있던 시간. 다른 탭을 보거나 2분 넘게 움직임이 없으면 세지 않습니다.</dd>
      <dt>참여율 · 이탈률</dt><dd>2페이지 이상 봤거나 10초 넘게 머문 방문이 「참여한 방문」입니다. 이탈률은 그 반대(한 페이지만 보고 10초 안에 나감)입니다.</dd>
      <dt>완독률</dt><dd>페이지 길이의 75% 이상까지 내려 본 비율. 인사이트 글처럼 긴 페이지의 읽힘 정도를 봅니다.</dd>
      <dt>상담 연결</dt><dd>그 페이지를 본 방문자 중 같은 기간에 상담을 신청한 사람 수. 어떤 정보가 상담으로 이어지는지 봅니다.</dd>
      <dt>전환율</dt><dd>방문자 대비 상담 신청 비율.</dd>
      <dt>유입 경로</dt><dd>방문을 시작한 곳. 검색(네이버·구글 등), SNS·커뮤니티(카카오톡·블로그·인스타그램 등), 다른 사이트, 캠페인(UTM 링크), 직접 방문(주소 입력·즐겨찾기)으로 나눕니다.</dd>
      <dt>첫 연락까지</dt><dd>상담 접수부터 관리자가 상태를 처음 바꾼 때까지의 시간. 빠른 응대는 계약률과 직결됩니다.</dd>
      <dt>개인정보</dt><dd>방문 통계에는 IP 주소, 이름, 연락처를 저장하지 않습니다. 회원·상담 정보는 개인정보처리방침의 보관 기간에 따라 관리해 주세요.</dd>
    </dl>`)}</div>`;
    $('#nt').addEventListener('change', (e) => { if (e.target.checked) store.set('gu_notrack', '1'); else store.del('gu_notrack'); toast(e.target.checked ? '이 브라우저의 방문을 기록하지 않습니다.' : '이 브라우저의 방문도 기록합니다.'); });
    $('#purge').addEventListener('click', async () => {
      const days = $('#pd').value;
      if (!confirm(`${$('#pd').selectedOptions[0].text}을 삭제할까요? 되돌릴 수 없습니다.`)) return;
      const r = await api('purge', { body: { days } });
      toast(`페이지 기록 ${fmt.n(r.deleted.pageviews)}건, 행동 기록 ${fmt.n(r.deleted.events)}건을 삭제했습니다.`);
      route();
    });
  };

  /* =========================================================== boot */
  window.addEventListener('hashchange', () => { if ($('#content')) route(); });
  (async function boot() {
    try { state.status = await api('status'); } catch (e) { state.status = { configured: false, db: false }; }
    if (state.status.authed) shell(); else gate();
  })();
})();
