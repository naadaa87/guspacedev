/**
 * 지유공간개발 홈페이지 서버 공통 모듈 (Cloudflare Pages Functions)
 *
 * - 데이터 저장소: Cloudflare D1 (바인딩 이름 DB)
 * - 표는 처음 요청이 들어올 때 자동으로 만들어집니다. 콘솔에서 SQL을 실행할 필요가 없습니다.
 * - 이 폴더(_lib)의 파일은 주소(라우트)가 되지 않는 공용 코드입니다.
 */

export const KST = 9 * 3600 * 1000;
export const enc = new TextEncoder();

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function kstParts(ts = Date.now()) {
  const d = new Date(ts + KST);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours(), dow: d.getUTCDay() };
}

export const clean = (v, max = 2000) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max).trim();

/* ------------------------------------------------------------------ schema */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pageviews (
    pid TEXT PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, dow INTEGER NOT NULL,
    vid TEXT NOT NULL, sid TEXT NOT NULL, path TEXT NOT NULL, title TEXT, grp TEXT,
    ref TEXT, channel TEXT, source TEXT, campaign TEXT, term TEXT,
    device TEXT, browser TEXT, os TEXT, country TEXT, region TEXT, city TEXT,
    new_visitor INTEGER DEFAULT 0, entry INTEGER DEFAULT 0, member_id INTEGER,
    dur INTEGER DEFAULT 0, scroll INTEGER DEFAULT 0, last_ts INTEGER)`,
  `CREATE INDEX IF NOT EXISTS pv_day ON pageviews(day)`,
  `CREATE INDEX IF NOT EXISTS pv_ts ON pageviews(ts)`,
  `CREATE INDEX IF NOT EXISTS pv_sid ON pageviews(sid)`,
  `CREATE INDEX IF NOT EXISTS pv_vid ON pageviews(vid, ts)`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL,
    vid TEXT, sid TEXT, pid TEXT, path TEXT, type TEXT NOT NULL, label TEXT, target TEXT, area TEXT)`,
  `CREATE INDEX IF NOT EXISTS ev_day ON events(day, type)`,
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL,
    name TEXT, company TEXT, phone TEXT, who TEXT, interest TEXT, location TEXT,
    marketing INTEGER DEFAULT 0, status TEXT DEFAULT 'active', memo TEXT,
    vid TEXT, channel TEXT, source TEXT,
    created_at INTEGER NOT NULL, created_day TEXT NOT NULL, last_login INTEGER, login_count INTEGER DEFAULT 0, updated_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS members_day ON members(created_day)`,
  `CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, created_day TEXT NOT NULL,
    name TEXT, phone TEXT, email TEXT, who TEXT, location TEXT, space TEXT, size TEXT, message TEXT,
    page TEXT, vid TEXT, sid TEXT, channel TEXT, source TEXT, landing TEXT, member_id INTEGER,
    status TEXT DEFAULT 'new', memo TEXT, first_contact_at INTEGER, mailed INTEGER DEFAULT 0, updated_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS inq_day ON inquiries(created_day)`,
  `CREATE INDEX IF NOT EXISTS inq_vid ON inquiries(vid)`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS attempts (k TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS attempts_k ON attempts(k, ts)`,
  `CREATE TABLE IF NOT EXISTS resets (token_hash TEXT PRIMARY KEY, member_id INTEGER NOT NULL, expires INTEGER NOT NULL)`,
];

let schemaReady = null;
export function ensureSchema(env) {
  if (!env.DB) return Promise.resolve(false);
  if (!schemaReady) {
    schemaReady = env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s.replace(/\s+/g, ' '))))
      .then(() => true)
      .catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

/* ------------------------------------------------------------------ crypto */
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const randomHex = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }

const b64u = {
  enc(bytes) { let s = ''; new Uint8Array(bytes).forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); },
};

let secretCache = null;
async function getSecret(env) {
  if (secretCache) return secretCache;
  if (env.DB) {
    await ensureSchema(env);
    let row = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind('secret').first();
    if (!row) {
      await env.DB.prepare('INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)').bind('secret', randomHex(32)).run();
      row = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind('secret').first();
    }
    secretCache = row.v;
  } else {
    secretCache = await sha256('gu-fallback|' + (env.ADMIN_PASSWORD || 'none'));
  }
  return secretCache;
}

async function hmacKey(env, purpose) {
  let material = (await getSecret(env)) + '|' + purpose;
  // 관리자 세션은 비밀번호가 바뀌면 자동으로 모두 만료되도록 비밀번호 해시를 키에 섞습니다.
  if (purpose === 'admin') material += '|' + (await sha256(env.ADMIN_PASSWORD || ''));
  return crypto.subtle.importKey('raw', enc.encode(material), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(env, purpose, payload) {
  const body = b64u.enc(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env, purpose), enc.encode(body));
  return body + '.' + b64u.enc(sig);
}

export async function verifyToken(env, purpose, token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env, purpose), b64u.dec(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64u.dec(body)));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

