/**
 * 방문 기록 수집 — /api/t (POST)
 * assets/js/track.js 가 보내는 페이지 조회(pv), 머문 시간·스크롤(end), 클릭·행동(ev)을 D1에 저장합니다.
 * 개인을 알아볼 수 있는 정보(IP 주소 등)는 저장하지 않습니다. 국가·지역은 Cloudflare가 알려주는 대략적인 값만 씁니다.
 */
import { ensureSchema, kstParts, clean, isBot, uaInfo, classify, normPath, pageGroup, sameOrigin, adminSession, memberSession } from '../_lib/core.js';

const ok = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const EVENT_TYPES = new Set(['click', 'cta', 'tel', 'mail', 'map', 'outbound', 'menu', 'check', 'form_start', 'download', 'share']);
const ID = /^[a-f0-9]{8,40}$/;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return ok();
  const ua = request.headers.get('User-Agent') || '';
  if (isBot(ua) || !sameOrigin(request)) return ok();

  const raw = await request.text();
  if (raw.length > 8000) return ok();
  let items;
  try { items = JSON.parse(raw); } catch { return ok(); }
  if (!Array.isArray(items)) items = [items];
  items = items.slice(0, 20);

  // 관리자 본인의 방문은 통계에서 뺍니다.
  if (await adminSession(env, request)) return ok();

  await ensureSchema(env);
  const now = Date.now();
  const { day, hour, dow } = kstParts(now);
  const selfHost = new URL(request.url).hostname;
  const cf = request.cf || {};
  const stmts = [];
  let member = null;

  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const pid = String(it.pid || '');
    if (!ID.test(pid)) continue;

    if (it.k === 'pv') {
      const vid = String(it.vid || ''), sid = String(it.sid || '');
      if (!ID.test(vid) || !ID.test(sid)) continue;
      const path = normPath(it.p);
      if (path.startsWith('/admin') || path.startsWith('/api')) continue;
      if (member === null) member = (await memberSession(env, request)) || false;
      const entry = it.ns ? 1 : 0;
      let c = classify(clean(it.r, 600), selfHost, { source: clean(it.us, 60), medium: clean(it.um, 60) }, ua);
      if (entry && c.channel === 'internal') c = { ...c, channel: 'direct', source: 'direct' };
      const { device, browser, os } = uaInfo(ua);
      const title = clean(it.t, 160).replace(/\s*[|·-]\s*지유공간개발\s*$/, '');
      stmts.push(env.DB.prepare(
        `INSERT OR IGNORE INTO pageviews (pid, ts, day, hour, dow, vid, sid, path, title, grp, ref, channel, source, campaign, term,
          device, browser, os, country, region, city, new_visitor, entry, member_id, dur, scroll, last_ts)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?)`
      ).bind(pid, now, day, hour, dow, vid, sid, path, title, pageGroup(path), c.ref, c.channel, c.source,
        clean(it.uc, 80) || null, clean(it.ut, 80) || c.term,
        device, browser, os, cf.country || null, cf.region || null, cf.city || null,
        it.nv ? 1 : 0, entry, member ? member.id : null, now));
    } else if (it.k === 'end') {
      const d = Math.max(0, Math.min(1800000, Math.round(Number(it.d) || 0)));
      const s = Math.max(0, Math.min(100, Math.round(Number(it.s) || 0)));
      stmts.push(env.DB.prepare('UPDATE pageviews SET dur = MAX(dur, ?), scroll = MAX(scroll, ?), last_ts = ? WHERE pid = ?').bind(d, s, now, pid));
    } else if (it.k === 'ev') {
      const type = String(it.e || '');
      if (!EVENT_TYPES.has(type)) continue;
      stmts.push(env.DB.prepare('INSERT INTO events (ts, day, vid, sid, pid, path, type, label, target, area) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(now, day, ID.test(it.vid) ? it.vid : null, ID.test(it.sid) ? it.sid : null, pid, normPath(it.p), type,
          clean(it.l, 80) || null, clean(it.h, 200) || null, clean(it.a, 20) || null));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return ok();
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405 });
}
