import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyAdmission } from './admission.mjs';
import { demoCandidates, ticketmasterCandidates, geminiCandidates, makePartner, chooseOffer, safePublicUrl, cleanText } from './providers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COOKIE = 'nes_session';
const HOUR = 3600000;
const STEPS = [
  ['scan', 'Scan the city'], ['check', 'Check the details'], ['match', 'Find your opening'], ['reveal', 'Your seat is ready']
];
const toMoney = dollars => Math.round(dollars * 100);
const dayFor = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export function readConfig(overrides = {}) {
  let disk = {};
  try { disk = JSON.parse(readFileSync(resolve(ROOT, 'config.json'), 'utf8')); } catch {}
  const env = process.env;
  const config = {
    mode: env.APP_MODE || disk.mode || 'demo', sponsorName: env.SPONSOR_NAME || disk.sponsorName || 'Google',
    geminiKey: env.GEMINI_API_KEY || '', geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash', ticketmasterKey: env.TICKETMASTER_API_KEY || '',
    partnerUrl: env.SPONSOR_API_URL || '', partnerToken: env.SPONSOR_API_TOKEN || '', admissionSecret: env.ADMISSION_SECRET || '',
    maxClaim: Number(env.MAX_CLAIM_USD || 250), dailyBudget: Number(env.DAILY_BUDGET_USD || 2500),
    production: env.NODE_ENV === 'production', publicOrigin: env.PUBLIC_ORIGIN || '',
    ...overrides
  };
  if (!['demo', 'live'].includes(config.mode)) throw new Error('APP_MODE must be demo or live.');
  if (!Number.isFinite(config.maxClaim) || config.maxClaim < 0 || !Number.isFinite(config.dailyBudget) || config.dailyBudget < 0) throw new Error('Sponsor budget values must be nonnegative numbers.');
  if (config.production && !safePublicUrl(config.publicOrigin)) throw new Error('Set PUBLIC_ORIGIN to the production public HTTPS origin.');
  return config;
}

function apiError(status, message) { const error = new Error(message); error.status = status; return error; }

