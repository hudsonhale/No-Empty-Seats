import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.mjs';
import { issueAdmission, verifyAdmission } from '../server/admission.mjs';
import { safePublicUrl, geminiCandidates, ticketmasterCandidates } from '../server/providers.mjs';

const SECRET = 'test-secret-with-at-least-thirty-two-characters';
const fixtureTime = Date.parse('2026-10-04T16:00:00Z');
const offer = (overrides = {}) => ({ id: 'partner-test', providerOfferId: 'inventory-1', title: 'Test event', category: 'music', venue: 'Test venue', address: '1 Broadway, New York', startsAt: new Date(fixtureTime + 3 * 3600000).toISOString(), quantity: 1, priceTotal: 50, currency: 'USD', source: 'Contracted test inventory', sourceUrl: 'https://example.com/show', availability: 'listed', fulfillment: 'partner', ...overrides });
const defaultRequest = { partySize: 1, adultsOnly: true, stepFree: false };

async function serve(options = {}) {
  const app = createApp({ dbPath: ':memory:', searchDelayMs: 0, bookingDelayMs: 0, now: () => fixtureTime, config: { mode: 'demo', production: false, publicOrigin: '', geminiKey: '', ticketmasterKey: '', partnerUrl: '', partnerToken: '', admissionSecret: '', ...options.config }, ...options });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function request(path, data, extra = {}) {
    const response = await fetch(url + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(cookie ? { cookie } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: url }), ...extra }, body: data === undefined ? undefined : JSON.stringify(data) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, value: await response.json(), headers: response.headers };
  }
  return { app, server, url, request, setCookie(value) { cookie = value; }, getCookie() { return cookie; }, async stop() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await app.close(); } };
}

async function waitFor(client, id, state) {
  for (let i = 0; i < 60; i++) {
    const response = await client.request(`/api/hunts/${id}`);
    if (response.value.state === state) return response.value;
    if (response.value.state === 'failed' && state !== 'failed') assert.fail(response.value.error);
    await new Promise(resolve => setTimeout(resolve, 3));
  }
  assert.fail(`Did not reach ${state}`);
}

function partnerMock({ fail, unknown, priceTotal = 50 } = {}) {
  const calls = { reserve: 0, confirm: 0 };
  return { calls,
    async reserve() { calls.reserve++; return { status: 'held', holdId: 'hold-1', expiresAt: new Date(fixtureTime + 60000).toISOString(), priceTotal, currency: 'USD', quantity: 1 }; },
    async confirm(body) { calls.confirm++; assert.equal(body.idempotencyKey.startsWith('nes-'), true); if (unknown) throw new Error('network interrupted'); if (fail) return { status: 'failed', charged: false }; return { status: 'confirmed', orderId: 'order-1', deliveryUrl: 'https://tickets.example.com/claim/one', priceTotal, currency: 'USD', quantity: 1 }; }
  };
}
function liveOptions(partner, extra = {}) { return { config: { mode: 'live', production: false, publicOrigin: '', geminiKey: '', ticketmasterKey: '', partnerUrl: '', partnerToken: '', admissionSecret: SECRET, maxClaim: 100, dailyBudget: 100 }, providers: { partner, discover: async request => [offer({ quantity: request.partySize })] }, ...extra }; }

// These tests exercise behavior with mocked provider boundaries; no real purchase is attempted.
test('demo: one draw, idempotent accept, honest sample receipt, explicit reset', async t => {
  const client = await serve(); t.after(() => client.stop());
  const config = await client.request('/api/config');
  assert.equal(config.value.mode, 'demo'); assert.equal(config.value.admissionRequired, false);
  const created = await client.request('/api/hunts', defaultRequest);
  assert.equal(created.status, 202);
  const hunt = await waitFor(client, created.value.id, 'offer');
  assert.equal(hunt.offer.availability, 'sample'); assert.equal(hunt.offer.quantity, 1);
  assert.equal((await client.request('/api/hunts', defaultRequest)).status, 409);
  const accept = await client.request(`/api/hunts/${hunt.id}/accept`, {});
  assert.ok([200, 202].includes(accept.status));
  const result = await waitFor(client, hunt.id, 'confirmed');
  assert.equal(result.receipt.status, 'sample'); assert.match(result.receipt.message, /No purchase/);
  assert.equal((await client.request(`/api/hunts/${hunt.id}/accept`, {})).value.receipt.status, 'sample');
  assert.equal((await client.request('/api/session')).value.huntId, hunt.id);
  await client.request('/api/demo/reset', {});
  assert.equal((await client.request('/api/session')).value.huntId, null);
});

