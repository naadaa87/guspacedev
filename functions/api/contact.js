/**
 * 상담 신청 폼 수신 — Cloudflare Pages Function
 * 경로: /api/contact  (POST, JSON)
 *
 * 1) D1(바인딩 이름 DB)이 연결돼 있으면 신청 내용을 저장합니다 → 관리자 화면 "상담 문의"에서 확인·상태 관리
 * 2) 아래 환경변수가 있으면 담당자에게 메일도 보냅니다.
 *   RESEND_API_KEY  : https://resend.com 에서 발급한 API 키
 *   CONTACT_TO      : 상담 내용을 받을 이메일 (쉼표로 여러 명)
 *   CONTACT_FROM    : 발신 주소 (Resend에 인증한 도메인 주소, 예: "지유공간개발 <noreply@guspace.kr>")
 *                     도메인 인증 전에는 "onboarding@resend.dev" 로 테스트할 수 있습니다.
 * 둘 다 없으면 501을 돌려주고, 화면에서는 방문자의 메일 앱을 여는 방식으로 대신 접수합니다.
 */
import { json, clean, kstParts, ensureSchema, memberSession, firstTouch, sendMail, escHtml, clientKey, tooManyAttempts, recordAttempt } from '../_lib/core.js';

const ID = /^[a-f0-9]{8,40}$/;

export async function onRequestPost({ request, env }) {
  const canMail = !!(env.RESEND_API_KEY && env.CONTACT_TO);
  if (!env.DB && !canMail) return json({ ok: false, error: 'not-configured' }, 501);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }
  if (body.website) return json({ ok: true }); // 스팸 차단용 숨은 칸

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 120);
  if (!name || !phone) return json({ ok: false, error: 'missing-fields' }, 400);

  const f = {
    who: clean(body.who, 60), location: clean(body.location, 200), space: clean(body.space, 60),
    size: clean(body.size, 120), message: clean(body.message, 4000), page: clean(body.page, 300),
  };
  const vid = ID.test(body.vid || '') ? body.vid : null;
  const sid = ID.test(body.sid || '') ? body.sid : null;

  let saved = false, id = null, ft = { channel: null, source: null, landing: null };
  if (env.DB) {
    await ensureSchema(env);
    const key = await clientKey(env, request, 'contact');
    if (await tooManyAttempts(env, key, 8, 60 * 60 * 1000)) return json({ ok: false, error: 'too-many' }, 429);
    await recordAttempt(env, key);
    const m = await memberSession(env, request);
    ft = await firstTouch(env, vid);
    const now = Date.now();
    const r = await env.DB.prepare(
      `INSERT INTO inquiries (created_at, created_day, name, phone, email, who, location, space, size, message, page, vid, sid, channel, source, landing, member_id, status, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'new', ?)`
    ).bind(now, kstParts(now).day, name, phone, email || null, f.who || null, f.location || null, f.space || null, f.size || null,
      f.message || null, f.page || null, vid, sid, ft.channel, ft.source, ft.landing, m ? m.id : null, now).run();
    id = r.meta?.last_row_id ?? null;
    saved = true;
  }

  let mailed = false;
  if (canMail) {
    const CH = { search: '검색', social: 'SNS', referral: '다른 사이트', campaign: '캠페인', direct: '직접 방문' };
    const rows = [
      ['이름 / 회사', name], ['연락처', phone], ['이메일', email || '-'],
      ['고객 유형', f.who || '-'], ['건물 위치', f.location || '-'], ['공간 유형', f.space || '-'],
      ['면적 · 공실 기간', f.size || '-'], ['문의 내용', f.message || '-'],
      ['첫 유입 경로', ft.channel ? `${CH[ft.channel] || ft.channel} · ${ft.source}` : '-'],
      ['접수 페이지', f.page || '-'],
      ['접수 시각', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (id ? `\n\n관리자 화면에서 보기: ${new URL(request.url).origin}/admin/#leads/${id}` : '');
    const html = `<table style="border-collapse:collapse;font:15px/1.6 sans-serif">${rows
      .map(([k, v]) => `<tr><th style="text-align:left;padding:6px 14px 6px 0;white-space:nowrap;vertical-align:top">${escHtml(k)}</th><td style="padding:6px 0;white-space:pre-wrap">${escHtml(v)}</td></tr>`)
      .join('')}</table>`;
    const r = await sendMail(env, { to: env.CONTACT_TO, replyTo: email || undefined, subject: `[홈페이지 상담신청] ${name} · ${f.space || '문의'}`, text, html });
    mailed = r.ok;
    if (saved && mailed) await env.DB.prepare('UPDATE inquiries SET mailed = 1 WHERE id = ?').bind(id).run();
  }

  if (!saved && !mailed) return json({ ok: false, error: 'send-failed' }, 502);
  return json({ ok: true, id });
}

export function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  return new Response('Method Not Allowed', { status: 405 });
}
