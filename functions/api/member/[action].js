/**
 * 회원 기능 — /api/member/{action}
 *   POST join      회원가입
 *   POST login     로그인
 *   POST logout    로그아웃
 *   GET  me        내 정보 + 내 상담 신청 내역
 *   POST update    내 정보 수정
 *   POST password  비밀번호 변경
 *   POST withdraw  회원 탈퇴 (개인정보 즉시 삭제)
 *   POST forgot    비밀번호 재설정 메일 요청 (Resend 설정 필요)
 *   POST reset     재설정 링크로 새 비밀번호 저장
 * 비밀번호는 PBKDF2(SHA-256, 10만 회)로 해시해 저장하고, 원문은 어디에도 남기지 않습니다.
 */
import {
  json, clean, kstParts, ensureSchema, hashPassword, safeEqual, signToken, memberSession, setCookie, MEMBER_COOKIE,
  clientKey, tooManyAttempts, recordAttempt, firstTouch, logEvent, sendMail, randomHex, sha256, escHtml, sameOrigin,
} from '../../_lib/core.js';

const DAY = 86400;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const ID = /^[a-f0-9]{8,40}$/;
const pwOk = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);

const publicMember = (m) => ({
  id: m.id, email: m.email, name: m.name, company: m.company, phone: m.phone, who: m.who,
  interest: m.interest ? m.interest.split(',') : [], location: m.location, marketing: !!m.marketing,
  created_at: m.created_at, last_login: m.last_login,
});

async function startSession(env, request, m, extraHeaders = {}) {
  const token = await signToken(env, 'member', { id: m.id, exp: Date.now() + 30 * DAY * 1000 });
  return json({ ok: true, member: publicMember(m) }, 200, { 'Set-Cookie': setCookie(MEMBER_COOKIE, token, 30 * DAY, request), ...extraHeaders });
}