test('decline ends the chance; offers cannot be accepted afterward', async t => {
  const client = await serve(); t.after(() => client.stop());
  const start = await client.request('/api/hunts', defaultRequest), hunt = await waitFor(client, start.value.id, 'offer');
  assert.equal((await client.request(`/api/hunts/${hunt.id}/decline`, {})).value.state, 'declined');
  assert.equal((await client.request(`/api/hunts/${hunt.id}/accept`, {})).status, 409);
  assert.equal((await client.request('/api/hunts', defaultRequest)).status, 409);
});

test('live listing is explicitly external and never claimed as purchased', async t => {
  const client = await serve({ config: { mode: 'live' }, providers: { discover: async () => [offer({ fulfillment: 'external' })] } }); t.after(() => client.stop());
  const start = await client.request('/api/hunts', defaultRequest), hunt = await waitFor(client, start.value.id, 'offer');
  const result = await client.request(`/api/hunts/${hunt.id}/accept`, {});
  assert.equal(result.value.receipt.status, 'external'); assert.match(result.value.receipt.message, /No ticket has been held/);
  assert.equal((await client.request('/api/demo/reset', {})).status, 404);
});

test('live with no configured sources fails clearly and does not consume a chance', async t => {
  const client = await serve({ config: { mode: 'live', geminiKey: '', ticketmasterKey: '', partnerUrl: '', partnerToken: '' } }); t.after(() => client.stop());
  assert.equal((await client.request('/api/config')).value.discoveryReady, false);
  assert.equal((await client.request('/api/hunts', defaultRequest)).status, 503);
  assert.equal((await client.request('/api/session')).value.huntId, null);
});

test('sponsor fulfillment: signed admission, one payment under parallel accepts, verified delivery', async t => {
  const partner = partnerMock(), client = await serve(liveOptions(partner)); t.after(() => client.stop());
  assert.equal((await client.request('/api/config')).value.admissionRequired, true);
  assert.equal((await client.request('/api/hunts', defaultRequest)).status, 403);
  const code = issueAdmission(SECRET, { now: fixtureTime });
  const start = await client.request('/api/hunts', { ...defaultRequest, admissionCode: code }), hunt = await waitFor(client, start.value.id, 'offer');
  const responses = await Promise.all([client.request(`/api/hunts/${hunt.id}/accept`, {}), client.request(`/api/hunts/${hunt.id}/accept`, {})]);
  assert.ok(responses.every(x => [200, 202].includes(x.status)));
  const result = await waitFor(client, hunt.id, 'confirmed');
  assert.equal(result.receipt.status, 'confirmed'); assert.equal(result.receipt.deliveryUrl, 'https://tickets.example.com/claim/one');
  assert.equal(partner.calls.confirm, 1); assert.equal(partner.calls.reserve, 1);
  client.setCookie('');
  assert.equal((await client.request('/api/hunts', { ...defaultRequest, admissionCode: code })).status, 409);
});

test('definitive rejected charge fails without claiming tickets', async t => {
  const partner = partnerMock({ fail: true }), client = await serve(liveOptions(partner)); t.after(() => client.stop());
  const start = await client.request('/api/hunts', { ...defaultRequest, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) }), hunt = await waitFor(client, start.value.id, 'offer');
  await client.request(`/api/hunts/${hunt.id}/accept`, {});
  const result = await waitFor(client, hunt.id, 'failed');
  assert.equal(result.receipt.status, 'failed'); assert.match(result.receipt.message, /No payment/);
  assert.equal((await client.request(`/api/hunts/${hunt.id}/accept`, {})).status, 409);
  assert.equal(partner.calls.confirm, 1);
});

test('unknown confirmation never retries or releases budget, and persists on restart', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'no-empty-seats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dbPath = join(directory, 'test.sqlite');
  const partner = partnerMock({ unknown: true });
  const options = liveOptions(partner, { dbPath }); options.config.dailyBudget = 50;
  const first = await serve(options);
  const start = await first.request('/api/hunts', { ...defaultRequest, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) }), hunt = await waitFor(first, start.value.id, 'offer');
  await first.request(`/api/hunts/${hunt.id}/accept`, {});
  assert.equal((await waitFor(first, hunt.id, 'failed')).receipt.status, 'review_required');
  const cookie = first.getCookie(); await first.stop();
  const second = await serve(options); t.after(() => second.stop()); second.setCookie(cookie);
  assert.equal((await second.request('/api/session')).value.hunt.receipt.status, 'review_required');
  assert.equal((await second.request(`/api/hunts/${hunt.id}/accept`, {})).status, 409);
  second.setCookie('');
  const other = await second.request('/api/hunts', { ...defaultRequest, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) }), next = await waitFor(second, other.value.id, 'offer');
  const attempt = await second.request(`/api/hunts/${next.id}/accept`, {});
  assert.equal(attempt.status, 409); assert.match(attempt.value.error, /allocation/);
  assert.equal(partner.calls.confirm, 1);
});