/** 비밀번호를 그대로 비교하지 않고 같은 키로 HMAC을 만든 뒤 비교합니다(시간차 공격 방지). */
export async function safeEqual(a, b) {
  const k = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [x, y] = await Promise.all([crypto.subtle.sign('HMAC', k, enc.encode(String(a))), crypto.subtle.sign('HMAC', k, enc.encode(String(b)))]);
  return hex(x) === hex(y);
}

export async function hashPassword(password, saltHex = randomHex(16)) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(saltHex), iterations: 100000 }, key, 256);
  return { hash: hex(bits), salt: saltHex };
}

/* ------------------------------------------------------------------ cookies */
export function cookies(request) {
  const out = {};
  (request.headers.get('Cookie') || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function setCookie(name, value, maxAgeSec, request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export const ADMIN_COOKIE = 'gu_admin';
export const MEMBER_COOKIE = 'gu_member';

export async function adminSession(env, request) {
  if (!env.ADMIN_PASSWORD) return null;
  return verifyToken(env, 'admin', cookies(request)[ADMIN_COOKIE]);
}

export async function memberSession(env, request) {
  const c = cookies(request)[MEMBER_COOKIE];
  if (!c) return null;
  return verifyToken(env, 'member', c);
}

/* ------------------------------------------------------------------ rate limit */
export async function clientKey(env, request, prefix) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'local';
  return prefix + ':' + (await sha256((await getSecret(env)) + '|' + ip)).slice(0, 24);
}

export async function tooManyAttempts(env, key, limit = 5, windowMs = 15 * 60 * 1000) {
  if (!env.DB) return false;
  const row = await env.DB.prepare('SELECT COUNT(*) n FROM attempts WHERE k = ? AND ts > ?').bind(key, Date.now() - windowMs).first();
  return (row?.n || 0) >= limit;
}

export async function recordAttempt(env, key) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO attempts (k, ts) VALUES (?, ?)').bind(key, Date.now()),
    env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(Date.now() - 86400000),
  ]);
}

/* ------------------------------------------------------------------ visitors */
const BOT = /bot|crawl|spider|slurp|yeti|daumoa|bingpreview|facebookexternalhit|kakaotalk-scrap|headless|lighthouse|pagespeed|gtmetrix|curl|wget|python|axios|node-fetch|go-http|java\/|preview|monitor|uptime/i;
export const isBot = (ua) => !ua || BOT.test(ua);