async function currentMember(env, request) {
  const s = await memberSession(env, request);
  if (!s) return null;
  const m = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(s.id).first();
  if (!m || m.status !== 'active') return null;
  return m;
}

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  const action = String(params.action || '');
  if (!env.DB) return json({ ok: false, error: 'not-configured' }, 503);
  await ensureSchema(env);

  if (request.method === 'GET' && action === 'me') {
    const m = await currentMember(env, request);
    if (!m) return json({ ok: false, error: 'auth' }, 401);
    const inq = await env.DB.prepare('SELECT id, created_at, space, location, status, first_contact_at FROM inquiries WHERE member_id = ? ORDER BY created_at DESC LIMIT 50').bind(m.id).all();
    return json({ ok: true, member: publicMember(m), inquiries: inq.results || [] });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  let b = {};
  try { b = await request.json(); } catch { /* empty body is fine for logout */ }

  switch (action) {
    case 'join': {
      if (b.website) return json({ ok: true });
      const key = await clientKey(env, request, 'join');
      if (await tooManyAttempts(env, key, 5, 60 * 60 * 1000)) return json({ ok: false, error: 'too-many' }, 429);
      const email = clean(b.email, 254).toLowerCase();
      const name = clean(b.name, 60);
      if (!EMAIL.test(email)) return json({ ok: false, error: 'email' }, 400);
      if (!pwOk(b.password)) return json({ ok: false, error: 'password' }, 400);
      if (!name) return json({ ok: false, error: 'name' }, 400);
      if (!b.agree || !b.age14) return json({ ok: false, error: 'agree' }, 400);
      const exists = await env.DB.prepare('SELECT id FROM members WHERE email = ?').bind(email).first();
      if (exists) return json({ ok: false, error: 'exists' }, 409);
      await recordAttempt(env, key);
      const { hash, salt } = await hashPassword(b.password);
      const vid = ID.test(b.vid || '') ? b.vid : null;
      const ft = await firstTouch(env, vid);
      const now = Date.now();
      const interest = (Array.isArray(b.interest) ? b.interest : []).map((x) => clean(x, 40)).filter(Boolean).slice(0, 10).join(',');
      const r = await env.DB.prepare(
        `INSERT INTO members (email, pw_hash, pw_salt, name, company, phone, who, interest, location, marketing, status, vid, channel, source, created_at, created_day, last_login, login_count, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'active', ?,?,?,?,?,?,1,?)`
      ).bind(email, hash, salt, name, clean(b.company, 80) || null, clean(b.phone, 40) || null, clean(b.who, 60) || null,
        interest || null, clean(b.location, 200) || null, b.marketing ? 1 : 0, vid, ft.channel, ft.source, now, kstParts(now).day, now, now).run();
      const m = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(r.meta.last_row_id).first();
      await logEvent(env, { type: 'signup', vid, sid: ID.test(b.sid || '') ? b.sid : null, path: '/member/join', label: m.who || '' });
      return startSession(env, request, m);
    }

    case 'login': {
      const key = await clientKey(env, request, 'mlogin');
      if (await tooManyAttempts(env, key, 8)) return json({ ok: false, error: 'too-many' }, 429);
      const email = clean(b.email, 254).toLowerCase();
      const m = email ? await env.DB.prepare('SELECT * FROM members WHERE email = ?').bind(email).first() : null;
      const { hash } = await hashPassword(String(b.password || ''), m ? m.pw_salt : 'x'.repeat(32));
      if (!m || !(await safeEqual(hash, m.pw_hash))) { await recordAttempt(env, key); return json({ ok: false, error: 'invalid' }, 401); }
      if (m.status !== 'active') return json({ ok: false, error: 'blocked' }, 403);
      const now = Date.now();
      await env.DB.prepare('UPDATE members SET last_login = ?, login_count = login_count + 1 WHERE id = ?').bind(now, m.id).run();
      await logEvent(env, { type: 'login', vid: ID.test(b.vid || '') ? b.vid : null, path: '/member/login' });
      return startSession(env, request, { ...m, last_login: now });
    }

    case 'logout':
      return json({ ok: true }, 200, { 'Set-Cookie': setCookie(MEMBER_COOKIE, '', 0, request) });

    case 'update': {
      const m = await currentMember(env, request);
      if (!m) return json({ ok: false, error: 'auth' }, 401);
      const name = clean(b.name, 60);
      if (!name) return json({ ok: false, error: 'name' }, 400);
      const interest = (Array.isArray(b.interest) ? b.interest : []).map((x) => clean(x, 40)).filter(Boolean).slice(0, 10).join(',');
      await env.DB.prepare('UPDATE members SET name=?, company=?, phone=?, who=?, interest=?, location=?, marketing=?, updated_at=? WHERE id=?')
        .bind(name, clean(b.company, 80) || null, clean(b.phone, 40) || null, clean(b.who, 60) || null, interest || null,
          clean(b.location, 200) || null, b.marketing ? 1 : 0, Date.now(), m.id).run();
      const fresh = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(m.id).first();
      return json({ ok: true, member: publicMember(fresh) });
    }

    case 'password': {
      const m = await currentMember(env, request);
      if (!m) return json({ ok: false, error: 'auth' }, 401);
      const { hash } = await hashPassword(String(b.current || ''), m.pw_salt);
      if (!(await safeEqual(hash, m.pw_hash))) return json({ ok: false, error: 'invalid' }, 400);
      if (!pwOk(b.next)) return json({ ok: false, error: 'password' }, 400);
      const n = await hashPassword(b.next);
      await env.DB.prepare('UPDATE members SET pw_hash=?, pw_salt=?, updated_at=? WHERE id=?').bind(n.hash, n.salt, Date.now(), m.id).run();
      return json({ ok: true });
    }

    case 'withdraw': {
      const m = await currentMember(env, request);
      if (!m) return json({ ok: false, error: 'auth' }, 401);
      const { hash } = await hashPassword(String(b.password || ''), m.pw_salt);
      if (!(await safeEqual(hash, m.pw_hash))) return json({ ok: false, error: 'invalid' }, 400);
      await env.DB.batch([
        env.DB.prepare('UPDATE inquiries SET member_id = NULL WHERE member_id = ?').bind(m.id),
        env.DB.prepare('UPDATE pageviews SET member_id = NULL WHERE member_id = ?').bind(m.id),
        env.DB.prepare('DELETE FROM resets WHERE member_id = ?').bind(m.id),
        env.DB.prepare('DELETE FROM members WHERE id = ?').bind(m.id),
      ]);
      await logEvent(env, { type: 'withdraw', path: '/member/mypage' });
      return json({ ok: true }, 200, { 'Set-Cookie': setCookie(MEMBER_COOKIE, '', 0, request) });
    }

    case 'forgot': {
      if (!env.RESEND_API_KEY) return json({ ok: false, error: 'mail-not-configured' }, 501);
      const key = await clientKey(env, request, 'forgot');
      if (await tooManyAttempts(env, key, 5, 60 * 60 * 1000)) return json({ ok: false, error: 'too-many' }, 429);
      await recordAttempt(env, key);
      const email = clean(b.email, 254).toLowerCase();
      const m = EMAIL.test(email) ? await env.DB.prepare('SELECT id, name, email, status FROM members WHERE email = ?').bind(email).first() : null;
      if (m && m.status === 'active') {
        const token = randomHex(24);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM resets WHERE member_id = ? OR expires < ?').bind(m.id, Date.now()),
          env.DB.prepare('INSERT INTO resets (token_hash, member_id, expires) VALUES (?,?,?)').bind(await sha256(token), m.id, Date.now() + 30 * 60 * 1000),
        ]);
        const link = `${new URL(request.url).origin}/member/reset.html?token=${token}`;
        await sendMail(env, {
          to: m.email,
          subject: '[지유공간개발] 비밀번호 재설정 안내',
          text: `${m.name}님, 아래 링크에서 새 비밀번호를 정해 주세요. 링크는 30분 동안만 쓸 수 있습니다.\n\n${link}\n\n요청하신 적이 없다면 이 메일은 무시하셔도 됩니다.`,
          html: `<p style="font:15px/1.7 sans-serif">${escHtml(m.name)}님, 아래 버튼을 눌러 새 비밀번호를 정해 주세요. 링크는 30분 동안만 쓸 수 있습니다.</p><p><a href="${escHtml(link)}" style="display:inline-block;background:#17a35f;color:#fff;padding:12px 20px;text-decoration:none;font:700 15px sans-serif">새 비밀번호 정하기</a></p><p style="font:13px/1.6 sans-serif;color:#6b7689">요청하신 적이 없다면 이 메일은 무시하셔도 됩니다.</p>`,
        });
      }
      // 가입 여부를 알려주지 않기 위해 결과는 항상 같습니다.
      return json({ ok: true });
    }

    case 'reset': {
      const token = String(b.token || '');
      if (!/^[a-f0-9]{48}$/.test(token)) return json({ ok: false, error: 'token' }, 400);
      if (!pwOk(b.password)) return json({ ok: false, error: 'password' }, 400);
      const row = await env.DB.prepare('SELECT member_id, expires FROM resets WHERE token_hash = ?').bind(await sha256(token)).first();
      if (!row || row.expires < Date.now()) return json({ ok: false, error: 'token' }, 400);
      const n = await hashPassword(b.password);
      await env.DB.batch([
        env.DB.prepare('UPDATE members SET pw_hash=?, pw_salt=?, updated_at=? WHERE id=?').bind(n.hash, n.salt, Date.now(), row.member_id),
        env.DB.prepare('DELETE FROM resets WHERE member_id = ?').bind(row.member_id),
      ]);
      return json({ ok: true });
    }
  }
  return json({ ok: false, error: 'not-found' }, 404);
}