test('price escalation during hold cannot trigger a charge', async t => {
  const partner = partnerMock({ priceTotal: 75 }), client = await serve(liveOptions(partner)); t.after(() => client.stop());
  const start = await client.request('/api/hunts', { ...defaultRequest, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) }), hunt = await waitFor(client, start.value.id, 'offer');
  await client.request(`/api/hunts/${hunt.id}/accept`, {});
  assert.equal((await waitFor(client, hunt.id, 'failed')).receipt.status, 'failed');
  assert.equal(partner.calls.confirm, 0);
});

test('two participants accepting concurrently cannot spend the same remaining budget', async t => {
  const partner = partnerMock();
  const options = liveOptions(partner); options.config.dailyBudget = 50;
  const client = await serve(options); t.after(() => client.stop());
  const entries = [];
  for (let i = 0; i < 2; i++) {
    client.setCookie('');
    const start = await client.request('/api/hunts', { ...defaultRequest, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) });
    const hunt = await waitFor(client, start.value.id, 'offer');
    entries.push({ hunt, cookie: client.getCookie() });
  }
  const results = await Promise.all(entries.map(({ hunt, cookie }) => client.request(`/api/hunts/${hunt.id}/accept`, {}, { cookie })));
  assert.equal(results.filter(result => result.status === 202).length, 1);
  assert.equal(results.filter(result => result.status === 409).length, 1);
  const winner = entries[results.findIndex(result => result.status === 202)];
  client.setCookie(winner.cookie);
  assert.equal((await waitFor(client, winner.hunt.id, 'confirmed')).receipt.status, 'confirmed');
  assert.equal(partner.calls.reserve, 1); assert.equal(partner.calls.confirm, 1);
});

test('a two-person offer cannot charge when the provider holds only one seat', async t => {
  const partner = partnerMock();
  const client = await serve(liveOptions(partner)); t.after(() => client.stop());
  const start = await client.request('/api/hunts', { ...defaultRequest, partySize: 2, admissionCode: issueAdmission(SECRET, { now: fixtureTime }) });
  const hunt = await waitFor(client, start.value.id, 'offer');
  assert.equal(hunt.offer.quantity, 2);
  await client.request(`/api/hunts/${hunt.id}/accept`, {});
  const result = await waitFor(client, hunt.id, 'failed');
  assert.equal(result.receipt.status, 'failed');
  assert.equal(partner.calls.reserve, 1); assert.equal(partner.calls.confirm, 0);
});

test('session isolation, origin checks, malformed requests, and expired offers', async t => {
  let clock = fixtureTime;
  const client = await serve({ now: () => clock }); t.after(() => client.stop());
  assert.equal((await client.request('/api/hunts', defaultRequest, { Origin: 'https://evil.example.com' })).status, 403);
  assert.equal((await client.request('/api/hunts', { ...defaultRequest, partySize: 9 })).status, 400);
  const start = await client.request('/api/hunts', defaultRequest), hunt = await waitFor(client, start.value.id, 'offer');
  const originalCookie = client.getCookie(); client.setCookie('');
  assert.equal((await client.request(`/api/hunts/${hunt.id}`)).status, 404);
  client.setCookie(originalCookie); clock += 121000;
  assert.equal((await client.request(`/api/hunts/${hunt.id}/accept`, {})).status, 409);
  assert.equal((await client.request(`/api/hunts/${hunt.id}`)).value.state, 'failed');
});

test('admission signatures and public URLs reject tampering and unsafe destinations', () => {
  const token = issueAdmission(SECRET, { now: fixtureTime });
  assert.ok(verifyAdmission(token, SECRET, fixtureTime));
  assert.equal(verifyAdmission(token + 'x', SECRET, fixtureTime), null);
  assert.equal(verifyAdmission(token, SECRET, fixtureTime + 25 * 3600000), null);
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://localhost', 'https://10.2.3.4', 'https://foo.local', 'https://[::1]']) assert.equal(safePublicUrl(url), null, url);
  assert.equal(safePublicUrl('https://tickets.example.com/my-ticket'), 'https://tickets.example.com/my-ticket');
});


