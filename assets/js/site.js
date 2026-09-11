/* 지유공간개발 site.js */
(function () {
  'use strict';

  /* ---------- site config fill (assets/js/site-config.js) ---------- */
  var cfg = window.GU_SITE || {};
  function fill(attr, value, isLink, prefix) {
    if (!value) return;
    document.querySelectorAll('[' + attr + ']').forEach(function (el) {
      el.textContent = value;
      if (isLink && el.tagName === 'A') el.setAttribute('href', prefix + value.replace(/[^0-9+@a-zA-Z.\-_]/g, ''));
    });
  }
  fill('data-site-phone', cfg.phone, true, 'tel:');
  fill('data-site-email', cfg.email, true, 'mailto:');
  fill('data-site-bizno', cfg.bizNo, false, '');
  if (cfg.phone) document.querySelectorAll('[data-site-tel]').forEach(function (a) { a.href = 'tel:' + cfg.phone.replace(/[^0-9+]/g, ''); a.hidden = false; });
  var mc = document.querySelector('[data-mobile-cta]');
  if (mc && /contact\.html$/.test(location.pathname)) mc.hidden = true;
  if (cfg.mapNaver) document.querySelectorAll('[data-map-naver]').forEach(function (a) { a.href = cfg.mapNaver; });
  if (cfg.mapKakao) document.querySelectorAll('[data-map-kakao]').forEach(function (a) { a.href = cfg.mapKakao; });

  /* ---------- desktop dropdown ---------- */
  document.querySelectorAll('.nav > li.has-sub').forEach(function (li) {
    var btn = li.querySelector('button');
    var closeTimer;
    function open() { clearTimeout(closeTimer); li.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    function close() { li.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', function () { closeTimer = setTimeout(close, 120); });
    btn.addEventListener('click', function () { li.classList.contains('open') ? close() : open(); });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

  /* ---------- mobile drawer ---------- */
  var drawer = document.querySelector('.drawer');
  var menuBtn = document.querySelector('.menu-btn');
  if (drawer && menuBtn) {
    var closeBtn = drawer.querySelector('.drawer-close');
    var bg = drawer.querySelector('.drawer-bg');
    function openD() { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; menuBtn.setAttribute('aria-expanded', 'true'); closeBtn.focus(); }
    function closeD() { drawer.classList.remove('open'); document.body.style.overflow = ''; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); }
    menuBtn.addEventListener('click', openD);
    closeBtn.addEventListener('click', closeD);
    bg.addEventListener('click', closeD);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) closeD(); });
  }

  /* ---------- self-check widget (home) ---------- */
  var check = document.querySelector('[data-check]');
  if (check) {
    var result = check.querySelector('.check-result');
    var R = {
      fm: { title: '시설관리(FM) 체계부터 세웁니다', body: '법정점검, 예방점검, 미화·보안·주차를 표준 절차로 운영하고 월간 보고를 시작합니다. 관리 과정에서 드러나는 공실과 수선 이슈는 다음 단계로 잇습니다.', link: 'business/fm.html', label: '시설관리 FM 보기', prod: 'M1 시설관리 FM → M3 공실·임차사 관리' },
      pm: { title: '자산관리(PM)로 건물을 숫자로 보이게 합니다', body: '임대차 일정, 관리비, 예산과 지출을 정리하고 임대율·수납률·NOI를 매달 보고합니다. 어디서 수익이 새는지가 보이면 공실과 임차사 관리, 개발 판단이 쉬워집니다.', link: 'business/pm.html', label: '자산관리 PM 보기', prod: 'M2 자산관리 PM → M3 공실·임차사 관리 → P1 진단' },
      leasing: { title: '공실관리 · 임차사관리부터 정리합니다', body: '층별 임대 조건과 만기 일정, 임차사 이슈를 한 표로 정리하고, 갱신 협의와 임대 마케팅을 정해진 순서로 진행합니다. 임대로 채워지지 않는 공간만 개발 대상으로 넘깁니다.', link: 'business/leasing.html', label: '공실관리 · 임차사관리 보기', prod: 'M3 공실·임차사 관리 → 필요 시 P1 진단 → P2 기획' },
      green: { title: '노후건물 개선(그린 밸류업)부터 봅니다', body: '외피·설비·조명·에너지 상태를 먼저 진단하고, 임대경쟁력과 운영비를 같이 개선하는 공사 순서를 잡습니다. 공실층 리뉴얼과 묶으면 한 번의 공사로 두 가지 효과를 얻습니다.', link: 'business/green.html', label: '노후건물 개선 보기', prod: 'P1 진단 → P3 PM → M1 시설관리 FM' },
      vu: { title: '공실 진단과 수익모델 설계로 자산가치를 올립니다', body: '임대가 안 되는 이유를 상권·입지·시설·층 구성에서 찾고, 어떤 업종과 임대 구조가 가장 남는지 숫자로 비교합니다. 개발 전후의 임대수익과 NOI로 자산가치 변화를 확인합니다.', link: 'business/value-up.html', label: '공실개발 · 자산가치 증대 보기', prod: 'P1 진단 → P2 기획 → P3 PM → P5 통합 밸류업' },
      ops: { title: '직접 운영형 공간으로 설계합니다', body: '장기 임차인을 기다리지 않고, 시간·일·프로젝트 단위로 수익을 내는 공간(회의·촬영·교육·팝업·무인)으로 구성합니다. 예약·결제·출입 시스템과 운영 매뉴얼까지 오픈 세팅을 맡습니다.', link: 'business/space-operation.html', label: '공간운영 · 수익화 보기', prod: 'P2 기획 → P4 오픈·운영 구축 → P6 수익쉐어' },
      ipm: { title: '공사비를 지키는 인테리어 PM으로 접근합니다', body: '견적을 비교하고 등록 시공사를 선정한 뒤 공정·품질·예산을 건물주 편에서 관리합니다. 공사비를 지유가 대신 받지 않고, 발주자가 시공사에 직접 지급하는 구조라 현금 흐름이 투명합니다.', link: 'business/interior-pm.html', label: '인테리어 · 디자인 PM 보기', prod: 'P3 PM → P4 오픈·운영 구축' }
    };
    function decide() {
      var s = (check.querySelector('input[name="q1"]:checked') || {}).value;
      var f = (check.querySelector('input[name="q2"]:checked') || {}).value;
      var w = (check.querySelector('input[name="q3"]:checked') || {}).value;
      if (!s || !f || !w) return;
      var key;
      if (s === 'manage') key = (w === 'lease' || w === 'value') ? 'pm' : 'fm';
      else if (s === 'tenant') key = (w === 'value') ? 'pm' : 'leasing';
      else if (s === 'old') key = (w === 'operate') ? 'ops' : 'green';
      else if (s === 'low') key = (w === 'lease') ? 'leasing' : (w === 'operate') ? 'ops' : (w === 'opex') ? 'pm' : 'vu';
      else key = (w === 'lease' || w === 'opex') ? 'leasing' : (w === 'operate') ? 'ops' : 'vu';
      if (key === 'vu' && f === 'ground' && w === 'operate') key = 'ops';
      var r = R[key];
      result.querySelector('.title').textContent = r.title;
      result.querySelector('.body').textContent = r.body;
      result.querySelector('.prod').textContent = '추천 상품 순서: ' + r.prod;
      var a = result.querySelector('.go');
      a.href = r.link; a.textContent = r.label;
      result.classList.add('show');
      result.setAttribute('tabindex', '-1');
      if (window.matchMedia('(max-width: 720px)').matches) result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    check.querySelectorAll('input[type="radio"]').forEach(function (i) { i.addEventListener('change', decide); });
    var reset = check.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      check.querySelectorAll('input[type="radio"]').forEach(function (i) { i.checked = false; });
      result.classList.remove('show');
    });
  }

  /* ---------- building diagram hover (space operation) ---------- */
  var bld = document.querySelector('[data-bld]');
  if (bld) {
    var floors = bld.querySelectorAll('[data-floor]');
    var rows = bld.querySelectorAll('.fl li');
    function hi(id) {
      floors.forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-floor') === id); });
      rows.forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-floor') === id); });
    }
    floors.forEach(function (g) { g.addEventListener('mouseenter', function () { hi(g.getAttribute('data-floor')); }); });
    rows.forEach(function (li) { li.addEventListener('mouseenter', function () { hi(li.getAttribute('data-floor')); }); });
    bld.addEventListener('mouseleave', function () { hi(null); });
  }

  /* ---------- contact form ---------- */
  var form = document.querySelector('form[data-contact]');
  if (form) {
    var msg = form.querySelector('.msg');
    var submit = form.querySelector('button[type="submit"]');
    function show(text, err) { msg.textContent = text; msg.classList.add('show'); msg.classList.toggle('err', !!err); msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    function mailtoFallback(data) {
      if (!cfg.email) return false;
      var lines = [];
      form.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), select, textarea').forEach(function (el) {
        if (el.name === 'website') return;
        var label = form.querySelector('label[for="' + el.id + '"]');
        lines.push((label ? label.textContent.replace(/\s*\(.*?\)\s*/g, '').trim() : el.name) + ': ' + (el.value || '-'));
      });
      var href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('[홈페이지 상담신청] ' + (data.get('name') || '')) + '&body=' + encodeURIComponent(lines.join('\n'));
      window.location.href = href;
      return true;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('[name="website"]').value) return; // honeypot
      if (!form.querySelector('[name="agree"]').checked) { show('개인정보 수집·이용에 동의해 주셔야 접수할 수 있습니다.', true); return; }
      var data = new FormData(form);
      var endpoint = cfg.formEndpoint || '/api/contact';
      submit.disabled = true; submit.textContent = '보내는 중…';
      var body = {};
      data.forEach(function (v, k) { if (k !== 'website') body[k] = v; });
      body.page = location.href;
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json ? r.json().catch(function(){return {};}) : {}; })
        .then(function () { form.reset(); show('상담 신청이 접수되었습니다. 내용을 확인한 뒤 남겨주신 연락처로 연락드리겠습니다.'); })
        .catch(function () {
          if (mailtoFallback(data)) { show('메일 앱이 열립니다. 내용을 확인하고 보내기를 눌러주시면 접수됩니다.'); }
          else { show('지금은 접수가 되지 않습니다. 잠시 후 다시 시도하시거나 전화로 문의해 주세요.', true); }
        })
        .finally(function () { submit.disabled = false; submit.textContent = '상담 신청 보내기'; });
    });
  }

  /* ---------- year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
