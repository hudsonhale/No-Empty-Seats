# Run No Empty Seats in Google AI Studio

The project has a Node.js server and a plain HTML/CSS/JavaScript frontend in `public/`. Keep both. A locally bundled Three.js renderer and glTF loader display Glen Fox’s **Littlest Tokyo**, with original connected alley, shop, rooftop, canal, and underground additions. Both ZIPs include the full 10.4 MB model at `public/assets/littlest-tokyo.glb`; keep that binary and its CC BY 4.0 credit. No npm runtime dependencies or build step are required. A simpler fixed-view 2D canvas scene provides a WebGL compatibility fallback. The touchscreen flow is one launch, one same-sized scout’s journey inside a still wide shot, one reveal, then take or leave. Live discovery, participation codes, sponsor budgets, and booking state belong on the server.

## Import the project

1. Unzip the demo or live package. Create a GitHub repository and upload the contents so `package.json`, `server/`, and `public/` are at the repository root. Do not upload `.env`, ticket credentials, or the `data/` directory.
2. Open [Google AI Studio Build](https://aistudio.google.com/apps). In the prompt box, choose **Add files (+) → Import from GitHub** and select the repository. Google documents this import path in its [Build guide](https://ai.google.dev/gemini-api/docs/aistudio-build-mode).
3. Give AI Studio this instruction:

   > Run this existing application without redesigning it. Preserve the Node.js backend, plain frontend, local Three.js and glTF loader vendor files and licenses, all world and scene extension scripts, public/assets/littlest-tokyo.glb, public/assets/CREDITS.txt, visible Glen Fox / CC BY 4.0 attribution, 2D compatibility fallback, and same-origin /api routes. Keep the dense living city in one still wide shot in every state. The personal scout must stay the same size as the other people; do not add camera following or zooms. Preserve the minimal touchscreen flow: Find my seat, one randomized scout journey requiring no further input, one reveal, then take or leave. Preserve optional sound, reduced motion, immediate restored offers, and absolute server expiry. Use Node 22.13 or newer and npm run dev. Bind to 0.0.0.0 and the PORT environment variable supplied by the environment. Keep every API credential on the server. Do not replace live results with demo events, simulate successful live purchases, or move booking logic into the browser.

4. Open **Settings → Secrets** and add the server credentials you need. Google describes this flow in its [full-stack guide](https://ai.google.dev/gemini-api/docs/aistudio-fullstack). Importing this repository has not been tested inside your account; inspect any runtime changes AI Studio proposes before accepting them.

## Choose the mode

Set values using the package's `.env.example` as the reference. Secrets entered in AI Studio are server environment variables; do not paste them into frontend code or the chat prompt.

| Setting | Demo | Live |
| --- | --- | --- |
| `APP_MODE` | `demo` | `live` |
| `GEMINI_API_KEY` | Not required | Enables grounded event research |
| `GEMINI_MODEL` | Not used | `gemini-3.8-flash` by default; use a supported model in your account |
| `TICKETMASTER_API_KEY` | Not required | Enables structured Ticketmaster event discovery |
| `SPONSOR_API_URL` / `SPONSOR_API_TOKEN` | Not required | Contracted inventory and booking adapter credentials |
| `ADMISSION_SECRET` | Not required for rehearsal | At least 32 characters for signed activation codes |
| `MAX_CLAIM_USD` | Simulation | All-in maximum per order, including every seat, fee, and tax |
| `DAILY_BUDGET_USD` | Simulation | Maximum campaign spending for the configured day |
| `PUBLIC_ORIGIN` | Preview origin where applicable | Exact public HTTPS origin |

Ticketmaster and Gemini discover real events. A listing is not a reserved seat, and a search result is not proof of ticket inventory. Sponsor-paid checkout requires the partner adapter described in [PARTNER.md](./PARTNER.md). Without it, the live experience can return sourced opportunities and outbound links, but cannot issue purchased tickets.

The demo uses fictional events and 7.5 seconds of simulated backend research. The three-stop city journey takes 7.8 seconds inside the unchanged wide shot, then a ready result gets a 1.8-second ticket return and a large reveal. Seeded routes, closed doors, queues, and full seats are illustrative animation, not factual venue-status or inventory reports. Live research uses actual provider timing. Its offer deadline remains unchanged by presentation time; short windows, restored ready offers, and reduced motion bypass unnecessary waits. Empty results and failures stay explicit.

## Run locally

Install Node 22.13 or newer, then run from the extracted project directory:

```sh
cp .env.example .env
npm install
npm run dev
```

The app explicitly permits embedding by `https://aistudio.google.com` in its frame policy. If the embedded preview cannot retain the visitor session because the browser blocks third-party cookies, use **Open in new tab** and run the flow there. In development, HTTPS proxy origins are accepted only when their host and port exactly match the request’s actual Host header; forwarded-host headers are not trusted. Production still requires an explicit `PUBLIC_ORIGIN`.

Open the local address printed by the server. To use port 8080, set `PORT=8080` in `.env`. On a deployed service, use the platform's `PORT` value. Open the app through its server, rather than opening `public/index.html` as a local file.

For a funded activation, generate a batch of 20 single-use codes using the same server-side secret:

```sh
node --env-file-if-exists=.env server/admission.mjs 20
```

Give one code to each participant. A code is consumed when a funded hunt starts. Mobile visitors can enter their code on their own device; a staffed kiosk needs a fresh participant session between visitors. Browser identity is not proof that someone has never participated.

## Publish and preserve state

Use AI Studio's **Publish** flow for a shareable demo or live discovery build. Its [deployment guide](https://ai.google.dev/gemini-api/docs/aistudio-deploying) explains Cloud Run publishing and account-dependent setup. Verify your deployed `PUBLIC_ORIGIN` and server secrets before sharing the URL.

The included SQLite store at `DATABASE_PATH` is designed for one Node process on durable local storage. For a paid activation, deploy it on a single server with a persistent POSIX disk and backups. Keep that data directory across restarts and upgrades: it contains used codes, budgets, and booking state.

Cloud Run's instance storage is temporary, and a Cloud Storage mount does not provide the file locking needed for this database. Setting the instance count to one does not make the disk durable. Before running funded bookings on Cloud Run or across multiple app instances, replace the store with a shared transactional database and preserve its code-consumption, budget, idempotency, and reconciliation guarantees. This database migration is not included in the package. See Google's [storage limitations](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts) and [ephemeral disk guidance](https://docs.cloud.google.com/run/docs/configuring/services/ephemeral-disk).

Rehearse on the intended touchscreen. Check that the local 10.4 MB artist model and textures finish loading, the camera remains still in every state, all scouts stay the same size, and the artist animation and original neighborhood activity run together. Also check the simpler 2D compatibility fallback, one-launch journey, acceptance, refusal, no-result handling, immediate ready-offer recovery, offer expiry, optional sound, and reduced motion. Automated verification includes Node backend, glTF loading, motion-logic, and frontend flow checks; the build environment’s supported browser workflow was unavailable, so actual browser GPU rendering, frame rate, and touchscreen behavior remain unverified. For funded use, verify the contracted provider’s confirmation and interrupted-purchase reconciliation before issuing public codes.

Google documentation checked October 4, 2026. The visual concept does not imply Google sponsorship.