test('Gemini discovery preserves actual citations and rejects uncited or out-of-city events', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const source = 'https://www.example.com/nyc-concert';
    const response = calls.length === 1
      ? { steps: [{ type: 'google_search_result', result: [{ search_suggestions: '<div>Search</div>' }] }, { type: 'model_output', content: [{ type: 'text', text: 'A dated New York concert at 3PM local time.', annotations: [{ type: 'url_citation', url: source, title: 'Concert listing' }] }] }] }
      : { steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ events: [
        { title: 'Real cited candidate', category: 'music', venue: 'Music hall', address: '1 Broadway', city: 'New York', startsAt: '2026-10-04T15:00:00-04:00', sourceIndex: 0, allAgesConfirmed: true, stepFreeConfirmed: true },
        { title: 'Uncited', venue: 'Hall', city: 'New York', startsAt: '2026-10-04T15:00:00-04:00', sourceIndex: 5 },
        { title: 'Outside NYC', venue: 'Hall', city: 'Newark', startsAt: '2026-10-04T15:00:00-04:00', sourceIndex: 0 }
      ] }) }] }] };
    return new Response(JSON.stringify(response));
  };
  try {
    const results = await geminiCandidates({ geminiKey: 'test-key', geminiModel: 'gemini-3.8-flash' }, { ...defaultRequest, stepFree: true, adultsOnly: false }, fixtureTime);
    assert.equal(calls.length, 2); assert.equal(calls[0].body.store, false);
    assert.deepEqual(calls[0].body.tools, [{ type: 'google_search' }]);
    assert.equal(calls[1].body.response_format.mime_type, 'application/json');
    assert.equal(results.length, 1); assert.equal(results[0].availability, 'listed');
    assert.equal(results[0].fulfillment, 'external'); assert.equal(results[0].priceTotal, null);
    assert.equal(results[0].sourceUrl, 'https://www.example.com/nyc-concert');
  } finally { globalThis.fetch = originalFetch; }
});

test('Ticketmaster metadata filters cancelled, wrong-city, unknown-time and inaccessible listings', async () => {
  const originalFetch = globalThis.fetch;
  const fixture = { id: 'tm-1', name: 'Evening concert', url: 'https://www.ticketmaster.com/event/one', dates: { status: { code: 'onsale' }, start: { dateTime: '2026-10-04T19:00:00Z' } }, _embedded: { venues: [{ name: 'Hall', city: { name: 'Brooklyn' }, address: { line1: '1 Broadway' } }] }, priceRanges: [{ currency: 'USD', min: 45 }] };
  globalThis.fetch = async () => new Response(JSON.stringify({ _embedded: { events: [fixture, { ...fixture, id: 'cancelled', dates: { ...fixture.dates, status: { code: 'cancelled' } } }, { ...fixture, id: 'tba', dates: { ...fixture.dates, start: { ...fixture.dates.start, timeTBA: true } } }] } }));
  try {
    const found = await ticketmasterCandidates({ ticketmasterKey: 'test-key' }, defaultRequest, fixtureTime);
    assert.equal(found.length, 1); assert.equal(found[0].priceIsEstimate, true); assert.equal(found[0].availability, 'listed');
    assert.equal((await ticketmasterCandidates({ ticketmasterKey: 'test-key' }, { ...defaultRequest, stepFree: true }, fixtureTime)).length, 0);
  } finally { globalThis.fetch = originalFetch; }
});


test('development HTTPS proxy origin matches exact Host; cross-host and forwarded-host origins fail', async t => {
  const client = await serve(); t.after(() => client.stop());
  const httpsOrigin = client.url.replace('http:', 'https:');
  assert.equal((await client.request('/api/hunts', defaultRequest, { Origin: 'https://evil.example.com', 'X-Forwarded-Host': 'evil.example.com' })).status, 403);
  assert.equal((await client.request('/api/hunts', defaultRequest, { Origin: httpsOrigin.replace('127.0.0.1', 'localhost') })).status, 403);
  const accepted = await client.request('/api/hunts', defaultRequest, { Origin: httpsOrigin });
  assert.equal(accepted.status, 202);
  assert.match(accepted.headers.get('content-security-policy'), /frame-ancestors 'self' https:\/\/aistudio\.google\.com;/);
});


test('kiosk launch and decline double taps resume one existing hunt without a reroll', async t => {
  const client = await serve(); t.after(() => client.stop());
  await client.request('/api/config'); // Establish the one browser session before launch.
  const starts = await Promise.all([
    client.request('/api/hunts', defaultRequest),
    client.request('/api/hunts', defaultRequest)
  ]);
  const created = starts.find(result => result.status === 202);
  const repeated = starts.find(result => result.status === 409);
  assert.ok(created); assert.ok(repeated);
  assert.equal(repeated.value.huntId, created.value.id);
  const firstOffer = await waitFor(client, created.value.id, 'offer');
  const session = await client.request('/api/session');
  assert.equal(session.value.huntId, firstOffer.id);
  assert.deepEqual(session.value.hunt.offer, firstOffer.offer);
  const declines = await Promise.all([
    client.request(`/api/hunts/${firstOffer.id}/decline`, {}),
    client.request(`/api/hunts/${firstOffer.id}/decline`, {})
  ]);
  assert.ok(declines.every(result => result.status === 200 && result.value.state === 'declined'));
  const retry = await client.request('/api/hunts', defaultRequest);
  assert.equal(retry.status, 409); assert.equal(retry.value.huntId, firstOffer.id);
  assert.equal((await client.request('/api/session')).value.hunt.state, 'declined');
});
