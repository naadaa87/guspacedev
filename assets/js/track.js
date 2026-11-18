/* 지유공간개발 방문 통계 수집 (자체 서버 /api/t 로만 전송, 외부 분석 도구 없음)
   - 방문자 구분: 브라우저에 저장하는 무작위 번호(이름·연락처 등 개인정보와 연결하지 않음)
   - 수집 항목: 본 페이지, 들어온 경로, 머문 시간, 스크롤 깊이, 버튼·링크 클릭
   - 관리자 화면 > 설정에서 "이 브라우저 방문 제외"를 켜면 이 브라우저의 방문은 기록하지 않습니다. */
(function () {
  'use strict';
  var EP = '/api/t';
  var ls;
  try { ls = window.localStorage; ls.setItem('gu_t', '1'); } catch (e) { ls = null; }
  function get(k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v) { try { if (ls) ls.setItem(k, v); } catch (e) { /* */ } }
  if (get('gu_notrack') === '1') { window.guTrack = function () {}; return; }

  function rid() {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function send(items) {
    var body = JSON.stringify(items);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) { /* fall through */ }
    try { fetch(EP, { method: 'POST', body: body, keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'text/plain' } }); } catch (e) { /* */ }
  }

  var now = Date.now();
  var IDLE = 30 * 60 * 1000;
  var vid = get('gu_vid'), nv = 0;
  if (!vid) { vid = rid(); set('gu_vid', vid); nv = 1; }
  var sid = get('gu_sid'), ns = 0;
  if (!sid || now - (+get('gu_last') || 0) > IDLE) { sid = rid(); set('gu_sid', sid); ns = 1; }
  set('gu_last', String(now));
  var pid = rid();
  window.GU_IDS = { vid: vid, sid: sid };

  var qs;
  try { qs = new URLSearchParams(location.search); } catch (e) { qs = { get: function () { return null; } }; }
  send([{
    k: 'pv', pid: pid, vid: vid, sid: sid, nv: nv, ns: ns,
    p: location.pathname, t: document.title, r: document.referrer,
    us: qs.get('utm_source'), um: qs.get('utm_medium'), uc: qs.get('utm_campaign'), ut: qs.get('utm_term')
  }]);

  /* ---------- 머문 시간 (화면이 보이고, 2분 안에 움직임이 있었던 시간만) ---------- */
  var active = 0, lastAct = Date.now(), startT = document.visibilityState === 'visible' ? Date.now() : 0, maxScroll = 0, sentD = -1, sentS = -1;
  var MAX_IDLE = 2 * 60 * 1000;
  function tick() {
    var n = Date.now();
    if (startT) {
      var end = Math.min(n, lastAct + MAX_IDLE);
      if (end > startT) active += end - startT;
      startT = n;
    }
  }
  function scrollPct() {
    var h = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var y = (window.pageYOffset || document.documentElement.scrollTop) + window.innerHeight;
    return h > 0 ? Math.min(100, Math.round((y / h) * 100)) : 100;
  }
  function endItem() {
    tick();
    var d = Math.round(active);
    if (d === sentD && maxScroll === sentS) return null;
    sentD = d; sentS = maxScroll;
    set('gu_last', String(Date.now()));
    return { k: 'end', pid: pid, d: d, s: maxScroll };
  }
  function flush() { var it = endItem(); if (it) send([it]); }
  // 페이지를 닫을 때 보내는 기록이 브라우저 사정으로 빠지는 경우를 대비해, 보고 있는 동안 30초마다 바뀐 값만 보냅니다.
  setInterval(function () { if (document.visibilityState === 'visible') flush(); }, 30000);
  function act() { tick(); lastAct = Date.now(); if (!startT && document.visibilityState === 'visible') startT = lastAct; }
  ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove'].forEach(function (ev) {
    window.addEventListener(ev, act, { passive: true });
  });
  var rafPending = false;
  window.addEventListener('scroll', function () {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () { rafPending = false; maxScroll = Math.max(maxScroll, scrollPct()); act(); });
  }, { passive: true });
  window.addEventListener('load', function () { maxScroll = Math.max(maxScroll, scrollPct()); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { flush(); startT = 0; }
    else { startT = Date.now(); lastAct = startT; set('gu_last', String(startT)); }
  });
  window.addEventListener('pagehide', flush);

  /* ---------- 클릭 ---------- */
  var host = location.host;
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href], button, [data-track]') : null;
    if (!el) return;
    if (el.matches('.menu-btn, .drawer-close, .nav button[aria-haspopup], [data-no-track]')) return;
    if (el.tagName === 'BUTTON' && el.closest('form') && !el.hasAttribute('data-track')) return;
    var href = el.getAttribute('href') || '';
    var type = 'click';
    if (/^tel:/i.test(href)) type = 'tel';
    else if (/^mailto:/i.test(href)) type = 'mail';
    else if (el.hasAttribute('data-map-naver') || el.hasAttribute('data-map-kakao') || /map\.(naver|kakao)\.com/i.test(href)) type = 'map';
    else if (/^https?:/i.test(href) && el.host && el.host !== host) type = 'outbound';
    else if (/(^|\/)contact(\.html)?([#?]|$)/.test(href)) type = 'cta';
    else if (el.closest('.site-header, .drawer, .site-footer')) type = 'menu';
    var area = el.closest('.site-header, .drawer') ? 'menu' : el.closest('.site-footer') ? 'footer' : el.closest('.mobile-cta') ? 'mobile-bar' : 'body';
    var txt = el.cloneNode(true);
    Array.prototype.forEach.call(txt.querySelectorAll('small, svg'), function (n) { n.parentNode.removeChild(n); });
    var label = (el.getAttribute('data-track') || el.getAttribute('aria-label') || txt.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    var items = [{ k: 'ev', pid: pid, vid: vid, sid: sid, p: location.pathname, e: type, l: label, h: href.slice(0, 200), a: area }];
    // 사이트 안의 다른 페이지로 넘어가는 링크면, 이 페이지에 머문 시간도 함께 보냅니다.
    if (el.tagName === 'A' && href && href.charAt(0) !== '#' && el.host === host && el.target !== '_blank' && !e.defaultPrevented && !e.metaKey && !e.ctrlKey) {
      var end = endItem(); if (end) items.push(end);
    }
    send(items);
  }, true);

  /* ---------- 다른 스크립트가 부르는 행동 기록 (자가진단 결과, 상담 폼 작성 시작 등) ---------- */
  window.guTrack = function (type, label) {
    send([{ k: 'ev', pid: pid, vid: vid, sid: sid, p: location.pathname, e: type, l: String(label || '').slice(0, 80), a: 'body' }]);
  };
})();
