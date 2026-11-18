/* 지유공간개발 회원 페이지 (가입 · 로그인 · 마이페이지 · 비밀번호 재설정) */
(function () {
  'use strict';
  var API = '/api/member/';
  var ERR = {
    email: '이메일 주소를 다시 확인해 주세요.',
    password: '비밀번호는 8자 이상으로, 영문과 숫자를 함께 넣어 주세요.',
    name: '이름을 적어 주세요.',
    agree: '[필수] 항목에 동의해 주셔야 가입할 수 있습니다.',
    exists: '이미 가입된 이메일입니다. 로그인하시거나 비밀번호 찾기를 이용해 주세요.',
    'too-many': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    invalid: '이메일 또는 비밀번호가 맞지 않습니다.',
    blocked: '이용이 제한된 계정입니다. 상담문의 페이지의 연락처로 문의해 주세요.',
    token: '링크가 만료되었거나 올바르지 않습니다. 로그인 화면에서 비밀번호 찾기를 다시 해 주세요.',
    'mail-not-configured': '지금은 메일로 비밀번호를 찾을 수 없습니다. 상담문의 페이지의 전화나 이메일로 알려주시면 도와드리겠습니다.',
    'not-configured': '회원 기능을 준비하고 있습니다. 상담은 상담문의 페이지에서 바로 신청하실 수 있습니다.',
    auth: '로그인이 필요합니다.',
  };
  var STATUS = {
    new: ['접수됨', '담당자가 내용을 확인하고 있습니다.'],
    contacted: ['연락 드림', '남겨주신 연락처로 담당자가 연락드렸습니다.'],
    consulting: ['상담 진행 중', '현장 확인이나 자료 검토를 진행하고 있습니다.'],
    proposal: ['제안 · 견적 전달', '제안서나 견적을 보내드렸습니다.'],
    won: ['계약 완료', '계약이 체결되었습니다. 이후 일정은 담당자가 안내드립니다.'],
    hold: ['보류', '일정이나 조건 조율로 잠시 멈춰 있습니다.'],
    closed: ['상담 종료', '상담이 마무리되었습니다.'],
  };

  function call(action, body) {
    return fetch(API + action, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.ok === false) { var e = new Error(d.error || 'http-' + r.status); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function msg(form, text, err) {
    var m = form.querySelector('.msg');
    if (!m) return;
    m.textContent = text; m.classList.add('show'); m.classList.toggle('err', !!err);
    m.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function errText(e, fallback) { return ERR[e.message] || fallback || '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'; }
  function busy(form, on, label) {
    var b = form.querySelector('button[type="submit"]');
    if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = label || '처리 중…'; b.disabled = true; }
    else { b.textContent = b.dataset.label || b.textContent; b.disabled = false; }
  }
  function remember(m) { try { localStorage.setItem('gu_member', JSON.stringify({ name: m.name })); } catch (e) { /* */ } }
  function forget() { try { localStorage.removeItem('gu_member'); } catch (e) { /* */ } }
  function nextUrl(def) {
    var n = new URLSearchParams(location.search).get('next') || '';
    // 같은 사이트 안의 주소로만 이동합니다.
    if (/^(\/(?!\/)|[a-z0-9_-]+\.html)/i.test(n)) return n;
    return def;
  }
  function pwOk(p) { return p.length >= 8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p); }
  function ids() { return window.GU_IDS || {}; }

  /* ---------- 회원가입 ---------- */
  var join = document.querySelector('form[data-join]');
  if (join) {
    var all = join.querySelector('[data-agree-all]');
    var items = join.querySelectorAll('[data-agree]');
    all.addEventListener('change', function () { items.forEach(function (i) { i.checked = all.checked; }); });
    items.forEach(function (i) { i.addEventListener('change', function () { all.checked = Array.prototype.every.call(items, function (x) { return x.checked; }); }); });
    var pw = join.querySelector('#password'), pw2 = join.querySelector('#password2'), hint = join.querySelector('[data-pw-hint]');
    function checkPw() {
      if (!pw2.value) { hint.textContent = ''; return; }
      var same = pw.value === pw2.value;
      hint.textContent = same ? (pwOk(pw.value) ? '사용할 수 있는 비밀번호입니다.' : '8자 이상, 영문과 숫자를 함께 넣어 주세요.') : '비밀번호가 서로 다릅니다.';
      hint.classList.toggle('bad', !same || !pwOk(pw.value));
    }
    pw.addEventListener('input', checkPw); pw2.addEventListener('input', checkPw);
    join.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = join;
      if (f.website.value) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) { msg(f, ERR.email, true); f.email.focus(); return; }
      if (!pwOk(f.password.value)) { msg(f, ERR.password, true); f.password.focus(); return; }
      if (f.password.value !== f.password2.value) { msg(f, '비밀번호 확인이 맞지 않습니다.', true); f.password2.focus(); return; }
      if (!f.name.value.trim()) { msg(f, ERR.name, true); f.name.focus(); return; }
      if (!f.who.value) { msg(f, '어떤 입장이신지 골라 주세요.', true); f.who.focus(); return; }
      if (!f.age14.checked || !f.agree.checked) { msg(f, ERR.agree, true); return; }
      var interest = Array.prototype.map.call(f.querySelectorAll('[name="interest"]:checked'), function (i) { return i.value; });
      busy(f, true, '가입하는 중…');
      call('join', {
        email: f.email.value.trim(), password: f.password.value, name: f.name.value.trim(), company: f.company.value.trim(),
        phone: f.phone.value.trim(), who: f.who.value, interest: interest, agree: true, age14: true, marketing: f.marketing.checked,
        vid: ids().vid, sid: ids().sid,
      }).then(function (d) {
        remember(d.member);
        msg(f, d.member.name + '님, 가입이 완료되었습니다. 마이페이지로 이동합니다.');
        setTimeout(function () { location.href = nextUrl('mypage.html'); }, 900);
      }).catch(function (err) { busy(f, false); msg(f, errText(err), true); });
    });
  }

  /* ---------- 로그인 · 비밀번호 찾기 ---------- */
  var login = document.querySelector('form[data-login]');
  if (login) {
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!login.email.value.trim() || !login.password.value) { msg(login, '이메일과 비밀번호를 모두 적어 주세요.', true); return; }
      busy(login, true, '로그인 중…');
      call('login', { email: login.email.value.trim(), password: login.password.value, vid: ids().vid })
        .then(function (d) { remember(d.member); location.href = nextUrl('mypage.html'); })
        .catch(function (err) { busy(login, false); msg(login, errText(err), true); });
    });
    var tg = document.querySelector('[data-forgot-toggle]'), box = document.getElementById('forgot');
    if (tg && box) {
      var open = function () { box.hidden = false; var i = box.querySelector('input'); if (login.email.value) i.value = login.email.value; i.focus(); };
      tg.addEventListener('click', function (e) { e.preventDefault(); open(); });
      if (location.hash === '#forgot') open();
    }
    var forgot = document.querySelector('form[data-forgot]');
    if (forgot) forgot.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(forgot.email.value.trim())) { msg(forgot, ERR.email, true); return; }
      busy(forgot, true, '보내는 중…');
      call('forgot', { email: forgot.email.value.trim() })
        .then(function () { busy(forgot, false); msg(forgot, '가입된 이메일이라면 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.'); })
        .catch(function (err) { busy(forgot, false); msg(forgot, errText(err), true); });
    });
  }

  /* ---------- 비밀번호 재설정 ---------- */
  var reset = document.querySelector('form[data-reset]');
  if (reset) {
    var token = new URLSearchParams(location.search).get('token') || '';
    if (!/^[a-f0-9]{48}$/.test(token)) msg(reset, ERR.token, true);
    reset.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!pwOk(reset.password.value)) { msg(reset, ERR.password, true); return; }
      if (reset.password.value !== reset.password2.value) { msg(reset, '비밀번호 확인이 맞지 않습니다.', true); return; }
      busy(reset, true, '저장하는 중…');
      call('reset', { token: token, password: reset.password.value })
        .then(function () { reset.querySelector('button[type="submit"]').hidden = true; msg(reset, '새 비밀번호를 저장했습니다. 로그인해 주세요.'); setTimeout(function () { location.href = 'login.html'; }, 1500); })
        .catch(function (err) { busy(reset, false); msg(reset, errText(err), true); });
    });
  }

  /* ---------- 마이페이지 ---------- */
  var my = document.querySelector('[data-my]');
  if (my) {
    var profile = my.querySelector('form[data-my-profile]');
    var fmtDate = function (ms) { var d = new Date(ms + 9 * 3600000).toISOString(); return d.slice(0, 10).replace(/-/g, '.') + ' ' + d.slice(11, 16); };
    var fill = function (m) {
      document.querySelectorAll('[data-my-name]').forEach(function (el) { el.textContent = m.name; });
      my.querySelector('[data-my-email]').textContent = m.email;
      ['name', 'company', 'phone', 'location'].forEach(function (k) { profile[k].value = m[k] || ''; });
      profile.who.value = m.who || '';
      profile.querySelectorAll('[name="interest"]').forEach(function (i) { i.checked = (m.interest || []).indexOf(i.value) >= 0; });
      profile.marketing.checked = !!m.marketing;
    };
    call('me').then(function (d) {
      remember(d.member);
      fill(d.member);
      var list = my.querySelector('[data-my-inq]');
      if (!d.inquiries.length) {
        list.innerHTML = '<li><div><b>아직 신청한 상담이 없습니다.</b><div class="when">로그인한 상태로 상담을 신청하시면 여기에서 진행 상황을 확인하실 수 있습니다.</div></div></li>';
      } else {
        list.innerHTML = '';
        d.inquiries.forEach(function (q) {
          var st = STATUS[q.status] || [q.status, ''];
          var li = document.createElement('li');
          var left = document.createElement('div');
          var b = document.createElement('b'); b.textContent = q.space || '상담 신청';
          var when = document.createElement('div'); when.className = 'when';
          when.textContent = fmtDate(q.created_at) + ' 접수' + (q.location ? ' · ' + q.location : '');
          left.appendChild(b); left.appendChild(when);
          var right = document.createElement('div'); right.className = 'st';
          var badge = document.createElement('span'); badge.className = 'st-badge ' + q.status; badge.textContent = st[0];
          var desc = document.createElement('div'); desc.className = 'st-desc'; desc.textContent = st[1];
          right.appendChild(badge); right.appendChild(desc);
          li.appendChild(left); li.appendChild(right);
          list.appendChild(li);
        });
      }
      document.querySelector('[data-my-loading]').hidden = true;
      my.hidden = false;
    }).catch(function (err) {
      if (err.status === 401) { forget(); location.replace('login.html?next=mypage.html'); return; }
      document.querySelector('[data-my-loading]').textContent = errText(err);
    });

    profile.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!profile.name.value.trim()) { msg(profile, ERR.name, true); return; }
      busy(profile, true, '저장하는 중…');
      call('update', {
        name: profile.name.value.trim(), company: profile.company.value.trim(), phone: profile.phone.value.trim(), who: profile.who.value,
        location: profile.location.value.trim(), marketing: profile.marketing.checked,
        interest: Array.prototype.map.call(profile.querySelectorAll('[name="interest"]:checked'), function (i) { return i.value; }),
      }).then(function (d) { busy(profile, false); remember(d.member); fill(d.member); msg(profile, '회원 정보를 저장했습니다.'); })
        .catch(function (err) { busy(profile, false); msg(profile, errText(err), true); });
    });

    var pwf = my.querySelector('form[data-my-password]');
    pwf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!pwOk(pwf.next.value)) { msg(pwf, ERR.password, true); return; }
      if (pwf.next.value !== pwf.next2.value) { msg(pwf, '새 비밀번호 확인이 맞지 않습니다.', true); return; }
      busy(pwf, true, '바꾸는 중…');
      call('password', { current: pwf.current.value, next: pwf.next.value })
        .then(function () { busy(pwf, false); pwf.reset(); msg(pwf, '비밀번호를 바꿨습니다.'); })
        .catch(function (err) { busy(pwf, false); msg(pwf, err.message === 'invalid' ? '현재 비밀번호가 맞지 않습니다.' : errText(err), true); });
    });

    my.querySelector('[data-logout]').addEventListener('click', function () {
      call('logout', {}).catch(function () {}).then(function () { forget(); location.href = '../index.html'; });
    });

    var wd = my.querySelector('form[data-my-withdraw]');
    wd.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!wd.password.value) { msg(wd, '비밀번호를 적어 주세요.', true); return; }
      if (!window.confirm('정말 탈퇴하시겠습니까? 회원 정보는 바로 지워지고 되돌릴 수 없습니다.')) return;
      busy(wd, true, '처리하는 중…');
      call('withdraw', { password: wd.password.value })
        .then(function () { forget(); alert('탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.'); location.href = '../index.html'; })
        .catch(function (err) { busy(wd, false); msg(wd, err.message === 'invalid' ? '비밀번호가 맞지 않습니다.' : errText(err), true); });
    });
  }

  /* 이미 로그인한 회원이 가입·로그인 화면에 오면 마이페이지로 */
  var flagged = false;
  try { flagged = !!localStorage.getItem('gu_member'); } catch (e) { flagged = false; }
  if ((join || login) && flagged) {
    call('me').then(function () { location.replace(nextUrl('mypage.html')); }).catch(function () { forget(); });
  }
})();
