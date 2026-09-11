/**
 * 상담 신청 폼 수신 — Cloudflare Pages Function
 * 경로: /api/contact  (POST, JSON)
 *
 * Cloudflare Pages > Settings > Environment variables 에 아래 값을 넣으면 동작합니다.
 *   RESEND_API_KEY  : https://resend.com 에서 발급한 API 키
 *   CONTACT_TO      : 상담 내용을 받을 이메일 (예: ceo@example.com)
 *   CONTACT_FROM    : 발신 주소 (Resend에 인증한 도메인 주소, 예: "지유공간개발 <noreply@example.com>")
 *                     도메인 인증 전에는 "onboarding@resend.dev" 로 테스트할 수 있습니다.
 */
export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    return json({ ok: false, error: 'not-configured' }, 501);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-json' }, 400); }

  const clean = (v, max = 2000) => String(v ?? '').replace(/[<>]/g, '').slice(0, max).trim();
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 120);
  if (!name || !phone) return json({ ok: false, error: 'missing-fields' }, 400);

  const rows = [
    ['이름 / 회사', name],
    ['연락처', phone],
    ['이메일', email || '-'],
    ['고객 유형', clean(body.who, 60) || '-'],
    ['건물 위치', clean(body.location, 200) || '-'],
    ['공간 유형', clean(body.space, 60) || '-'],
    ['면적 · 공실 기간', clean(body.size, 120) || '-'],
    ['문의 내용', clean(body.message)],
    ['접수 페이지', clean(body.page, 300)],
    ['접수 시각', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<table style="border-collapse:collapse;font:15px/1.6 sans-serif">${rows
    .map(([k, v]) => `<tr><th style="text-align:left;padding:6px 14px 6px 0;white-space:nowrap;vertical-align:top">${k}</th><td style="padding:6px 0;white-space:pre-wrap">${v}</td></tr>`)
    .join('')}</table>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'onboarding@resend.dev',
      to: env.CONTACT_TO.split(',').map((s) => s.trim()),
      reply_to: email || undefined,
      subject: `[홈페이지 상담신청] ${name} · ${clean(body.space, 60) || '문의'}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return json({ ok: false, error: 'send-failed', detail: err.slice(0, 300) }, 502);
  }
  return json({ ok: true });
}

export function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  return new Response('Method Not Allowed', { status: 405 });
}