export function createApp(options = {}) {
  const config = readConfig(options.config);
  const now = options.now || Date.now;
  const providers = options.providers || {};
  const delayMs = options.searchDelayMs ?? (config.mode === 'demo' ? 7500 : 0);
  const bookingDelayMs = options.bookingDelayMs ?? 1600;
  const dbPath = options.dbPath || process.env.DATABASE_PATH || resolve(ROOT, 'data/no-empty-seats.sqlite');
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, hunt_id TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hunts (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admissions (nonce TEXT PRIMARY KEY, hunt_id TEXT NOT NULL, used_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS payments (hunt_id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL, cents INTEGER NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS payment_day ON payments(day);
  `);
  let closed = false;
  const running = new Set(), timers = new Set(), rate = new Map();
  const partnerCredentials = !!(config.partnerUrl && config.partnerToken);
  const sponsorReady = !!((providers.partner || partnerCredentials) && config.admissionSecret.length >= 32 && config.maxClaim > 0 && config.dailyBudget > 0);
  // Cloud Run's writable container disk is ephemeral; this SQLite edition cannot safely fund claims there.
  if (config.mode === 'live' && sponsorReady && process.env.K_SERVICE) throw new Error('Sponsored claims require this SQLite edition to run on one persistent-disk Node instance. Cloud Run supports demo/discovery only.');
  const partner = sponsorReady ? providers.partner || makePartner(config) : null;
  const discoveryReady = config.mode === 'demo' || !!(partner || providers.discover || config.geminiKey || config.ticketmasterKey);
  const admissionRequired = config.mode === 'live' && !!partner;

  function save(hunt) {
    if (closed) return;
    db.prepare('INSERT INTO hunts(id, session_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').run(hunt.id, hunt.sessionId, JSON.stringify(hunt), now());
  }
  function get(id) {
    const row = db.prepare('SELECT data FROM hunts WHERE id=?').get(id);
    return row ? JSON.parse(row.data) : null;
  }
  function task(promise) { running.add(promise); promise.finally(() => running.delete(promise)).catch(() => {}); }
  function sleep(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolveSleep => { const entry = { handle: null, resolve: resolveSleep }; entry.handle = setTimeout(() => { timers.delete(entry); resolveSleep(); }, ms); timers.add(entry); });
  }
  function step(hunt, index, detail, status = 'active') {
    hunt.steps = STEPS.map(([id, label], i) => ({ id, label, status: i < index ? 'done' : i === index ? status : 'pending', detail: i === index ? detail : hunt.steps?.[i]?.detail || '' }));
    save(hunt);
  }
  function publicHunt(hunt) {
    const clone = structuredClone(hunt);
    delete clone.sessionId; delete clone.request; delete clone.providerError; delete clone.admissionNonce;
    if (clone.offer) delete clone.offer.providerOfferId;
    return clone;
  }
  function fail(hunt, message, status = 'failed') {
    hunt.state = status; hunt.error = message;
    for (const item of hunt.steps) if (item.status === 'active') item.status = 'failed';
    save(hunt);
  }

  // A stopped worker cannot know whether a remote confirmation charged. Never auto-retry it.
  for (const row of db.prepare("SELECT data FROM hunts").all()) {
    const hunt = JSON.parse(row.data);
    if (hunt.state === 'booking') {
      const payment = db.prepare('SELECT * FROM payments WHERE hunt_id=?').get(hunt.id);
      if (payment) db.prepare("UPDATE payments SET status='unknown',updated_at=? WHERE hunt_id=?").run(now(), hunt.id);
      hunt.receipt = { id: payment?.idempotency_key || hunt.id, status: 'review_required', message: 'Confirmation was interrupted. The event team must check the order before trying again.' };
      fail(hunt, 'Confirmation needs a human check. Your one chance is saved.');
    } else if (hunt.state === 'searching') {
      fail(hunt, 'The search was interrupted. Please ask the event team for help.');
    }
  }

  async function runSearch(hunt) {
    try {
      step(hunt, 0, config.mode === 'demo' ? 'Opening six simulated city feeds' : 'Searching current NYC event sources');
      const workStarted = Date.now();
      let candidates = [], providerWarnings = [];
      if (config.mode === 'demo') {
        await sleep(delayMs * .36);
        candidates = demoCandidates(hunt.request, now());
      } else if (providers.discover) {
        candidates = await providers.discover(hunt.request, now());
      } else {
        const jobs = [];
        // A funded activation draws from contracted stock. Public listings are discovery-only.
        if (partner) jobs.push(partner.list(hunt.request, now()));
        else {
          if (config.ticketmasterKey) jobs.push(ticketmasterCandidates(config, hunt.request, now()));
          if (config.geminiKey) jobs.push(geminiCandidates(config, hunt.request, now()));
        }
        const results = await Promise.allSettled(jobs);
        for (const result of results) if (result.status === 'fulfilled') candidates.push(...result.value); else providerWarnings.push('A configured source could not be reached.');
      }
      if (closed) return;
      step(hunt, 1, config.mode === 'demo' ? `${candidates.length} sample possibilities · times and party size checked` : `${candidates.length} dated listings found · checking your requirements`);
      await sleep(config.mode === 'demo' ? delayMs * .30 : 0);
      if (closed) return;
      const deduped = [...new Map(candidates.map(offer => [`${offer.title}|${offer.startsAt}|${offer.venue}`, offer])).values()];
      // Fulfillment and provider-controlled inventory are never inferred by the language model.
      candidates = deduped.filter(offer => {
        const starts = Date.parse(offer.startsAt);
        return offer.quantity === hunt.request.partySize && starts >= now() + 40 * 60000 && starts <= now() + 24 * HOUR && ['demo', 'partner', 'external'].includes(offer.fulfillment);
      });
      step(hunt, 2, config.mode === 'demo' ? 'One random opening · your draw is being sealed' : 'Choosing one opening at random');
      await sleep(Math.max(0, delayMs - (Date.now() - workStarted)));
      if (closed) return;
      if (!candidates.length) {
        const strictTicketmasterOnly = config.mode === 'live' && !providers.discover && !partner && config.ticketmasterKey && !config.geminiKey && (hunt.request.stepFree || !hunt.request.adultsOnly);
        if (strictTicketmasterOnly && !providerWarnings.length) {
          const requirements = [hunt.request.stepFree ? 'step-free access' : '', !hunt.request.adultsOnly ? 'all-ages admission' : ''].filter(Boolean).join(' and ');
          fail(hunt, `The connected event feed cannot verify ${requirements}. Your requirements were kept. Ask the event team for a confirmed match.`, 'empty');
          return;
        }
        fail(hunt, providerWarnings.length ? 'Live sources could not return a usable event. Ask the event team to check the connection.' : 'No matching opening was found in the next 24 hours. Your requirements were kept.', 'empty');
        return;
      }
      hunt.offer = chooseOffer(candidates);
      hunt.offer.expiresAt = new Date(now() + 120000).toISOString();
      hunt.state = 'offer'; hunt.revealedAt = new Date(now()).toISOString();
      step(hunt, 3, hunt.offer.fulfillment === 'external' ? 'A live listing · availability needs seller confirmation' : config.mode === 'demo' ? 'Sample seat selected · simulation only' : 'Sponsor inventory selected · confirmed on acceptance', 'done');
    } catch {
      if (!closed) fail(hunt, 'The search could not finish. Please ask the event team to check the connection.');
    }
  }

  function reserveBudget(hunt) {
    const cents = toMoney(hunt.offer.priceTotal), day = dayFor(now());
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > toMoney(config.maxClaim)) throw apiError(409, 'This offer exceeds the sponsor’s per-claim limit.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const total = db.prepare("SELECT COALESCE(SUM(cents),0) AS total FROM payments WHERE day=? AND status IN ('reserved','confirming','confirmed','unknown')").get(day).total;
      if (total + cents > toMoney(config.dailyBudget)) throw apiError(409, 'The sponsor’s daily allocation has been reached.');
      db.prepare('INSERT INTO payments(hunt_id,idempotency_key,cents,day,status,updated_at) VALUES(?,?,?,?,?,?)').run(hunt.id, `nes-${hunt.id}`, cents, day, 'reserved', now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  async function fulfill(hunt) {
    let confirmationStarted = false;
    try {
      if (config.mode === 'demo') {
        await sleep(bookingDelayMs);
        if (closed) return;
        hunt.state = 'confirmed';
        hunt.receipt = { id: `DEMO-${hunt.id.slice(0, 8).toUpperCase()}`, status: 'sample', message: 'Sample pass — not valid for admission. No purchase was made.' };
        save(hunt); return;
      }
      const key = `nes-${hunt.id}`, offer = hunt.offer;
      const hold = await partner.reserve({ offerId: offer.providerOfferId, quantity: offer.quantity, maxTotal: offer.priceTotal, currency: 'USD', idempotencyKey: `${key}-hold` });
      if (closed) return;
      if (hold?.status !== 'held' || !cleanText(hold.holdId, 300) || !Number.isFinite(hold.priceTotal) || hold.currency !== 'USD' || hold.quantity !== offer.quantity || toMoney(hold.priceTotal) > toMoney(offer.priceTotal) || hold.priceTotal < 0 || !(Date.parse(hold.expiresAt) > now() + 15000)) throw apiError(409, 'The seat could not be held at the quoted price.');
      offer.availability = 'held'; offer.priceTotal = hold.priceTotal; offer.seatLabel = cleanText(hold.seatLabel) || offer.seatLabel;
      save(hunt);
      db.prepare("UPDATE payments SET status='confirming',updated_at=? WHERE hunt_id=?").run(now(), hunt.id);
      confirmationStarted = true;
      const result = await partner.confirm({ holdId: hold.holdId, quantity: offer.quantity, maxTotal: hold.priceTotal, currency: 'USD', idempotencyKey: key });
      if (closed) return;
      if (result?.status === 'failed' && result?.charged === false) { const error = new Error('The seller could not confirm this seat. No payment was taken.'); error.definiteFailure = true; throw error; }
      const deliveryUrl = safePublicUrl(result?.deliveryUrl);
      if (result?.status !== 'confirmed' || !cleanText(result.orderId, 200) || !deliveryUrl || result.currency !== 'USD' || result.quantity !== offer.quantity || !Number.isFinite(result.priceTotal) || result.priceTotal < 0 || toMoney(result.priceTotal) > toMoney(hold.priceTotal)) throw new Error('Confirmation response needs reconciliation.');
      db.prepare("UPDATE payments SET status='confirmed',cents=?,updated_at=? WHERE hunt_id=?").run(toMoney(result.priceTotal), now(), hunt.id);
      hunt.state = 'confirmed'; hunt.offer.priceTotal = result.priceTotal;
      hunt.receipt = { id: cleanText(result.orderId, 200), status: 'confirmed', deliveryUrl, message: `Your ${offer.quantity === 1 ? 'ticket is' : 'tickets are'} paid for by ${cleanText(config.sponsorName)}.` };
      save(hunt);
    } catch (error) {
      if (closed) return;
      const unknown = confirmationStarted && !error.definiteFailure;
      db.prepare('UPDATE payments SET status=?,updated_at=? WHERE hunt_id=?').run(unknown ? 'unknown' : 'failed', now(), hunt.id);
      hunt.receipt = { id: `nes-${hunt.id}`, status: unknown ? 'review_required' : 'failed', message: unknown ? 'The seller’s response is uncertain. The event team must check this order. Do not attempt another purchase.' : 'The seat could not be confirmed. No payment was taken.' };
      fail(hunt, unknown ? 'Confirmation needs a human check. Your one chance is saved.' : 'This opening is no longer available. Please see the event team.');
    }
  }

  function session(req, res) {
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    let id = cookie && /^[a-f0-9]{48}$/.test(cookie) ? cookie : null;
    let row = id ? db.prepare('SELECT * FROM sessions WHERE id=?').get(id) : null;
    if (!row) {
      id = randomBytes(24).toString('hex');
      db.prepare('INSERT INTO sessions(id, created_at) VALUES (?,?)').run(id, now());
      row = { id, hunt_id: null };
      res.setHeader('Set-Cookie', `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${config.production ? '; Secure' : ''}`);
    }
    return row;
  }
  function checkOrigin(req) {
    const origin = req.headers.origin, fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site') throw apiError(403, 'Cross-site requests are not allowed.');
    if (origin) {
      let allowed = false;
      try {
        const parsed = new URL(origin);
        // Development previews may terminate TLS at a reverse proxy. Trust only the
        // actual Host header, never forwarded-host headers. Production uses the
        // explicit public origin required by readConfig.
        allowed = config.publicOrigin
          ? origin === new URL(config.publicOrigin).origin
          : ['http:', 'https:'].includes(parsed.protocol) && parsed.origin === origin && parsed.host === req.headers.host;
      } catch {}
      if (!allowed) throw apiError(403, 'Origin does not match this activation.');
    }
    // Native/CLI integrations may omit Origin. Browsers with cross-site metadata are rejected above.
  }
  function throttle(req, path) {
    const ip = req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${path === '/api/hunts' ? 'hunt' : 'api'}`;
    const limit = path === '/api/hunts' ? 30 : 1200;
    const row = rate.get(key);
    if (!row || now() - row.at >= 60000) rate.set(key, { at: now(), count: 1 });
    else if (++row.count > limit) throw apiError(429, 'Too many requests. Try again in a minute.');
    if (rate.size > 10000) for (const [k, v] of rate) if (now() - v.at > 60000) rate.delete(k);
  }
  async function body(req) {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw apiError(415, 'Use application/json.');
    let data = '', size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 8192) throw apiError(413, 'Request is too large.'); data += chunk; }
    try { const value = data ? JSON.parse(data) : {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
    catch { throw apiError(400, 'Invalid JSON request.'); }
  }
  function send(res, status, value) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value));
  }

  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' blob:; frame-ancestors 'self' https://aistudio.google.com; base-uri 'self'; form-action 'self'");
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const url = new URL(req.url, 'http://localhost'), path = url.pathname;
      if (path === '/healthz') return send(res, 200, { ok: true });
      if (!path.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw apiError(405, 'Method not allowed.');
        let decoded;
        try { decoded = decodeURIComponent(path); } catch { throw apiError(400, 'Invalid path.'); }
        const publicDir = resolve(ROOT, 'public');
        const file = resolve(publicDir, `.${decoded === '/' ? '/index.html' : decoded}`);
        if (!file.startsWith(publicDir + sep) || decoded.includes('\0')) throw apiError(404, 'Not found.');
        let content;
        try { content = await fs.readFile(file); } catch { throw apiError(404, 'Not found.'); }
        const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }[extname(file)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }); return res.end(req.method === 'HEAD' ? undefined : content);
      }
      throttle(req, path);
      if (req.method !== 'GET') checkOrigin(req);
      const currentSession = session(req, res);
      if (req.method === 'GET' && path === '/api/config') return send(res, 200, {
        mode: config.mode, sponsorName: cleanText(config.sponsorName), admissionRequired, discoveryReady, sponsorReady,
        configured: { ticketmaster: !!config.ticketmasterKey, gemini: !!config.geminiKey, fulfillment: !!partner },
        setupMessage: discoveryReady ? partner || config.mode === 'demo' ? '' : 'Live discovery is connected. Sponsored ticket purchase needs a contracted inventory partner.' : 'Add GEMINI_API_KEY or TICKETMASTER_API_KEY to connect live discovery.',
        maxClaim: config.maxClaim, searchWindowHours: 24, minTravelMinutes: 45
      });
      if (req.method === 'GET' && path === '/api/session') {
        const hunt = currentSession.hunt_id ? get(currentSession.hunt_id) : null;
        return send(res, 200, { huntId: hunt?.id || null, hunt: hunt ? publicHunt(hunt) : null });
      }
      if (req.method === 'POST' && path === '/api/demo/reset') {
        await body(req);
        if (config.mode !== 'demo') throw apiError(404, 'Not found.');
        db.prepare('UPDATE sessions SET hunt_id=NULL WHERE id=?').run(currentSession.id);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/hunts') {
        const input = await body(req);
        // Reading the body yielded to other requests. A double tap may have started
        // this session's hunt in the meantime; always return its resumable id.
        const existingHuntId = db.prepare('SELECT hunt_id FROM sessions WHERE id=?').get(currentSession.id)?.hunt_id;
        if (existingHuntId) return send(res, 409, { error: 'Your one chance has already been used.', huntId: existingHuntId });
        if (!discoveryReady) throw apiError(503, 'Live discovery is not configured. Add a provider key on the server.');
        if (![1, 2].includes(input.partySize) || typeof input.stepFree !== 'boolean' || typeof input.adultsOnly !== 'boolean') throw apiError(400, 'Choose one or two seats and valid access preferences.');
        const admission = admissionRequired ? verifyAdmission(input.admissionCode, config.admissionSecret, now()) : null;
        if (admissionRequired && !admission) throw apiError(403, 'Enter a valid, unexpired event admission code.');
        const hunt = { id: randomUUID(), sessionId: currentSession.id, state: 'searching', createdAt: new Date(now()).toISOString(), steps: STEPS.map(([id, label]) => ({ id, label, status: 'pending', detail: '' })), request: { partySize: input.partySize, stepFree: input.stepFree, adultsOnly: input.adultsOnly } };
        db.exec('BEGIN IMMEDIATE');
        try {
          // Compare-and-set inside the transaction closes simultaneous start requests.
          const changed = db.prepare('UPDATE sessions SET hunt_id=? WHERE id=? AND hunt_id IS NULL').run(hunt.id, currentSession.id).changes;
          if (!changed) throw apiError(409, 'Your one chance has already been used.');
          if (admission) {
            if (db.prepare('SELECT nonce FROM admissions WHERE nonce=?').get(admission.nonce)) throw apiError(409, 'This event admission code has already been used.');
            db.prepare('INSERT INTO admissions(nonce,hunt_id,used_at) VALUES(?,?,?)').run(admission.nonce, hunt.id, now());
          }
          save(hunt); db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        task(runSearch(hunt));
        return send(res, 202, { id: hunt.id });
      }
      const match = path.match(/^\/api\/hunts\/([a-f0-9-]{36})(?:\/(accept|decline))?$/);
      if (match) {
        let hunt = get(match[1]);
        if (!hunt || hunt.sessionId !== currentSession.id) throw apiError(404, 'Opening not found.');
        if (req.method === 'GET' && !match[2]) return send(res, 200, publicHunt(hunt));
        if (req.method === 'POST' && match[2]) {
          await body(req);
          // Reload after body I/O: another request may already have decided the same offer.
          hunt = get(match[1]);
          if (match[2] === 'accept' && ['booking', 'confirmed'].includes(hunt.state)) return send(res, 200, publicHunt(hunt));
          if (match[2] === 'decline' && hunt.state === 'declined') return send(res, 200, publicHunt(hunt));
          if (hunt.state !== 'offer') throw apiError(409, 'This opening has already been decided.');
          if (Date.parse(hunt.offer.expiresAt) <= now()) { fail(hunt, 'This offer has expired. Please see the event team.'); throw apiError(409, 'This offer has expired.'); }
          if (match[2] === 'decline') {
            hunt.state = 'declined'; save(hunt); return send(res, 200, publicHunt(hunt));
          }
          if (hunt.offer.fulfillment === 'external') {
            hunt.state = 'confirmed'; hunt.receipt = { id: `listing-${hunt.id}`, status: 'external', deliveryUrl: safePublicUrl(hunt.offer.sourceUrl), message: 'Listing selected. No ticket has been held, paid for or purchased. Check availability with the seller.' }; save(hunt); return send(res, 200, publicHunt(hunt));
          }
          if (config.mode === 'live') {
            if (!partner || hunt.offer.fulfillment !== 'partner') throw apiError(409, 'Sponsored fulfillment is not connected.');
            reserveBudget(hunt);
          }
          hunt.state = 'booking'; save(hunt);
          task(fulfill(hunt));
          return send(res, 202, publicHunt(hunt));
        }
      }
      throw apiError(404, 'Not found.');
    } catch (error) {
      if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please see the event team.' });
      else res.end();
    }
  }
  handler.config = config;
  handler.close = async () => {
    closed = true;
    for (const timer of timers) { clearTimeout(timer.handle); timer.resolve(); }
    timers.clear();
    await Promise.allSettled([...running]);
    db.close();
  };
  return handler;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  const server = http.createServer(app);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`No Empty Seats · ${app.config.mode} · http://localhost:${port}`));
  const stop = () => { server.close(async () => { await app.close(); process.exit(0); }); server.closeIdleConnections(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