export function uaInfo(ua = '') {
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'tablet' : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'mobile' : 'desktop';
  const browser =
    /KAKAOTALK/i.test(ua) ? '카카오톡 앱' :
    /NAVER\(inapp|NAVER\//i.test(ua) ? '네이버 앱' :
    /Instagram/i.test(ua) ? '인스타그램 앱' :
    /FBAN|FBAV/i.test(ua) ? '페이스북 앱' :
    /Whale\//i.test(ua) ? '웨일' :
    /SamsungBrowser/i.test(ua) ? '삼성 인터넷' :
    /Edg\//i.test(ua) ? 'Edge' :
    /OPR\//i.test(ua) ? 'Opera' :
    /Firefox\//i.test(ua) ? 'Firefox' :
    /CriOS|Chrome\//i.test(ua) ? 'Chrome' :
    /Safari\//i.test(ua) ? 'Safari' : '기타';
  const os =
    /Windows/i.test(ua) ? 'Windows' :
    /iPhone|iPad|iPod/i.test(ua) ? 'iOS' :
    /Android/i.test(ua) ? 'Android' :
    /Mac OS X|Macintosh/i.test(ua) ? 'macOS' :
    /CrOS/i.test(ua) ? 'ChromeOS' :
    /Linux/i.test(ua) ? 'Linux' : '기타';
  return { device, browser, os };
}

/** 유입 경로 분류: search(검색) · social(SNS·커뮤니티) · referral(다른 사이트) · campaign(캠페인·광고) · direct(직접) · internal(사이트 안 이동) */
export function classify(refUrl, selfHost, utm = {}, ua = '') {
  let host = '', term = '';
  try {
    if (refUrl) {
      const u = new URL(refUrl);
      host = u.hostname.replace(/^www\./, '').toLowerCase();
      term = u.searchParams.get('query') || u.searchParams.get('q') || u.searchParams.get('wd') || '';
    }
  } catch { /* ignore */ }
  const self = (selfHost || '').replace(/^www\./, '').toLowerCase();
  const res = (channel, source) => ({ channel, source, ref: host || null, term: clean(term, 80) || null });

  if (utm.source || utm.medium) {
    const m = (utm.medium || '').toLowerCase();
    const src = clean(utm.source || host || 'campaign', 60).toLowerCase();
    // 광고·이메일·QR 등은 '캠페인', SNS 게시물 링크는 'SNS'로 봅니다.
    if (!/cpc|ppc|paid|display|banner/.test(m) && /social|sns|insta|kakao|blog|band|facebook|youtube/.test(m + ' ' + src)) return res('social', src);
    return res('campaign', src);
  }
  if (host && self && (host === self || host.endsWith('.' + self))) return res('internal', 'internal');
  if (host) {
    if (/^(m\.)?search\.naver\.com$/.test(host) || host === 'naver.com' || host === 'm.naver.com') return res('search', 'naver');
    if (/(^|\.)blog\.naver\.com$/.test(host)) return res('social', 'naver-blog');
    if (/(^|\.)cafe\.naver\.com$/.test(host)) return res('social', 'naver-cafe');
    if (/(^|\.)(map|m\.map|place)\.naver\.com$/.test(host)) return res('referral', 'naver-map');
    if (/naver\.com$/.test(host)) return res('search', 'naver');
    if (/(^|\.)google\.[a-z.]+$/.test(host) || host === 'com.google.android.googlequicksearchbox') return res('search', 'google');
    if (/(^|\.)daum\.net$/.test(host)) return res(/cafe\./.test(host) ? 'social' : 'search', /cafe\./.test(host) ? 'daum-cafe' : 'daum');
    if (/(^|\.)bing\.com$/.test(host)) return res('search', 'bing');
    if (/(^|\.)zum\.com$/.test(host)) return res('search', 'zum');
    if (/(^|\.)(yahoo|duckduckgo|ecosia|baidu)\./.test(host)) return res('search', host.split('.').slice(-2, -1)[0]);
    if (/kakao/.test(host)) return res('social', 'kakao');
    if (/instagram\.com$/.test(host)) return res('social', 'instagram');
    if (/facebook\.com$|fb\.com$/.test(host)) return res('social', 'facebook');
    if (/youtube\.com$|youtu\.be$/.test(host)) return res('social', 'youtube');
    if (/(^|\.)t\.co$|twitter\.com$|(^|\.)x\.com$/.test(host)) return res('social', 'x');
    if (/threads\.net$/.test(host)) return res('social', 'threads');
    if (/linkedin\.com$|lnkd\.in$/.test(host)) return res('social', 'linkedin');
    if (/band\.us$/.test(host)) return res('social', 'band');
    if (/tistory\.com$|brunch\.co\.kr$|velog\.io$/.test(host)) return res('social', host.split('.').slice(-2).join('.'));
    return res('referral', host);
  }
  if (/KAKAOTALK/i.test(ua)) return res('social', 'kakao');
  if (/Instagram/i.test(ua)) return res('social', 'instagram');
  if (/FBAN|FBAV/i.test(ua)) return res('social', 'facebook');
  if (/NAVER\(inapp/i.test(ua)) return res('search', 'naver');
  return res('direct', 'direct');
}

export function normPath(p) {
  let s = String(p || '/');
  try { s = decodeURIComponent(s); } catch { /* keep */ }
  s = s.split('?')[0].split('#')[0].replace(/\/{2,}/g, '/');
  s = s.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (s.length > 1) s = s.replace(/\/$/, '');
  if (!s.startsWith('/')) s = '/' + s;
  return s.slice(0, 200);
}

export function pageGroup(path) {
  if (path === '/') return 'home';
  const seg = path.split('/')[1] || '';
  if (['about', 'process', 'clients', 'contact', 'privacy'].includes(seg)) return seg;
  if (seg === 'business') return 'business';
  if (seg === 'insights') return 'insights';
  if (seg === 'member') return 'member';
  return 'etc';
}

/** 같은 출처에서 온 요청인지 확인 (다른 사이트에서 방문 기록을 위조해 보내는 것을 막습니다) */
export function sameOrigin(request) {
  const host = new URL(request.url).host;
  const origin = request.headers.get('Origin');
  if (origin) { try { return new URL(origin).host === host; } catch { return false; } }
  const ref = request.headers.get('Referer');
  if (ref) { try { return new URL(ref).host === host; } catch { return false; } }
  return false;
}

/** 방문자의 첫 유입 경로와 첫 방문 페이지 (상담 신청·회원가입 기여 분석용) */
export async function firstTouch(env, vid) {
  if (!env.DB || !vid) return { channel: null, source: null, landing: null };
  const row = await env.DB.prepare('SELECT channel, source, path FROM pageviews WHERE vid = ? ORDER BY ts ASC LIMIT 1').bind(vid).first();
  return row ? { channel: row.channel, source: row.source, landing: row.path } : { channel: null, source: null, landing: null };
}

export async function logEvent(env, e) {
  if (!env.DB) return;
  const { day } = kstParts();
  await env.DB.prepare('INSERT INTO events (ts, day, vid, sid, pid, path, type, label, target, area) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(Date.now(), day, e.vid || null, e.sid || null, null, e.path || null, e.type, e.label || null, e.target || null, e.area || 'server')
    .run();
}

export async function sendMail(env, { to, subject, text, html, replyTo }) {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'not-configured' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : String(to).split(',').map((s) => s.trim()),
      reply_to: replyTo || undefined,
      subject, text, html,
    }),
  });
  if (!res.ok) return { ok: false, error: 'send-failed', detail: (await res.text().catch(() => '')).slice(0, 300) };
  return { ok: true };
}

export const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
