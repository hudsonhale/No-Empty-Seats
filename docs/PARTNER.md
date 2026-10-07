# Sponsored ticket fulfillment

The demo runs on its own. Live discovery works with a Gemini API key and/or a Ticketmaster Discovery key. **Automatic sponsored purchase additionally requires a contracted inventory supplier and an adapter implementing the endpoints below.** This repository does not include a Ticketmaster purchase entitlement, restaurant booking agreement, payment account, or supply of tickets.

The adapter pays with the sponsor’s existing account. The browser never receives its credentials. All prices in this contract are **USD totals for the requested party, inclusive of fees**, expressed as numbers in dollars, with at most two decimal places. The app uses integer cents in its local budget ledger.

## Configuration

```dotenv
APP_MODE=live
SPONSOR_NAME=Your company
SPONSOR_API_URL=https://inventory.example.com/no-empty-seats
SPONSOR_API_TOKEN=your-server-only-adapter-token
ADMISSION_SECRET=replace-with-at-least-32-random-characters
MAX_CLAIM_USD=250
DAILY_BUDGET_USD=2500
DATABASE_PATH=./data/no-empty-seats.sqlite
PUBLIC_ORIGIN=https://your-activation.example.com
NODE_ENV=production
```

`SPONSOR_API_URL` must use public HTTPS, without embedded credentials or a nonstandard port. Private addresses, localhost, IP literals, and redirects are rejected. The app sends `Authorization: Bearer <SPONSOR_API_TOKEN>` to each adapter request. Keep this token and the admission secret in server environment variables.

Run this SQLite edition on **one Node instance with a durable local filesystem**. Do not scale it into independent instances or mount the database on a filesystem lacking SQLite-compatible locking. The app refuses funded startup when Cloud Run’s `K_SERVICE` is set, because Cloud Run’s writable container storage is ephemeral. Cloud Run remains suitable for this edition’s demo or discovery-only deployment. A scaled funded deployment needs a shared transactional database and coordinated job execution first.

When the adapter, admission secret, and positive budget limits are configured, live searches use the adapter’s inventory exclusively. Google Search and Ticketmaster Discovery listings cannot silently become purchasable stock. Without the adapter, selecting a listing opens its seller page and never claims that the sponsor purchased it.

## 1. List eligible inventory

```http
GET /inventory?startsAfter=2026-10-04T17%3A00%3A00.000Z&startsBefore=2026-10-05T16%3A15%3A00.000Z&quantity=2&stepFree=false&adultsOnly=true
Authorization: Bearer <token>
```

Times above illustrate the format. The running app supplies its current window: at least 45 minutes from now and no more than 24 hours from now.

```json
{
  "offers": [
    {
      "id": "supplier-performance-123",
      "title": "Evening concert",
      "category": "music",
      "venue": "Example Hall",
      "address": "123 Example Street, New York, NY",
      "city": "New York",
      "startsAt": "2026-10-04T19:30:00-04:00",
      "quantityRemaining": 2,
      "priceTotal": 110.00,
      "currency": "USD",
      "sourceUrl": "https://tickets.example.com/performance/123",
      "stepFree": true,
      "allAges": true,
      "ageRestriction": "All ages",
      "seatLabel": "Orchestra · Row G · adjacent seats",
      "lat": 40.7590,
      "lng": -73.9845
    }
  ]
}
```

This is a schema example, not a real offer. Required fields are `id`, `title`, `venue`, `city`, `startsAt`, `quantityRemaining`, `priceTotal`, and `currency`. Supply `address`, `category`, `sourceUrl`, and truthful eligibility details for a useful visitor experience. Supported category labels are `music`, `theatre`, `comedy`, `sports`, `dining`, and `culture`.

`quantity` is 1 or 2. The quoted `priceTotal` must cover that exact requested quantity. For two tickets, the adapter must ensure they can be admitted together; provide adjacent seating where the experience requires it. `quantityRemaining` is an integer no smaller than the party size.

`stepFree=true` means the visitor requires verified step-free admission and appropriate inventory. `adultsOnly=true` means the visitor confirmed everyone is at least 21 and age-restricted events may be included. When it is false, return only explicitly all-ages offers. Do not infer accessibility from a general venue description or infer all-ages admission from missing restrictions.

`startsAt` must be an ISO-8601 instant containing `Z` or an explicit offset. The app accepts New York City borough/city names supported by `isNYCCity` in `server/providers.mjs`; use `New York`, `Manhattan`, `Brooklyn`, `Queens`, `Bronx`, `Staten Island`, `Flushing`, or `Long Island City`. Do not return nearby New Jersey or Long Island events as NYC.

Return only genuinely available, legally transferable inventory with a firm fee-inclusive quote. Exclude cancellations, past performances, uncertain start times, and invalid entitlements. The app checks date, quantity, city, requirements, currency, and the per-claim cap before selecting one offer randomly. An offer is a listing until the reserve operation succeeds. The server assigns an absolute two-minute decision deadline when it creates the offer; the city presentation consumes part of that window without extending it. Short windows bypass remaining choreography, and reloaded ready offers appear immediately. Neither displaying the offer nor the golden-ticket animation creates a supplier hold.

## 2. Hold the selected seats without charging

```http
POST /reserve
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: nes-<hunt-uuid>-hold
```

