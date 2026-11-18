/**
 * 관리자 KPI 집계 쿼리 (D1 / SQLite)
 * 날짜는 모두 한국 시간(KST) 기준 'YYYY-MM-DD' 문자열입니다.
 */

const CLICK_TYPES = `('click','cta','tel','mail','map','outbound','menu','download','share')`;
const INFO_GROUPS = `('business','process','clients','insights')`;

/** 세션 단위 집계용 공통 CTE */
const SESS = (where = '') => `WITH s AS (
  SELECT sid, COUNT(*) pv, SUM(dur) d, MIN(vid) vid,
         MAX(CASE WHEN entry = 1 THEN channel END) ch, MAX(CASE WHEN entry = 1 THEN source END) src
  FROM pageviews WHERE day BETWEEN ?1 AND ?2 ${where} GROUP BY sid)`;

export function shiftDay(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000) + 1;
}
export function prevRange(from, to) {
  const n = daysBetween(from, to);
  const pTo = shiftDay(from, -1);
  return [shiftDay(pTo, -(n - 1)), pTo];
}

/** 여러 쿼리를 한 번에 보내고 이름으로 결과를 돌려줍니다. */
export async function run(db, defs) {
  const keys = Object.keys(defs);
  const res = await db.batch(keys.map((k) => { const [sql, ...b] = defs[k]; return db.prepare(sql).bind(...b); }));
  const out = {};
  keys.forEach((k, i) => (out[k] = res[i].results || []));
  return out;
}

function summaryDefs(prefix, f, t) {
  return {
    [prefix + 'pv']: [`SELECT COUNT(*) pv, COUNT(DISTINCT vid) uv, COUNT(DISTINCT sid) ss,
        COUNT(DISTINCT CASE WHEN new_visitor = 1 THEN vid END) nv FROM pageviews WHERE day BETWEEN ?1 AND ?2`, f, t],
    [prefix + 'sess']: [`${SESS()} SELECT COUNT(*) ss, SUM(CASE WHEN pv > 1 OR d >= 10000 THEN 1 ELSE 0 END) eng,
        AVG(d) dur, AVG(pv) ppv FROM s`, f, t],
    [prefix + 'ev']: [`SELECT type, COUNT(*) n, COUNT(DISTINCT vid) v FROM events WHERE day BETWEEN ?1 AND ?2 GROUP BY type`, f, t],
    [prefix + 'inq']: [`SELECT COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2`, f, t],
    [prefix + 'mem']: [`SELECT COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2`, f, t],
  };
}

function summarize(r, prefix) {
  const pv = r[prefix + 'pv'][0] || {}, ss = r[prefix + 'sess'][0] || {};
  const ev = {};
  (r[prefix + 'ev'] || []).forEach((e) => (ev[e.type] = e.n));
  const clicks = ['click', 'cta', 'tel', 'mail', 'map', 'outbound', 'menu', 'download', 'share'].reduce((a, k) => a + (ev[k] || 0), 0);
  const sessions = ss.ss || 0;
  const inquiries = r[prefix + 'inq'][0]?.n || 0;
  return {
    pageviews: pv.pv || 0, visitors: pv.uv || 0, sessions, newVisitors: pv.nv || 0,
    returningVisitors: Math.max(0, (pv.uv || 0) - (pv.nv || 0)),
    engaged: ss.eng || 0, engagementRate: sessions ? (ss.eng || 0) / sessions : null,
    bounceRate: sessions ? 1 - (ss.eng || 0) / sessions : null,
    avgSession: ss.dur || 0, pagesPerSession: ss.ppv || 0,
    clicks, events: ev, inquiries, signups: r[prefix + 'mem'][0]?.n || 0,
    conversionRate: pv.uv ? inquiries / pv.uv : null,
    contactIntent: (ev.tel || 0) + (ev.mail || 0) + (ev.map || 0),
  };
}

