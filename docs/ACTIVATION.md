# No Empty Seats

**The city has a seat for you. You just don't know where yet.**

The activation is a large touchscreen window into a densely detailed miniature neighborhood. One still, wide shot holds the entire interconnected world: narrow shopfront alleys, different roof heights, overhead connections, a canal, and a visible subway level. Glen Fox’s hand-painted **Littlest Tokyo** model anchors the composition; original additions extend its streets and venues. Cute little people and the artist’s animated details keep it alive before anyone interacts. **Find my seat** introduces a visitor’s own scout, then reveals one offer. Participation does not require a payment.

## The visitor experience

1. **Step up.** Choose one or two seats and any admission needs. For funded entry, paste the staff-issued participation code. Display the time window before starting so a visitor can decide whether they can actually go.
2. **Launch once.** Tap **Find my seat**. A new scout, the same size as the other little people, joins the city for this visitor. A subtle ground ring identifies it; the camera stays still.
3. **Spot the scout.** A 7.8-second tour visits three places inside the same wide view. Seeded route choices and a closed door, queue, or full seats make each hunt feel different. Other neighborhood activity continues around it. No steering, repeated tapping, or further answers are needed. These are illustrative story beats; they do not establish actual opening hours, queues, or ticket inventory.
4. **Get one offer.** Once a result is ready, the scout returns with a golden ticket in a 1.8-second sequence, handing off to the large ticket reveal. Show the event, venue, local start time, quantity, and anything the guest needs to decide. The golden ticket represents the opportunity, not a confirmed purchase. There is no carousel or reroll.
5. **Take it or leave it.** Taking a partner-backed offer requests the sponsor-funded booking. Leaving ends the turn. A pending booking stays pending until the provider confirms it.
6. **Go.** A confirmed booking supplies the actual provider's delivery details. A discovery-only result links to its source and must not be presented as a purchased ticket.

## A touchscreen worth stopping for

Use a large touchscreen in a clean freestanding enclosure, with the controls within reach from a seated position. Let the interconnected city fill the display. Keep the launch button obvious and the other controls quiet; avoid a large headline or filmstrip competing with the world. Venues should read as places: a theater, music venue, restaurant, stadium, and destinations linked by streets and transport.

The city is always active, and the camera remains one still overview before, during, and after the search. Detail comes from the world itself: painted surfaces, window frames, rooftop equipment, plants, stairways, wires, shop displays, and street life. The personal scout never grows larger than its neighbors. The route changes per hunt, with quick setbacks before the hand-sized ticket comes back and the large ticket appears over the still world. The visitor can step back and watch with the queue; the next required touch is the decision to take or leave the offer.

The browser experience includes a self-hosted 10.4 MB artist model in both ZIPs, local Three.js and loader code, and the original scene extensions. Keep the visible **Glen Fox / CC BY 4.0** credit and bundled `public/assets/CREDITS.txt` when adapting the installation. The simpler 2D fallback preserves the fixed camera and equal-sized scouts, but does not reproduce the artist model’s fidelity. The display, enclosure, speakers, printer, and private kiosk-to-phone handoff are production setup or extensions; this package does not connect to physical hardware or provide unattended kiosk management.

Provide generous approach space and a seated-height interaction zone. Keep keyboard support and optional sound. Reduced motion freezes ambient movement and skips added presentation waits while preserving the search and result. Keep private booking details out of the queue's view. Test touch reach, text size, rendering performance, and session handoff on the actual display; browser/WebGL visual verification was not available in the build environment.

## Make the surprise fair to the visitor

One issued code represents one participation attempt. Browser storage alone cannot enforce one person, one chance; staff control code issuance at a physical activation. A kiosk operator should begin a fresh participant session between guests. Do not let a public reset control mint new live attempts.

Filter before random selection: real event time, New York location, supported quantity, provider eligibility, age restrictions when supplied, and sponsor budget. Give visitors enough lead time to reach the venue. If an important condition cannot be verified, do not imply it was checked. A restaurant reservation is not automatically a paid meal; restaurant partners must define the funded experience and any remaining guest costs.

When no eligible result exists, say so. Do not replace a failed live search with demo inventory. When an offer expires or the venue cannot fulfill it, show the outcome explicitly rather than silently drawing another destination.

## Demo rehearsal and live activation

The demo backend simulates a 7.5-second search; the tour and return take about 9.6 seconds, followed by the ticket's entrance. Its fictional tickets admit nobody. Live research can take longer, and a successful animation never substitutes for a provider result. The scene's closed shops, queues, and occupied seats are randomized atmosphere, separate from provider checks and the server's eligible-offer draw.

Offer expiry is an absolute server deadline. Presentation time consumes part of that window; it never extends it or creates an inventory hold. Short windows skip the remaining choreography. A ready offer restored after a reload appears immediately. Reduced motion removes the presentation delay while still waiting for real provider work.

For a live event, arrange a ticketing or venue partner that can quote, reserve, purchase, and deliver the inventory. Public listings and search grounding can discover events; they do not grant checkout access. Turn on funded booking only after that integration is credentialed and tested.

Set an exact all-in maximum for each accepted order and a campaign budget before opening the queue. Fees and taxes belong inside those limits. Reserve budget when reserving inventory, release it when the hold is released, and reconcile uncertain purchases before allowing another charge. Run the supplied persistent store on one application instance with a durable volume; use a transactional shared database before scaling across instances.

Assign one host to issue codes and explain the single decision, and one operator to handle booking exceptions. Rehearse acceptance, refusal, timeout, empty inventory, provider outage, exhausted budget, and interrupted delivery. Count confirmed seats delivered as the success metric.

## Brand and filming

The blue, red, yellow, and green palette and Gemini emphasis are a creative direction for a Google-centered pitch. This project does not establish Google sponsorship or permission to present the installation as an official Google activation.

The strongest film is one continuous human story: a visitor launches the search, follows the agents through the miniature city, chooses the unexpected offer, and arrives at the venue. Capture the confirmed destination reveal without publishing a redeemable barcode, participation code, or attendee's private information.