```json
{
  "offerId": "supplier-performance-123",
  "quantity": 2,
  "maxTotal": 110.00,
  "currency": "USD",
  "idempotencyKey": "nes-<hunt-uuid>-hold"
}
```

Successful response:

```json
{
  "status": "held",
  "holdId": "hold-456",
  "expiresAt": "2026-10-04T18:02:00Z",
  "priceTotal": 110.00,
  "currency": "USD",
  "quantity": 2,
  "seatLabel": "Orchestra · Row G · seats 5–6"
}
```

The hold must still have **more than 15 seconds** remaining when the app receives it. It must cover the exact quantity and cost no more than the displayed quote. A lower total is allowed. This endpoint **must never charge** and must make repeat requests with the same key idempotent. Unused holds must expire automatically; this edition has no cancellation endpoint.

The app durably reserves sponsor budget before this request. A failed, expired, malformed, or more expensive hold stops fulfillment without calling `/confirm`. Because `/reserve` is contractually noncharging, these failures release the local budget reservation.

## 3. Confirm one paid order

```http
POST /confirm
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: nes-<hunt-uuid>
```

```json
{
  "holdId": "hold-456",
  "quantity": 2,
  "maxTotal": 110.00,
  "currency": "USD",
  "idempotencyKey": "nes-<hunt-uuid>"
}
```

Successful response:

```json
{
  "status": "confirmed",
  "orderId": "supplier-order-789",
  "deliveryUrl": "https://tickets.example.com/claim/secure-order-token",
  "priceTotal": 110.00,
  "currency": "USD",
  "quantity": 2
}
```

`deliveryUrl` must be a public HTTPS URL for the actual ticket delivery or authorized transfer flow. It must work on the visitor’s phone and grant the quoted admission; an ordinary event listing is insufficient. It must not expose sponsor credentials. The app only shows “paid” after validating a confirmed order, delivery URL, exact quantity, currency, and price at or below the hold.

The adapter must durably claim the idempotency key **before** its first seller/payment call, bind it to immutable request details, and return the same order for subsequent requests. A key collision with different details must fail. The underlying supplier purchase must also have an idempotent or otherwise reconciled integration. Local app guards alone cannot guarantee exactly-once behavior across a payment boundary.

A definitive no-charge failure must return this exact semantic result, either with HTTP 200 or a non-2xx JSON response:

```json
{ "status": "failed", "charged": false }
```

Only send `charged:false` after conclusively establishing that no charge/order exists for that key. A timeout, uncertain supplier response, HTTP 500 without this guarantee, invalid delivery URL, malformed success, or unknown result is **not** a definitive failure.

The app uses a 30-second confirmation timeout, does not retry confirmation automatically, retains the budget for uncertain results, and displays `receipt.status="review_required"`. Repeated accept requests cannot start a second payment. An interrupted server with a hunt in `booking` also enters review on restart, conservatively retaining its budget.

## 4. Reconcile an uncertain order

The adapter must support operator lookup, for example:

```http
GET /orders/by-idempotency-key/nes-<hunt-uuid>
Authorization: Bearer <token>
```

Return the confirmed order schema above, the definitive no-charge failure schema, or a clearly pending/unknown result. This app does **not** automatically call this lookup or release unknown ledger entries. The event team must reconcile the supplier’s actual order/payment records and deliver an existing confirmed ticket before considering a replacement. Do not run `/confirm` again with a new key to “fix” uncertainty.

The participant’s review receipt includes `nes-<hunt-uuid>`, which matches the adapter idempotency key. Local records are in the SQLite `hunts` and `payments` tables. Preserve database backups and provider logs during reconciliation. If an operator corrects local state after verified reconciliation, perform that correction as a controlled transactional maintenance operation; there is intentionally no unauthenticated HTTP budget-reset endpoint.

## Admissions and one chance

Create a random secret, then issue signed codes from the server environment:

```bash
node --env-file-if-exists=.env server/admission.mjs 20
```

This prints 20 codes. Each expires after 24 hours and can start one funded hunt. Give one code to each eligible activation participant; it is consumed when the hunt begins, even if no match is found or the visitor declines. Signed codes prevent a cleared browser cookie from granting unlimited sponsor-funded chances. A staff-issued replacement code should follow the activation’s published rules.

The browser also gets an opaque HttpOnly session cookie and can resume its existing hunt. Cookies alone cannot identify a unique person; code issuance is the human admission control. The demo’s replay reset is unavailable in live mode.

## Budget and verification

`MAX_CLAIM_USD` applies to the entire party’s claim. `DAILY_BUDGET_USD` is allocated on the America/New_York calendar date when the claim is accepted. Pending, confirmed, and uncertain purchases count toward that day. The ledger reserves budget transactionally before calling a supplier. Definitive no-charge failures release it. Confirmed orders store the final paid amount. Budget caps are local safeguards; also set account-side limits with the supplier.

Run `npm test` before connecting a funded account. The integration tests use mocked providers and cover concurrent accepts, simultaneous claims against one budget, incorrect party size, price increases, explicit failures, unknown charges, persistence, and admission-code replay. They do not prove a third-party adapter fulfills real tickets. Validate your contracted adapter end to end in its sandbox and arrange staff recovery before an activation.
