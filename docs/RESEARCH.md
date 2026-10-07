# No Empty Seats — research and integration boundaries

Verified against official documentation on 2026-10-04 UTC (2026-10-03 in New York). These are implementation references, not claims that a particular event currently has spare seats.

## Visual reference

[BUCK: Airbnb Experiences & Services](https://buck.co/work/airbnb-experiences) · [BUCK's film on Vimeo](https://vimeo.com/1084781131)

The user selected this reference for its immersive miniature environments, continuous movement, and small environmental details. Version 1.4 follows the user's later correction: one still, wide view, with the personal scout the same size as the other inhabitants. The reference film and its assets are not included or presented as work by this project. BUCK reference pages checked October 6, 2026.

The supplied fidelity reference matches **Littlest Tokyo**, an artist-made scene by **Glen Fox (glenatron)**. The [official Three.js example](https://threejs.org/examples/webgl_animation_keyframes.html) credits Glen Fox and CC Attribution. The [artwork](https://www.artstation.com/artwork/1AGwX) and [artist](https://www.artstation.com/glenatron) are linked in the bundled credits. The original model metadata explicitly specifies [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Both packages bundle a full-fidelity, uncompressed 10,423,788-byte GLB from the [BabylonJS/Babylon-Lite repository, pinned to commit 994b6a3](https://github.com/BabylonJS/Babylon-Lite/blob/994b6a3d1956868f87d9446eaed88b6998ad6f79/lab/public/littlest-tokyo/LittlestTokyo.glb). The [repository's asset credit](https://github.com/BabylonJS/Babylon-Lite/blob/994b6a3d1956868f87d9446eaed88b6998ad6f79/lab/public/littlest-tokyo/CREDITS.txt) also confirms CC BY 4.0. The downloaded file was checked for a valid glTF 2 binary, 71 meshes, 216 nodes, 15 materials, four image textures, and one animation. It has no runtime compression extension, so the app does not need a Draco decoder or worker. Its SHA-256 and source URLs are preserved in [CREDITS.txt](../public/assets/CREDITS.txt). Asset sources and bytes checked October 7, 2026.

The artist's geometry, hand-painted textures, and animated objects remain the city centerpiece. Original alley extensions, shops, rooftop connections, a canal, a visible underground, people, and agent choreography surround it. The model is normalized in scale, placed, and lit within this original environment. Glen Fox did not create or endorse the application. The required artist and license attribution appears in the interface and bundled credits; it must remain when adapting the project.

The three-stop journey can show closed shops, a queue, or occupied seats before the scout moves on. These randomized story beats are separate from the provider search: they do not claim that an actual venue was contacted, closed, full, or holding a seat. A result still requires the server to return an eligible offer. The model is a stylized Tokyo-inspired environment for NYC event discovery, not a geographically accurate New York map.

The renderer uses locally bundled Three.js 0.160.1 and an adapted glTF loader, copyright the three.js authors, under the [included MIT license](../public/vendor/THREE-LICENSE.txt). No npm runtime dependency or remote model service is required. The simpler 2D Canvas compatibility view is original artwork and retains the fixed view and equal-sized scouts. Node model-loading and motion-logic checks do not establish browser GPU rendering quality, frame rate, or physical touchscreen usability; those require testing on the intended hardware.

## What the public data can establish

### Ticketmaster Discovery

[Official Discovery API documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)

The open Discovery API searches events, venues and attractions. It returns event dates, locations, images, sales information and purchasing links. Query parameters include date windows, city, state, country, category and a geohash. `latlong` is deprecated; use `geoPoint` for radius searches. The default quota is 5,000 calls daily and five requests per second.

**Product consequence:** an event listing, an on-sale status or a displayed price range is a discovery signal. It is not a held seat, a guaranteed current checkout price or a purchased ticket. Show when the listing was checked and retain its source URL. Filter out canceled, postponed and date/time-unknown events before making a time-sensitive recommendation.

### Ticketmaster inventory and purchasing

[Official Inventory Status API](https://developer.ticketmaster.com/products-and-docs/apis/inventory-status/)

This separate API provides event-level availability with near-real-time inventory updates. Access is limited to authorized clients. Price ranges have a different refresh cadence: the documentation specifies at most hourly refreshes.

[Official Partner API](https://developer.ticketmaster.com/products-and-docs/apis/partner/)

The Partner API is restricted to companies with an existing official distribution relationship. It supports reserving, purchasing and retrieving tickets. A reservation returns a hold duration; abandoned holds should be released. The documented flow includes inventory, reservation, shipping, payment and ticket delivery. Another sales channel can sell inventory before it is reserved.

**Product consequence:** a public Discovery API key cannot make the promised sponsored purchase happen. Actual fulfillment requires an approved provider integration or legitimately controlled ticket inventory. The purchase adapter must honor the provider's hold, payment, fulfillment and failure behavior; it must not turn a normal buying link into a fabricated confirmation.

### Restaurants

[OpenTable API partner FAQs](https://www.opentable.com/restaurant-solutions/api-partners/faqs/)

OpenTable directs developers to its documentation and partner application. Its Directory API supplies restaurant information and reservation links. Restaurants and their third parties can discuss API access with their account team.

[OpenTable documentation](https://docs.opentable.com/)

The official documentation describes reservation availability search. Access and usage depend on the applicable agreement and platform policies.

**Product consequence:** finding a restaurant is different from finding a reservable table. A restaurant offer needs a confirmed date, time, party size and a stated sponsor contribution. A reservation alone does not establish that a meal is prepaid. No undocumented restaurant endpoints or consumer-session scraping are required by this project.

## Google implementation references

### Gemini and Google Search

[Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)

The current documentation uses the Interactions API with `tools: [{"type":"google_search"}]`. Grounded responses include model text with URL citation annotations, executed queries and search suggestions. Search is model-directed; enabling the tool does not prove that every returned statement was independently verified.

**Product consequence:** use Gemini to discover, explain and normalize candidate experiences. Keep source attribution and search suggestions. Do not let model prose establish availability, charge amounts or purchase success. Independent server checks must validate dates, geography and fulfillment status.

[Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview)

Interactions is generally available and recommended for new projects; `generateContent` remains supported. `store: false` opts out of stored interaction state. A raw REST response uses a chronological `steps` array, including `model_output` steps.

[Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

The Interactions API supports a JSON response format with `type: "text"`, `mime_type: "application/json"` and a JSON `schema`. This is useful for extracting normalized candidate data after a grounded search. Schema compliance is not proof that the extracted information is true.

[Current model catalog](https://ai.google.dev/gemini-api/docs/models)

At verification, the catalog lists `gemini-3.8-flash` as stable. Model availability can vary by account and change over time. Keep the model ID configurable, report upstream failures accurately, and do not silently switch to fictional live results when credentials or access fail.

### AI Studio and deployment

[Build apps in Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)

AI Studio supports full-stack web apps, a Node.js server runtime, importing an existing GitHub repository and two-way GitHub sync. Import is available from Build mode's Add files menu. React is the default generated frontend, rather than a requirement stated for every imported project.

[Full-stack apps and secrets](https://ai.google.dev/gemini-api/docs/aistudio-fullstack)

Server-side code can access external APIs and environment secrets. Third-party keys belong in Settings → Secrets. API credentials must not be embedded in downloaded frontend JavaScript or committed to GitHub.

[Deploying from AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-deploying)

AI Studio publishes to Cloud Run. Starter Tier eligibility and limits differ from standard deployment, which requires a billing-enabled Google Cloud project. A successfully running local or preview app is not evidence that an account has deployment eligibility.

## Recommended live activation contract

The following are project design decisions derived from the boundaries above, rather than capabilities supplied automatically by Gemini or a public ticket API:

1. Admit one participant using an activation-issued credential or another appropriate identity mechanism. Browser storage alone cannot enforce one opportunity per person.
2. Discover future NYC candidates inside a clearly bounded time window. Use `America/New_York` to define local dates and display times. Leave enough time to reach the venue; a distance estimate is not a transit itinerary.
3. Verify the required quantity, eligibility, accessibility needs, sponsor budget and delivery method through the authorized inventory provider.
4. Choose randomly from eligible candidates, then obtain a real hold before describing the offer as reserved. A suspense animation must not imply a hold that the provider has not created.
5. Give the participant one reveal, with accept or decline. Tie any countdown to a real offer expiration; distinguish a UI decision window from a supplier hold.
6. On acceptance, commit through the provider with a stable idempotency key and a server-validated maximum total. Never retry an uncertain charge as a new order.
7. Display success only after confirmed fulfillment. Deliver the real provider ticket or claim link. Release declined or expired holds. Reconcile uncertain or delayed outcomes with the provider.

For a first physical pilot, a small set of participating venues with explicitly allocated inventory is the most direct way to make the entire promise true. Broad citywide discovery can expand the candidate pool, but it cannot manufacture supplier access or guarantee attendance-worthy availability.

## What must be measured before a public launch

Measure real search, inventory, hold and delivery latency with the configured accounts. Dummy animation timings are illustrative pacing, not benchmarks. Exercise concurrent claims, expired offers, provider outages, pending/uncertain purchases and participant retries. Use durable shared state and authenticated participant identities when moving beyond a single-instance pilot.
