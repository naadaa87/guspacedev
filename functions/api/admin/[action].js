/**
 * 관리자 API — /api/admin/{action}
 * 로그인: Cloudflare Pages 환경변수 ADMIN_PASSWORD 에 정한 비밀번호
 * 세션: 서명된 HttpOnly 쿠키(12시간). 비밀번호를 바꾸면 기존 세션은 모두 끊깁니다.
 */
import {
  json, clean, ensureSchema, signToken, adminSession, setCookie, ADMIN_COOKIE, safeEqual,
  clientKey, tooManyAttempts, recordAttempt, sameOrigin, kstParts,
} from '../../_lib/core.js';
import * as S from '../../_lib/stats.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LEAD_STATUS = ['new', 'contacted', 'consulting', 'proposal', 'won', 'hold', 'closed'];

function range(url) {
  const today = kstParts().day;
  let f = url.searchParams.get('from'), t = url.searchParams.get('to');
  if (!DAY_RE.test(t || '')) t = today;
  if (!DAY_RE.test(f || '')) f = S.shiftDay(t, -29);
  if (f > t) [f, t] = [t, f];
  if (S.daysBetween(f, t) > 400) f = S.shiftDay(t, -399);
  return [f, t];
}

const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 엑셀 수식 주입 방지
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function csv(name, head, rows) {
  const body = '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  });
}
const CH_KO = { search: '검색', social: 'SNS · 커뮤니티', referral: '다른 사이트', campaign: '캠페인 · 광고', direct: '직접 방문' };
const ST_KO = { new: '신규 접수', contacted: '연락 완료', consulting: '상담 진행', proposal: '제안 · 견적', won: '계약', hold: '보류', closed: '종료' };
const kst = (ms) => (ms ? new Date(ms + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 16) : '');