function funnelDefs(f, t) {
  return {
    fn: [`SELECT
        (SELECT COUNT(DISTINCT vid) FROM pageviews WHERE day BETWEEN ?1 AND ?2) a,
        (SELECT COUNT(DISTINCT vid) FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND grp IN ${INFO_GROUPS}) b,
        (SELECT COUNT(DISTINCT vid) FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND grp = 'contact') c,
        (SELECT COUNT(DISTINCT vid) FROM events WHERE day BETWEEN ?1 AND ?2 AND type = 'form_start') d,
        (SELECT COUNT(DISTINCT COALESCE(vid, 'i' || id)) FROM inquiries WHERE created_day BETWEEN ?1 AND ?2) e`, f, t],
  };
}

export async function overview(db, f, t) {
  const [pf, pt] = prevRange(f, t);
  const r = await run(db, {
    ...summaryDefs('c_', f, t),
    ...summaryDefs('p_', pf, pt),
    ...funnelDefs(f, t),
    daily: [`SELECT day, COUNT(*) pv, COUNT(DISTINCT vid) uv, COUNT(DISTINCT sid) ss FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY day`, f, t],
    pdaily: [`SELECT day, COUNT(*) pv, COUNT(DISTINCT vid) uv, COUNT(DISTINCT sid) ss FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY day`, pf, pt],
    dinq: [`SELECT created_day day, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY created_day`, f, t],
    pdinq: [`SELECT created_day day, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY created_day`, pf, pt],
    dmem: [`SELECT created_day day, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY created_day`, f, t],
    pdmem: [`SELECT created_day day, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY created_day`, pf, pt],
    dclk: [`SELECT day, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY day`, f, t],
    pdclk: [`SELECT day, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY day`, pf, pt],
    dsess: [`${SESS()} , d AS (SELECT sid, MIN(day) day FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY sid)
        SELECT d.day, AVG(s.d) dur, AVG(CASE WHEN s.pv > 1 OR s.d >= 10000 THEN 0.0 ELSE 1.0 END) bounce FROM s JOIN d USING (sid) GROUP BY d.day`, f, t],
    hourly: [`SELECT hour, COUNT(*) pv, COUNT(DISTINCT vid) uv, COUNT(DISTINCT sid) ss FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY hour`, f, t],
    phourly: [`SELECT hour, COUNT(*) pv, COUNT(DISTINCT vid) uv, COUNT(DISTINCT sid) ss FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY hour`, pf, pt],
    hinq: [`SELECT CAST(strftime('%H', created_at / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    phinq: [`SELECT CAST(strftime('%H', created_at / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, pf, pt],
    hmem: [`SELECT CAST(strftime('%H', created_at / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    phmem: [`SELECT CAST(strftime('%H', created_at / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, pf, pt],
    hclk: [`SELECT CAST(strftime('%H', ts / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY 1`, f, t],
    phclk: [`SELECT CAST(strftime('%H', ts / 1000 + 32400, 'unixepoch') AS INTEGER) hour, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY 1`, pf, pt],
    pages: [`SELECT path, MAX(title) title, grp, COUNT(*) pv, COUNT(DISTINCT vid) uv, AVG(NULLIF(dur, 0)) dur
        FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY path ORDER BY uv DESC, pv DESC LIMIT 8`, f, t],
    channels: [`${SESS()} SELECT COALESCE(ch, 'direct') ch, COUNT(*) ss FROM s GROUP BY 1 ORDER BY 2 DESC`, f, t],
    devices: [`SELECT device k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY device ORDER BY n DESC`, f, t],
    recentInq: [`SELECT id, created_at, name, who, space, status, channel, source FROM inquiries ORDER BY created_at DESC LIMIT 5`],
    recentMem: [`SELECT id, created_at, name, company, who, channel, source FROM members ORDER BY created_at DESC LIMIT 5`],
    openInq: [`SELECT COUNT(*) n FROM inquiries WHERE status = 'new'`],
    totalMem: [`SELECT COUNT(*) n FROM members`],
  });
  return {
    range: { from: f, to: t, prevFrom: pf, prevTo: pt },
    cur: summarize(r, 'c_'), prev: summarize(r, 'p_'),
    funnel: r.fn[0],
    daily: { cur: r.daily, prev: r.pdaily, inq: r.dinq, pinq: r.pdinq, mem: r.dmem, pmem: r.pdmem, clk: r.dclk, pclk: r.pdclk, sess: r.dsess },
    hourly: { cur: r.hourly, prev: r.phourly, inq: r.hinq, pinq: r.phinq, mem: r.hmem, pmem: r.phmem, clk: r.hclk, pclk: r.phclk },
    pages: r.pages, channels: r.channels, devices: r.devices,
    recentInquiries: r.recentInq, recentMembers: r.recentMem,
    openInquiries: r.openInq[0]?.n || 0, totalMembers: r.totalMem[0]?.n || 0,
  };
}

export async function traffic(db, f, t) {
  const [pf, pt] = prevRange(f, t);
  const r = await run(db, {
    ...summaryDefs('c_', f, t),
    ...summaryDefs('p_', pf, pt),
    daily: [`SELECT day, COUNT(DISTINCT vid) uv, COUNT(DISTINCT CASE WHEN new_visitor = 1 THEN vid END) nv, COUNT(DISTINCT sid) ss, COUNT(*) pv
        FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY day`, f, t],
    heat: [`SELECT dow, hour, COUNT(DISTINCT sid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY dow, hour`, f, t],
    device: [`SELECT device k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
    browser: [`SELECT browser k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, f, t],
    os: [`SELECT os k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, f, t],
    region: [`SELECT COALESCE(region, '') k, country c, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`, f, t],
    country: [`SELECT COALESCE(country, '') k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, f, t],
    depth: [`${SESS()} SELECT CASE WHEN pv = 1 THEN '1' WHEN pv <= 3 THEN '2-3' WHEN pv <= 6 THEN '4-6' ELSE '7+' END k, COUNT(*) n FROM s GROUP BY 1`, f, t],
    durb: [`${SESS()} SELECT CASE WHEN d < 10000 THEN 'a' WHEN d < 30000 THEN 'b' WHEN d < 60000 THEN 'c' WHEN d < 180000 THEN 'd' WHEN d < 600000 THEN 'e' ELSE 'f' END k, COUNT(*) n FROM s GROUP BY 1`, f, t],
    freq: [`SELECT CASE WHEN n = 1 THEN '1' WHEN n = 2 THEN '2' WHEN n <= 4 THEN '3-4' ELSE '5+' END k, COUNT(*) v FROM
        (SELECT vid, COUNT(DISTINCT sid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY vid) GROUP BY 1`, f, t],
  });
  return {
    range: { from: f, to: t, prevFrom: pf, prevTo: pt },
    cur: summarize(r, 'c_'), prev: summarize(r, 'p_'),
    daily: r.daily, heat: r.heat, device: r.device, browser: r.browser, os: r.os, region: r.region, country: r.country,
    depth: r.depth, durBuckets: r.durb, frequency: r.freq,
  };
}

export async function pages(db, f, t) {
  const r = await run(db, {
    rows: [`SELECT path, MAX(title) title, grp, COUNT(*) pv, COUNT(DISTINCT vid) uv, AVG(NULLIF(dur, 0)) dur,
        AVG(CASE WHEN scroll >= 75 THEN 1.0 ELSE 0.0 END) readRate, SUM(entry) entries
        FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY path`, f, t],
    exits: [`WITH r AS (SELECT path, ROW_NUMBER() OVER (PARTITION BY sid ORDER BY ts DESC) rn FROM pageviews WHERE day BETWEEN ?1 AND ?2)
        SELECT path, COUNT(*) n FROM r WHERE rn = 1 GROUP BY path`, f, t],
    conv: [`SELECT p.path, COUNT(DISTINCT i.vid) n FROM (SELECT DISTINCT path, vid FROM pageviews WHERE day BETWEEN ?1 AND ?2) p
        JOIN inquiries i ON i.vid = p.vid AND i.created_day BETWEEN ?1 AND ?2 GROUP BY p.path`, f, t],
  });
  const ex = Object.fromEntries(r.exits.map((x) => [x.path, x.n]));
  const cv = Object.fromEntries(r.conv.map((x) => [x.path, x.n]));
  return {
    range: { from: f, to: t },
    rows: r.rows.map((x) => ({ ...x, exits: ex[x.path] || 0, exitRate: x.pv ? (ex[x.path] || 0) / x.pv : 0, conv: cv[x.path] || 0, convRate: x.uv ? (cv[x.path] || 0) / x.uv : 0 }))
      .sort((a, b) => b.pv - a.pv),
  };
}

export async function pageDetail(db, f, t, path) {
  const r = await run(db, {
    daily: [`SELECT day, COUNT(*) pv, COUNT(DISTINCT vid) uv FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND path = ?3 GROUP BY day`, f, t, path],
    prev: [`WITH s AS (SELECT path, LAG(path) OVER (PARTITION BY sid ORDER BY ts) p FROM pageviews WHERE day BETWEEN ?1 AND ?2)
        SELECT COALESCE(p, '') k, COUNT(*) n FROM s WHERE path = ?3 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, f, t, path],
    next: [`WITH s AS (SELECT path, LEAD(path) OVER (PARTITION BY sid ORDER BY ts) p FROM pageviews WHERE day BETWEEN ?1 AND ?2)
        SELECT COALESCE(p, '') k, COUNT(*) n FROM s WHERE path = ?3 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, f, t, path],
    entrySrc: [`SELECT channel ch, source src, COUNT(*) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND path = ?3 AND entry = 1 GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8`, f, t, path],
    clicks: [`SELECT type, label, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND path = ?3 AND type IN ${CLICK_TYPES} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 12`, f, t, path],
    scroll: [`SELECT CASE WHEN scroll >= 100 THEN 100 WHEN scroll >= 75 THEN 75 WHEN scroll >= 50 THEN 50 WHEN scroll >= 25 THEN 25 ELSE 0 END k, COUNT(*) n
        FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND path = ?3 GROUP BY 1`, f, t, path],
    device: [`SELECT device k, COUNT(DISTINCT vid) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND path = ?3 GROUP BY 1 ORDER BY 2 DESC`, f, t, path],
    titles: [`SELECT path, MAX(title) t FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY path`, f, t],
  });
  return { path, ...r };
}

export async function content(db, f, t) {
  const r = await run(db, {
    groups: [`SELECT grp k, COUNT(*) pv, COUNT(DISTINCT vid) uv, AVG(NULLIF(dur, 0)) dur FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY grp ORDER BY uv DESC`, f, t],
    items: [`SELECT path, MAX(title) title, grp, COUNT(*) pv, COUNT(DISTINCT vid) uv, AVG(NULLIF(dur, 0)) dur,
        AVG(CASE WHEN scroll >= 75 THEN 1.0 ELSE 0.0 END) readRate
        FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND grp IN ('business', 'insights', 'process', 'clients') GROUP BY path`, f, t],
    conv: [`SELECT p.path, COUNT(DISTINCT i.vid) n FROM (SELECT DISTINCT path, vid FROM pageviews WHERE day BETWEEN ?1 AND ?2) p
        JOIN inquiries i ON i.vid = p.vid AND i.created_day BETWEEN ?1 AND ?2 GROUP BY p.path`, f, t],
    check: [`SELECT label k, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type = 'check' GROUP BY 1 ORDER BY 2 DESC`, f, t],
    space: [`SELECT COALESCE(space, '') k, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
    who: [`SELECT COALESCE(who, '') k, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
    interest: [`SELECT interest FROM members WHERE interest IS NOT NULL AND interest != ''`],
  });
  const cv = Object.fromEntries(r.conv.map((x) => [x.path, x.n]));
  const tally = {};
  r.interest.forEach((m) => String(m.interest).split(',').forEach((k) => { k = k.trim(); if (k) tally[k] = (tally[k] || 0) + 1; }));
  return {
    range: { from: f, to: t },
    groups: r.groups,
    items: r.items.map((x) => ({ ...x, conv: cv[x.path] || 0 })),
    check: r.check, space: r.space, who: r.who,
    interest: Object.entries(tally).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n),
  };
}

export async function sources(db, f, t) {
  const r = await run(db, {
    channels: [`${SESS()} SELECT COALESCE(ch, 'direct') ch, COUNT(*) ss, COUNT(DISTINCT vid) uv,
        SUM(CASE WHEN pv > 1 OR d >= 10000 THEN 1 ELSE 0 END) eng, AVG(d) dur, AVG(pv) ppv FROM s GROUP BY 1 ORDER BY 2 DESC`, f, t],
    sources: [`${SESS()} SELECT COALESCE(ch, 'direct') ch, COALESCE(src, 'direct') src, COUNT(*) ss, COUNT(DISTINCT vid) uv,
        SUM(CASE WHEN pv > 1 OR d >= 10000 THEN 1 ELSE 0 END) eng FROM s GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 25`, f, t],
    inqCh: [`SELECT COALESCE(channel, 'unknown') ch, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    memCh: [`SELECT COALESCE(channel, 'unknown') ch, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    campaigns: [`SELECT campaign k, source src, COUNT(*) ss, COUNT(DISTINCT vid) uv FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND entry = 1 AND campaign IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20`, f, t],
    terms: [`SELECT term k, source src, COUNT(*) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND entry = 1 AND term IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20`, f, t],
    landing: [`${SESS()} , e AS (SELECT sid, path FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND entry = 1)
        SELECT e.path, COUNT(*) ss, SUM(CASE WHEN s.pv > 1 OR s.d >= 10000 THEN 1 ELSE 0 END) eng FROM e JOIN s USING (sid) GROUP BY e.path ORDER BY 2 DESC LIMIT 15`, f, t],
    daily: [`SELECT day, channel ch, COUNT(*) n FROM pageviews WHERE day BETWEEN ?1 AND ?2 AND entry = 1 GROUP BY 1, 2`, f, t],
    titles: [`SELECT path, MAX(title) t FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY path`, f, t],
  });
  return { range: { from: f, to: t }, ...r };
}

export async function actions(db, f, t) {
  const [pf, pt] = prevRange(f, t);
  const r = await run(db, {
    ...summaryDefs('c_', f, t),
    ...summaryDefs('p_', pf, pt),
    ...funnelDefs(f, t),
    daily: [`SELECT day, type, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 GROUP BY 1, 2`, f, t],
    dinq: [`SELECT created_day day, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    top: [`SELECT type, label, target, area, COUNT(*) n, COUNT(DISTINCT vid) v FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES}
        GROUP BY 1, 2, 3, 4 ORDER BY 5 DESC LIMIT 40`, f, t],
    byPage: [`SELECT path, SUM(CASE WHEN type = 'cta' THEN 1 ELSE 0 END) cta, SUM(CASE WHEN type = 'tel' THEN 1 ELSE 0 END) tel,
        SUM(CASE WHEN type = 'mail' THEN 1 ELSE 0 END) mail, SUM(CASE WHEN type = 'map' THEN 1 ELSE 0 END) map, COUNT(*) n
        FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY path ORDER BY n DESC LIMIT 15`, f, t],
    areas: [`SELECT COALESCE(area, 'body') k, COUNT(*) n FROM events WHERE day BETWEEN ?1 AND ?2 AND type IN ${CLICK_TYPES} GROUP BY 1 ORDER BY 2 DESC`, f, t],
    titles: [`SELECT path, MAX(title) t FROM pageviews WHERE day BETWEEN ?1 AND ?2 GROUP BY path`, f, t],
  });
  return {
    range: { from: f, to: t, prevFrom: pf, prevTo: pt },
    cur: summarize(r, 'c_'), prev: summarize(r, 'p_'), funnel: r.fn[0],
    daily: r.daily, dinq: r.dinq, top: r.top, byPage: r.byPage, areas: r.areas, titles: r.titles,
  };
}

export async function membersSummary(db, f, t) {
  const [pf, pt] = prevRange(f, t);
  const since30 = Date.now() - 30 * 86400000;
  const r = await run(db, {
    tot: [`SELECT COUNT(*) n, SUM(marketing) mk, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) act,
        SUM(CASE WHEN last_login >= ?1 THEN 1 ELSE 0 END) recent FROM members`, since30],
    cur: [`SELECT COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2`, f, t],
    prev: [`SELECT COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2`, pf, pt],
    withInq: [`SELECT COUNT(DISTINCT member_id) n FROM inquiries WHERE member_id IS NOT NULL`],
    daily: [`SELECT created_day day, COUNT(*) n FROM members WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    who: [`SELECT COALESCE(who, '') k, COUNT(*) n FROM members GROUP BY 1 ORDER BY 2 DESC`],
    ch: [`SELECT COALESCE(channel, 'unknown') k, COUNT(*) n FROM members GROUP BY 1 ORDER BY 2 DESC`],
    interest: [`SELECT interest FROM members WHERE interest IS NOT NULL AND interest != ''`],
    visits: [`SELECT COUNT(DISTINCT member_id) n, COUNT(*) pv FROM pageviews WHERE member_id IS NOT NULL AND day BETWEEN ?1 AND ?2`, f, t],
  });
  const tally = {};
  r.interest.forEach((m) => String(m.interest).split(',').forEach((k) => { k = k.trim(); if (k) tally[k] = (tally[k] || 0) + 1; }));
  const tot = r.tot[0] || {};
  return {
    range: { from: f, to: t, prevFrom: pf, prevTo: pt },
    total: tot.n || 0, marketing: tot.mk || 0, active: tot.act || 0, recentLogin: tot.recent || 0,
    newCur: r.cur[0]?.n || 0, newPrev: r.prev[0]?.n || 0, withInquiry: r.withInq[0]?.n || 0,
    visiting: r.visits[0]?.n || 0, memberPv: r.visits[0]?.pv || 0,
    daily: r.daily, who: r.who, channel: r.ch,
    interest: Object.entries(tally).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n),
  };
}

export async function leadsSummary(db, f, t) {
  const [pf, pt] = prevRange(f, t);
  const r = await run(db, {
    status: [`SELECT status k, COUNT(*) n FROM inquiries GROUP BY 1`],
    cur: [`SELECT COUNT(*) n, AVG(CASE WHEN first_contact_at IS NOT NULL THEN first_contact_at - created_at END) resp,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) won FROM inquiries WHERE created_day BETWEEN ?1 AND ?2`, f, t],
    prev: [`SELECT COUNT(*) n, AVG(CASE WHEN first_contact_at IS NOT NULL THEN first_contact_at - created_at END) resp,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) won FROM inquiries WHERE created_day BETWEEN ?1 AND ?2`, pf, pt],
    daily: [`SELECT created_day day, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1`, f, t],
    who: [`SELECT COALESCE(who, '') k, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
    space: [`SELECT COALESCE(space, '') k, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
    ch: [`SELECT COALESCE(channel, 'unknown') k, COUNT(*) n FROM inquiries WHERE created_day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY 2 DESC`, f, t],
  });
  return { range: { from: f, to: t, prevFrom: pf, prevTo: pt }, ...r, cur: r.cur[0] || {}, prev: r.prev[0] || {} };
}

export async function realtime(db) {
  const now = Date.now();
  const r = await run(db, {
    a5: [`SELECT COUNT(DISTINCT vid) n FROM pageviews WHERE ts > ?1 OR last_ts > ?1`, now - 5 * 60000],
    a30: [`SELECT COUNT(DISTINCT vid) n, COUNT(*) pv FROM pageviews WHERE ts > ?1`, now - 30 * 60000],
    pages: [`WITH l AS (SELECT vid, path, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts DESC) rn FROM pageviews WHERE ts > ?1)
        SELECT path, COUNT(*) n FROM l WHERE rn = 1 GROUP BY path ORDER BY 2 DESC LIMIT 6`, now - 30 * 60000],
    perMin: [`SELECT (ts / 60000) m, COUNT(*) n FROM pageviews WHERE ts > ?1 GROUP BY 1`, now - 30 * 60000],
    feedPv: [`SELECT ts, path, title, channel, source, device, entry, member_id FROM pageviews ORDER BY ts DESC LIMIT 12`],
    feedEv: [`SELECT ts, type, label, path FROM events WHERE type NOT IN ('menu') ORDER BY ts DESC LIMIT 12`],
    feedInq: [`SELECT id, created_at ts, name, space FROM inquiries ORDER BY created_at DESC LIMIT 3`],
    titles: [`SELECT path, MAX(title) t FROM pageviews WHERE ts > ?1 GROUP BY path`, now - 30 * 60000],
  });
  return { now, active5: r.a5[0]?.n || 0, active30: r.a30[0]?.n || 0, pv30: r.a30[0]?.pv || 0, pages: r.pages, titles: r.titles, perMin: r.perMin, feedPv: r.feedPv, feedEv: r.feedEv, feedInq: r.feedInq };
}
