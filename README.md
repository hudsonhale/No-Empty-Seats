# No Empty Seats

**One city. One chance. One unexpected seat.**

A Google-inspired, Gemini-ready activation for a large touchscreen. Version 1.4 presents one still, wide view of a detailed miniature neighborhood: hand-painted buildings, stacked rooftops, narrow alleys, shops, a canal, and a visible underground. Glen Fox’s **Littlest Tokyo** is the artist-made centerpiece, surrounded by original connected streets and venues. Cute little people keep moving before anyone touches the screen. Tap **Find my seat** for one scout’s journey, a golden-ticket reveal, and one randomized offer. Take it or leave it. The sponsor covers eligible partner tickets.

## The experience

Choose one or two seats and any admission needs before starting. Tap **Find my seat** once. Your scout is the same size as everyone else; a subtle ring helps you find it. A seeded route changes the three-stop journey for each draw: a closed door, a queue, or occupied seats can send the scout onward. The camera stays completely still throughout. The 7.8-second tour ends with a 1.8-second ticket return once a result is ready, followed by the large ticket reveal over the same wide view. No steering, repeated tapping, or further input is required. The living city fills the screen; the controls stay small and direct.

The city, closed shops, queues, occupied seats, and golden ticket are illustrative storytelling. They do not report a real venue's opening hours, queue, inventory, or purchase status. The route's random choices are separate from the server's eligible-offer selection. The demo backend simulates 7.5 seconds of research; live provider latency varies. A ticket reveal still waits for an actual server result. The server's absolute offer expiry never changes: time spent in the journey reduces the remaining decision window, and short windows bypass the sequence. Reloading a ready offer reveals it immediately. Reduced motion freezes ambient movement and skips the added presentation wait; it does not skip provider work. Sound is optional.

## Start

Requires **Node 22.13+**. No npm runtime dependencies or build step. Three.js, its glTF loader, and the full 10.4 MB city model are bundled locally in both ZIPs. The model uses its original geometry, painted textures, and artist animation; it needs no runtime Draco decoder or external asset service. A simpler fixed-view 2D canvas scene is the WebGL compatibility fallback.

```sh
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:3000**. This must run through the Node server; opening the HTML directly or publishing to GitHub Pages will not run the backend.

## Two editions, one experience

| Edition | What works |
| --- | --- |
| Demo | Complete simulated city journey, plausible fictional NYC events and showtimes, party size, needs, random reveal, take/leave, simulated purchase, sample receipt, and refresh recovery. No keys, charges, or real tickets. |
| Live | Current NYC event discovery through Gemini + Google Search and/or Ticketmaster, source attribution, date/needs filtering, one reveal, and original booking links. No sample fallback. |
| Live + contracted sponsor inventory | Real partner inventory, single-use signed entries, all-in sponsor limits, reserve → confirm → ticket delivery, persistent payment records, and duplicate-charge prevention. Requires a real provider adapter and account. |

Each ZIP selects its mode in `config.json`. `APP_MODE` overrides that value. The UI always labels demo and live discovery distinctly. Google is the visual inspiration, not an actual sponsor or endorsement.

## Connect the live edition

1. Put `GEMINI_API_KEY` and/or `TICKETMASTER_API_KEY` in the server environment. With only one key, only that source is used. Set `GEMINI_MODEL` to a Search-grounding capable model supported by your account.
2. Start the app. It finds events beginning **45 minutes to 24 hours from now** in NYC's five boroughs. Times display in New York time. This is a scheduling buffer, not a route or travel-time calculation.
3. To issue sponsor-paid tickets, connect your contracted inventory adapter using [the partner contract](docs/PARTNER.md), a 32+ character `ADMISSION_SECRET`, and explicit sponsor spending limits.

**A current event listing is not proof of an empty seat.** Ticketmaster's public Discovery API and Google Search cannot purchase or guarantee seats. Without a funded partner, the UI says “Check availability” and never claims a ticket was bought. Dining requires dated, sourced experiences or partner tables; ordinary opening hours are not reservation availability.

The default age setting requires confirmed all-ages suitability. Tick “Everyone in my party is 21+” to allow age-restricted listings. Public Ticketmaster metadata does not verify accessibility or age rules, so strict needs require Gemini-supported evidence or partner inventory. Each party gets one opportunity; no category selection or reroll.

## Google AI Studio + GitHub

Upload the **contents of one ZIP** into a separate GitHub repository, then import it in AI Studio. Full instructions, the exact import prompt, secret names, and hosting limits are in [GOOGLE-AI-STUDIO.md](docs/GOOGLE-AI-STUDIO.md).

AI Studio/Cloud Run can host the demo and live discovery. Funded bookings in this SQLite edition require **one Node process on persistent local disk**. The server blocks paid mode on Cloud Run because ephemeral disk cannot preserve the payment ledger. A shared transactional database migration is required for funded Cloud Run or multiple instances; it is not included.

## Verify

```sh
npm run check
npm test
```

Node tests cover one-shot entries, age/access/date filters, session isolation, budget and price checks, source parsing, purchase failures, uncertain outcomes, restart recovery, and repeated acceptance. External provider calls are mocked. Node checks also exercise model loading, scene and motion logic; frontend checks exercise flow and timing. The environment’s supported browser workflow was unavailable, so actual browser GPU rendering, frame rate, and physical touchscreen behavior remain unverified. No production keys or tickets were used to validate this package.

## Design and operations

- [Activation concept](docs/ACTIVATION.md): installation, guest experience, and operator flow.
- [Partner contract](docs/PARTNER.md): exact inventory and booking payloads.
- [Research](docs/RESEARCH.md): official sources and API boundaries.
- Demo-only “Next demo guest” appears after a result. Production has no reroll.
- Sound is optional and starts only after user interaction. Reduced-motion preferences are respected.
- There is no email collection, marketing opt-in, or location tracking. Paid ticket delivery uses the provider's secure link.
- A shared physical kiosk still needs a staffed session reset and private ticket handoff. This is a runnable activation prototype, not an unattended kiosk management system.

The city’s centerpiece is **“Littlest Tokyo” by Glen Fox (glenatron), CC BY 4.0**, bundled at `public/assets/littlest-tokyo.glb`. Its original geometry, painted textures, and animated objects are the artist’s work. Original alley, shop, underground, character, and choreography additions extend that model; Glen Fox did not create or endorse this application. Attribution appears in the interface and [asset credits](public/assets/CREDITS.txt). `public/world.js` assembles the scene, and `public/scene.js` supplies the simpler 2D compatibility view. Three.js **0.160.1** and the adapted loader are bundled under the [included MIT license](public/vendor/THREE-LICENSE.txt), copyright the three.js authors. The [BUCK / Airbnb reference](docs/RESEARCH.md#visual-reference) informed the miniature-world direction; its film and assets are not bundled. Google/Gemini names and palette are used for an independent concept, without sponsorship or endorsement.