export async function onRequest({ request, env, params }) {
  const action = String(params.action || '');
  const url = new URL(request.url);
  const method = request.method;

  /* ---------- 로그인 없이 쓰는 것 ---------- */
  if (action === 'status' && method === 'GET') {
    const authed = !!(await adminSession(env, request));
    const out = { ok: true, configured: !!env.ADMIN_PASSWORD, db: !!env.DB, authed };
    if (authed) {
      out.mail = !!(env.RESEND_API_KEY && env.CONTACT_TO);
      if (env.DB) {
        await ensureSchema(env);
        const r = await S.run(env.DB, {
          pv: ['SELECT COUNT(*) n, MIN(day) first, MAX(ts) last FROM pageviews'],
          ev: ['SELECT COUNT(*) n FROM events'],
          mem: ['SELECT COUNT(*) n FROM members'],
          inq: ['SELECT COUNT(*) n FROM inquiries'],
        });
        out.counts = { pageviews: r.pv[0].n, events: r.ev[0].n, members: r.mem[0].n, inquiries: r.inq[0].n };
        out.firstDay = r.pv[0].first; out.lastHit = r.pv[0].last;
      }
    }
    return json(out);
  }

  if (action === 'login' && method === 'POST') {
    if (!env.ADMIN_PASSWORD) return json({ ok: false, error: 'not-configured' }, 503);
    if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
    if (env.DB) await ensureSchema(env);
    const key = await clientKey(env, request, 'admin');
    if (await tooManyAttempts(env, key, 5)) return json({ ok: false, error: 'too-many' }, 429);
    let b = {};
    try { b = await request.json(); } catch { /* */ }
    if (!(await safeEqual(String(b.password || ''), env.ADMIN_PASSWORD))) {
      await recordAttempt(env, key);
      return json({ ok: false, error: 'invalid' }, 401);
    }
    const token = await signToken(env, 'admin', { role: 'admin', exp: Date.now() + 12 * 3600 * 1000 });
    return json({ ok: true }, 200, { 'Set-Cookie': setCookie(ADMIN_COOKIE, token, 12 * 3600, request) });
  }

  if (action === 'logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': setCookie(ADMIN_COOKIE, '', 0, request) });
  }

  /* ---------- 이하 관리자 로그인 필요 ---------- */
  if (!(await adminSession(env, request))) return json({ ok: false, error: 'auth' }, 401);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  await ensureSchema(env);
  const db = env.DB;
  if (method === 'POST' && !sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);

  if (method === 'GET') {
    const [f, t] = range(url);
    switch (action) {
      case 'overview': return json(await S.overview(db, f, t));
      case 'traffic': return json(await S.traffic(db, f, t));
      case 'pages': return json(await S.pages(db, f, t));
      case 'page': return json(await S.pageDetail(db, f, t, clean(url.searchParams.get('path'), 200) || '/'));
      case 'content': return json(await S.content(db, f, t));
      case 'sources': return json(await S.sources(db, f, t));
      case 'actions': return json(await S.actions(db, f, t));
      case 'members-summary': return json(await S.membersSummary(db, f, t));
      case 'leads-summary': return json(await S.leadsSummary(db, f, t));
      case 'realtime': return json(await S.realtime(db));

      case 'leads': {
        const st = url.searchParams.get('status') || '';
        const q = clean(url.searchParams.get('q'), 60);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const where = [], b = [];
        if (LEAD_STATUS.includes(st)) { where.push('status = ?'); b.push(st); }
        if (q) { where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ? OR message LIKE ?)'); for (let i = 0; i < 5; i++) b.push('%' + q + '%'); }
        const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const r = await S.run(db, {
          rows: [`SELECT id, created_at, name, phone, email, who, location, space, status, channel, source, member_id, first_contact_at FROM inquiries ${w} ORDER BY created_at DESC LIMIT 30 OFFSET ${(page - 1) * 30}`, ...b],
          total: [`SELECT COUNT(*) n FROM inquiries ${w}`, ...b],
          counts: ['SELECT status k, COUNT(*) n FROM inquiries GROUP BY 1'],
        });
        return json({ rows: r.rows, total: r.total[0].n, page, counts: r.counts });
      }
      case 'lead': {
        const id = parseInt(url.searchParams.get('id') || '0', 10);
        const row = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
        if (!row) return json({ ok: false, error: 'not-found' }, 404);
        let journey = [], member = null;
        if (row.vid) {
          journey = (await db.prepare('SELECT ts, path, title, channel, source, entry, dur FROM pageviews WHERE vid = ? AND ts <= ? ORDER BY ts DESC LIMIT 40').bind(row.vid, row.created_at + 60000).all()).results || [];
        }
        if (row.member_id) member = await db.prepare('SELECT id, name, email, company FROM members WHERE id = ?').bind(row.member_id).first();
        return json({ lead: row, journey: journey.reverse(), member });
      }
      case 'members': {
        const q = clean(url.searchParams.get('q'), 60);
        const who = clean(url.searchParams.get('who'), 60);
        const st = url.searchParams.get('status') || '';
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const where = [], b = [];
        if (q) { where.push('(m.name LIKE ? OR m.email LIKE ? OR m.company LIKE ? OR m.phone LIKE ?)'); for (let i = 0; i < 4; i++) b.push('%' + q + '%'); }
        if (who) { where.push('m.who = ?'); b.push(who); }
        if (st === 'marketing') where.push('m.marketing = 1');
        else if (st === 'blocked') where.push("m.status = 'blocked'");
        const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const r = await S.run(db, {
          rows: [`SELECT m.id, m.created_at, m.email, m.name, m.company, m.phone, m.who, m.interest, m.marketing, m.status, m.last_login, m.login_count, m.channel, m.source,
              (SELECT COUNT(*) FROM inquiries i WHERE i.member_id = m.id) inq FROM members m ${w} ORDER BY m.created_at DESC LIMIT 30 OFFSET ${(page - 1) * 30}`, ...b],
          total: [`SELECT COUNT(*) n FROM members m ${w}`, ...b],
        });
        return json({ rows: r.rows, total: r.total[0].n, page });
      }
      case 'member': {
        const id = parseInt(url.searchParams.get('id') || '0', 10);
        const m = await db.prepare('SELECT id, created_at, email, name, company, phone, who, interest, location, marketing, status, memo, last_login, login_count, channel, source, vid FROM members WHERE id = ?').bind(id).first();
        if (!m) return json({ ok: false, error: 'not-found' }, 404);
        const r = await S.run(db, {
          inq: ['SELECT id, created_at, space, status FROM inquiries WHERE member_id = ? ORDER BY created_at DESC', id],
          pv: ['SELECT COUNT(*) pv, COUNT(DISTINCT sid) ss, MAX(ts) last FROM pageviews WHERE member_id = ? OR (vid = ? AND vid IS NOT NULL)', id, m.vid],
          top: ['SELECT path, MAX(title) title, COUNT(*) n FROM pageviews WHERE member_id = ? OR (vid = ? AND vid IS NOT NULL) GROUP BY path ORDER BY n DESC LIMIT 8', id, m.vid],
        });
        delete m.vid;
        return json({ member: m, inquiries: r.inq, visits: r.pv[0], topPages: r.top });
      }
      case 'export': {
        const type = url.searchParams.get('type');
        if (type === 'leads') {
          const r = (await db.prepare('SELECT * FROM inquiries WHERE created_day BETWEEN ? AND ? ORDER BY created_at DESC').bind(f, t).all()).results || [];
          return csv(`상담문의_${f}_${t}.csv`, ['번호', '접수일시', '이름·회사', '연락처', '이메일', '고객 유형', '건물 위치', '공간 유형', '면적·공실 기간', '문의 내용', '상태', '첫 연락', '유입 경로', '유입 출처', '첫 방문 페이지', '메모'],
            r.map((x) => [x.id, kst(x.created_at), x.name, x.phone, x.email, x.who, x.location, x.space, x.size, x.message, ST_KO[x.status] || x.status, kst(x.first_contact_at), CH_KO[x.channel] || x.channel, x.source, x.landing, x.memo]));
        }
        if (type === 'members') {
          const r = (await db.prepare('SELECT * FROM members ORDER BY created_at DESC').all()).results || [];
          return csv(`회원목록_${kstParts().day}.csv`, ['번호', '가입일시', '이메일', '이름', '회사·소속', '연락처', '고객 유형', '관심 분야', '건물 위치', '소식 수신', '상태', '최근 로그인', '로그인 횟수', '가입 유입 경로', '유입 출처', '메모'],
            r.map((x) => [x.id, kst(x.created_at), x.email, x.name, x.company, x.phone, x.who, x.interest, x.location, x.marketing ? '동의' : '미동의', x.status === 'blocked' ? '이용 정지' : '정상', kst(x.last_login), x.login_count, CH_KO[x.channel] || x.channel, x.source, x.memo]));
        }
        if (type === 'pages') {
          const p = await S.pages(db, f, t);
          return csv(`페이지분석_${f}_${t}.csv`, ['주소', '제목', '페이지뷰', '방문자', '평균 체류(초)', '완독률(%)', '진입', '이탈률(%)', '상담 연결 방문자'],
            p.rows.map((x) => [x.path, x.title, x.pv, x.uv, Math.round((x.dur || 0) / 1000), Math.round((x.readRate || 0) * 100), x.entries, Math.round(x.exitRate * 100), x.conv]));
        }
        return json({ ok: false, error: 'type' }, 400);
      }
    }
    return json({ ok: false, error: 'not-found' }, 404);
  }

  if (method === 'POST') {
    let b = {};
    try { b = await request.json(); } catch { /* */ }
    const id = parseInt(b.id || '0', 10);
    switch (action) {
      case 'lead': {
        const row = await db.prepare('SELECT status, first_contact_at FROM inquiries WHERE id = ?').bind(id).first();
        if (!row) return json({ ok: false, error: 'not-found' }, 404);
        const status = LEAD_STATUS.includes(b.status) ? b.status : row.status;
        const now = Date.now();
        const first = row.first_contact_at || (status !== 'new' ? now : null);
        await db.prepare('UPDATE inquiries SET status = ?, memo = ?, first_contact_at = ?, updated_at = ? WHERE id = ?')
          .bind(status, clean(b.memo, 4000) || null, first, now, id).run();
        return json({ ok: true });
      }
      case 'lead-delete':
        await db.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
        return json({ ok: true });
      case 'member': {
        const status = b.status === 'blocked' ? 'blocked' : 'active';
        await db.prepare('UPDATE members SET status = ?, memo = ?, updated_at = ? WHERE id = ?').bind(status, clean(b.memo, 2000) || null, Date.now(), id).run();
        return json({ ok: true });
      }
      case 'member-delete':
        await db.batch([
          db.prepare('UPDATE inquiries SET member_id = NULL WHERE member_id = ?').bind(id),
          db.prepare('UPDATE pageviews SET member_id = NULL WHERE member_id = ?').bind(id),
          db.prepare('DELETE FROM resets WHERE member_id = ?').bind(id),
          db.prepare('DELETE FROM members WHERE id = ?').bind(id),
        ]);
        return json({ ok: true });
      case 'purge': {
        const days = Math.max(90, Math.min(3650, parseInt(b.days || '0', 10)));
        const before = S.shiftDay(kstParts().day, -days);
        const r = await db.batch([
          db.prepare('DELETE FROM pageviews WHERE day < ?').bind(before),
          db.prepare('DELETE FROM events WHERE day < ?').bind(before),
        ]);
        return json({ ok: true, before, deleted: { pageviews: r[0].meta.changes, events: r[1].meta.changes } });
      }
    }
  }
  return json({ ok: false, error: 'not-found' }, 404);
}
