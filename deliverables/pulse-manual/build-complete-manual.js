// Run: node deliverables/pulse-manual/build-complete-manual.js
// Requires Chromium on PATH; does not alter the original manual or its generator.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = __dirname;
const shot = (name, caption) => {
  const file = path.join(root, "screenshots", `${name}.jpg`);
  const base64 = fs.readFileSync(file).toString("base64");
  return `<figure><img src="data:image/jpeg;base64,${base64}" alt="${caption.replace(/"/g, "&quot;")}"><figcaption><b>SCREEN:</b> ${caption}</figcaption></figure>`;
};
const page = (number, kicker, title, text, visuals = "", cls = "") =>
  `<section class="page ${cls}" id="p${number}"><header class="running"><b>⌁ PULSE</b><span>COMPLETE USER GUIDE / SEPTEMBER 2026</span></header><div class="kicker">${kicker}</div><h1>${title}</h1><div class="layout ${visuals ? "with-image" : ""}"><div class="copy">${text}</div>${visuals ? `<div class="visuals">${visuals}</div>` : ""}</div><footer class="foot"><span>Pulse / User guide</span><span>${String(number).padStart(2, "0")} / 24</span></footer></section>`;
const step = (n, title, body) => `<div class="step"><strong>${n}. ${title}</strong><p>${body}</p></div>`;
const box = (title, body) => `<aside class="box"><b>${title}</b><p>${body}</p></aside>`;
const sub = (title, body) => `<h2>${title}</h2><p>${body}</p>`;
const images = fs.readdirSync(path.join(root, "screenshots")).filter(x => x.endsWith(".jpg")).sort();
const pages = [];

pages.push(page(1, "THE FIELD GUIDE / 2026", "Follow the <em>pulse.</em>", `
<p class="lead">A practical, illustrated guide to finding a live game, choosing your weekend ritual, reading the story behind it, and building a simple viewing plan.</p>
<div class="cover-band"><span>01 / DISCOVER</span><span>02 / DECIDE</span><span>03 / FOLLOW</span></div>
<p>Watch · Rituals · Stories · My Plan</p>
<p class="small">A companion for the phone-sized Pulse experience. Screens are authentic web-preview captures, not representations of guaranteed current scores, fixtures or native-device appearance.</p>
`, "", "cover"));

pages.push(page(2, "FIND YOUR WAY", "Contents", `
<div class="toc">${[
["03","Start here · navigation & preferences"],["04","Watch · find events and open details"],["05","Chaos Mode · tension and ranking"],["06","Chaos Mode · activity alerts & promotion"],["07","Rituals · six weekly windows"],["08","Ritual guide · sections & filters"],["09","Choose a featured game manually"],["10","Stories · four cards and navigation"],["11","The Daily Wrap"],["12","What to Watch Next · Today"],["13","What to Watch Next · week and month"],["14","Trending Stories"],["15","Behind the Stories · topic library"],["16","Playbook · Hockey Family Tree"],["17","Playbook · Cycling Circuits"],["18","Playbook · Endurance Athletics"],["19","Playbook · Paddling 101"],["20","Playbook · Triple Crown 101"],["21","Playbook · Racing 101"],["22","My Plan · Serie A pilot"],["23","Refresh, errors & access"],["24","Reference & boundaries"]
].map(([n,t])=>`<a href="#p${Number(n)}"><span>${t}</span><b>${n}</b></a>`).join("")}</div>
<p class="small">In the HTML edition, select a row to jump to that page. Printed page numbers appear at the bottom right of every page.</p>
`));

pages.push(page(3, "01 / FIRST STEPS", "Make Pulse yours", `
${step(1,"Learn the bottom tabs","Watch (pulse icon) is the live and upcoming hub. Rituals (shirt icon) organizes weekly viewing windows. Stories (stars icon) offers narrative feeds and explainers. Use a back arrow to leave a detail screen.")}
${step(2,"Open Settings with the gear","Expand Your Favorites to enable or disable sports, leagues and teams. Expand Networks to review viewing-network preferences; Sports Packs groups coverage preferences. If a list seems short, check your selected sports and favorites-only setting.")}
${step(3,"Set your spoiler preference","Hide scores in Daily Wrap affects displayed final scores in that wrap, not all headlines or live score cards elsewhere. Open the gear again to change it at any time.")}
${box("Before you begin","Pulse helps you discover an event; a provider may require its own account, subscription or regional access. A Watch link opens an external service rather than playing video inside Pulse.")}
`, shot("settings","Settings, with expandable preferences and the score-spoiler switch.")));

pages.push(page(4, "02 / LIVE DISCOVERY", "Use Watch", `
${step(1,"Scan the Watch hub","Look at the Chaos pick and its accompanying strip, then scroll through Live Now, Up Next and recent results. A quiet feed can simply mean no eligible live fixtures are available.")}
${step(2,"Narrow ordinary schedules","Use sport or league chips and, where shown, Favorites only to focus the flat event lists. Those controls do not strictly limit Chaos Mode, which can surface a compelling game outside your favorites.")}
${step(3,"Open an event","Tap its card for status, score, time, matchup and available provider actions. Join Live is for an available live link; Starting soon may be disabled before kickoff; Watch Replay is dependent on a finished event and available replay.")}
${box("A quick reset","The Shuffle control rebuilds the Chaos selection. It is not an activity-trigger setting or a promise that the list will change if the candidate pool is small.")}
`, shot("watch","Watch: Chaos pick, event cards and bottom navigation.") + shot("watch-next","Watch lower down: next-event and schedule browsing."), "twoshots"));

pages.push(page(5, "03 / HOW CHAOS WORKS", "Tension is contextual", `
<p>Chaos ranks eligible events using favorites, anchor matchups, live status, start time, emotion and sport-aware tension. A close score is <b>not</b> the whole ranking. Without a live score, a live game starts at rank 1; a non-live event is rank 0.</p>
<table><tr><th>Sport</th><th>When tension rises</th></tr>
<tr><td>Hockey / soccer</td><td>After opening period/half: margin ≤1 = rank 3; margin 2 = rank 2. Opening P1 / 1H closeness is suppressed.</td></tr>
<tr><td>Rugby</td><td>Margin ≤7 = 3; margin 8–14 = 2.</td></tr>
<tr><td>Basketball</td><td>Final minute, within 5 OR final 2 minutes, within 3 = 4. Final 2 minutes within 6 or endgame within 3 = 3. Other one-point margins = 2. Endgame includes Q4/OT or college second half.</td></tr>
<tr><td>Racing</td><td>Race session = 3; sprint or qualifying = 2; other sessions = 1.</td></tr>
<tr><td>Cricket / other</td><td>Cricket = 1; other sports: margin ≤1 = 3, margin 2 = 2.</td></tr></table>
<p>For <b>any live sport with score data</b>, a status/period containing OT, overtime, extra, shootout or penalty adds 2 to that sport’s baseline rank, capped at 5. It does not replace the sport-specific rules above: basketball still has its own endgame thresholds and cricket normally starts at 1. The UI labels rank <b>2 Heating Up</b>, <b>3 Tight Game</b>, and <b>4+ High Drama</b>; “High Tension” appears at rank ≥3.</p>
${box("Read the strip separately","The hero is the main Chaos pick. A promoted game can lead the secondary strip visually without replacing that hero.")}
`));

pages.push(page(6, "04 / CHAOS ALERTS", "Why slot 4 changes", `
<p>Pulse compares the current and previous available live-score snapshots to detect activity. These <b>internal signals</b> inform the in-app Chaos Alert; they are not adjustable user triggers, push notifications or background monitoring.</p>
<table class="compact"><tr><th>Signal</th><th>Points</th><th>Important condition</th></tr>
<tr><td>Score change</td><td>+40</td><td>Live eligible non-tennis/cricket score increase; basketball only in final 2 min.</td></tr>
<tr><td>Overtime / extra time</td><td>+35</td><td>Hockey, soccer or rugby overtime-type status.</td></tr>
<tr><td>Late close game</td><td>+20</td><td>Sport-specific late/close criteria; see notes below.</td></tr>
<tr><td>Hockey power play / goal / goalie pulled</td><td>+20 / +25 / +25</td><td>“Power play start” signal checks an active man advantage, not a start transition; goal requires a score change.</td></tr>
<tr><td>Tennis match point / upset</td><td>+35 / +30</td><td>Match-point detail or game/set inference; upset from rank gap ≥5 with lower-ranked player leading.</td></tr>
<tr><td>Racing red flag / safety car / final laps</td><td>+30 / +20 / +25</td><td>Status data; final laps begin at ≥85% of total laps.</td></tr></table>
<p>Late-close detection includes hockey third period ≤10 min with ≤1-goal margin; soccer second half ≤1; rugby second half ≤7; tennis tied/near-tied later sets; basketball endgame ≤2 min and ≤5 points. A missing feed signal cannot produce that detection.</p>
${box("Hypothetical, not a screen capture","Suppose the fourth selected game has activity 20. An unselected live hockey game gains a goal (+40) while a current man advantage is detected (+20), totaling 60. The code names this +20 signal “Power play start,” but checks current skater counts, <b>not</b> a transition from even strength. Because 60 is at least 15 above 20, the challenger may replace <b>only slot 4</b>. The first three selected slots stay stable; the promoted game can lead the secondary strip, not the hero.")}
`));

pages.push(page(7, "05 / YOUR WEEKEND", "Six fixed ritual windows", `
<p>Tap Rituals on the bottom bar. Swipe its large cards, then tap a card to enter its guide. Each card presents a mood and a time window; the windows below are fixed in <b>Pacific Time</b>, not configurable reminders.</p>
<table><tr><th>Card</th><th>Weekly window (PT)</th><th>How to use it</th></tr>
<tr><td>Family Game Night</td><td>Friday 6–9 pm</td><td>Begin the evening with a featured pick.</td></tr>
<tr><td>Friday Night Mode</td><td>Friday 9 pm–midnight</td><td>Look for later games and a relaxed follow-up.</td></tr>
<tr><td>Warm-Up</td><td>Saturday 6 am–noon</td><td>Browse the early weekend slate.</td></tr>
<tr><td>Game Day</td><td>Saturday 4–8 pm</td><td>Follow the main Saturday window.</td></tr>
<tr><td>Extra Time</td><td>Saturday 8 pm–midnight</td><td>Catch late-session events.</td></tr>
<tr><td>Coffee &amp; Chill</td><td>Sunday 6 am–noon</td><td>Ease into Sunday’s first games.</td></tr></table>
${box("Time zone note","Individual fixture timestamps may show in your device’s zone or as UTC in certain feeds. Do not read a UTC fixture time as a PT ritual-window boundary. Check the event detail before making plans.")}
`,shot("rituals","Ritual carousel; swipe to see the other fixed windows.")));

pages.push(page(8, "06 / INSIDE A RITUAL", "Read the guide", `
${step(1,"Enter from the Rituals card","The guide opens with the window description and automatically selected Featured game, if one is eligible. Tap the featured event for its matchup sheet and available viewing action.")}
${step(2,"Browse by purpose","Favorites gathers games involving followed teams; Catch Up offers recent finished events where available; More Games presents other candidates. The groups depend on available event data, so one can be empty.")}
${step(3,"Use the chips","Sport and league chips narrow the guide’s list. If a game disappears, return to All or clear the narrowed league/sport. These are list filters, not a way to adjust the fixed ritual window.")}
${box("Featured versus list","The Featured choice is a single highlighted matchup. Choosing another featured event does not add or remove a favorite team and does not change your Serie A My Plan.")}
`,shot("ritual-detail","A ritual guide with its featured matchup and browsing sections.")));

pages.push(page(9, "07 / FEATURED OVERRIDE", "Change the featured game", `
${step(1,"Open a ritual guide","Tap one of the six Rituals cards, not a Watch card. Scroll beneath the Featured area to Favorites or More Games if necessary.")}
${step(2,"Tap the game you want","In the guide, tapping a candidate game opens its matchup modal <b>instead of normal event navigation</b>. Review the game and tap <b>Set as Featured</b>.")}
${step(3,"Confirm the new selection","Return to the guide: the chosen game appears in Featured with a <b>MANUAL</b> badge. The guide removes that game from the other lists to avoid showing the same event twice.")}
${step(4,"Return to automatic choice","Tap <b>Reset to Auto</b> by Featured or in the game modal. The ritual then uses its automatically chosen featured game again.")}
${box("How long it lasts","Manual choice persists on this device, not as an account-wide edit. An unavailable/ended selection is not kept indefinitely; old manual selections expire after about six hours. No notification is sent when the pick changes.")}
`,shot("ritual-picker","Tap a candidate inside the ritual guide to open the matchup picker.")+shot("ritual-manual","After Set as Featured: MANUAL badge and Reset to Auto."),"twoshots"));

pages.push(page(10, "08 / STORY HUB", "Four doors into Stories", `
<p>Tap the stars tab. Browse the horizontal cover carousel; swipe <b>sideways</b> to reach each of the four covers and tap the one you want. Inside a story feed, move <b>vertically</b> through its content and use the back control to return to the covers.</p>
<table><tr><th>Cover</th><th>What opens</th></tr><tr><td>The Daily Wrap</td><td>Recap, highlights, narration and matchup links.</td></tr><tr><td>What to Watch Next</td><td>Today, This Week, This Month and Next Month.</td></tr><tr><td>Trending Stories</td><td>Timely story cards, impact context and optional related media.</td></tr><tr><td>Behind the Stories</td><td>Six explainer topics including the NHL affiliates reference.</td></tr></table>
${box("Reading order","Stories can change when source content is rebuilt. A cover may remain while an individual story or fixture changes; counts and headlines in screenshots are examples only.")}
`,shot("stories","Stories entry view and horizontal cover carousel.")+shot("stories-next-cover","What to Watch Next cover.")+shot("stories-trending-cover","Trending Stories cover.")+shot("stories-behind-cover","Behind the Stories cover."),"gallery"));

pages.push(page(11, "09 / THE DAILY WRAP", "Catch up without losing control", `
${step(1,"Open the Daily Wrap cover","Read the wrap’s vertically scrolling story feed. The visible date and available cards reflect the generated content; no particular league or result is guaranteed.")}
${step(2,"Listen or read","Use the speaker/narration control if offered and mute it when you prefer silent reading. Narration is an optional playback aid, not a substitute for the on-screen text.")}
${step(3,"Follow the evidence","A story may offer a highlight, replay, or View Matchup path. Open the relevant action to check the event/provider detail; external media availability can vary.")}
${step(4,"Hide final scores","Settings → Hide scores in Daily Wrap controls score display there. It does <b>not</b> scrub every outcome from story headlines or hide live scores throughout the app.")}
${box("If a result seems old","Refresh Schedules checks fixture data; Rebuild Stories refreshes narrative content. They are separate controls.")}
`,shot("daily-wrap","Daily Wrap detail with recap cards and reading controls.")));

pages.push(page(12, "10 / WHAT’S NEXT", "Today is an action list", `
${step(1,"Open What to Watch Next","Tap the cover from Stories. The Today tab is the immediate event view and follows your device-local calendar day.")}
${step(2,"Pick a sport","Use Today’s sport chips to narrow event cards, then scroll for more. A missing sport or empty list may mean no matching event on that local day; clear chips before assuming the feed failed.")}
${step(3,"Read the full context","Tap an event card or its <b>Read more</b> action where offered to reach the matchup or a relevant explainer. The View my plan control opens the Serie A pilot, not a general reminder calendar.")}
${box("Two clocks in one guide","Ritual windows are fixed PT. Today follows your device date; a specific event may appear with a UTC timestamp in source-facing material. Verify the displayed event time and its zone before you watch.")}
`));

pages.push(page(13, "11 / WHAT’S NEXT", "Look farther ahead", `
${step(1,"Switch tabs","Choose This Week for the near-term slate; This Month and Next Month for the larger schedule overview. If weekly snapshot data is unavailable, its tab may not appear.")}
${step(2,"Read the month view correctly","Month rows group leagues and tournaments and show date ranges and season phases. Finals may appear as separate informational rows. These summaries are not promises of a fixture for every day.")}
${step(3,"Move from overview to action","For an actual event, return to Today/Watch or open a related matchup. Use the relevant sport chip or schedule filter to reduce clutter rather than treating a month league row as a watch link.")}
${box("Why weeks and months differ","The week and month sections depend on available snapshot data; the Today view uses events for the device-local day. An informational league phase may remain even when individual matches are not supplied.")}
`,shot("what-next-week","What to Watch Next: This Week schedule view.")));

pages.push(page(14, "12 / TRENDING", "Read the story, then act", `
${step(1,"Tap Trending","The feed is made of timely narrative cards; swipe/scroll vertically to read more. Kind labels can include Playoff Push, Momentum, Player Movement, Upset Alert, Rivalry Game and Week Ahead.")}
${step(2,"Check time and impact","The elapsed-time cue tells you how recent a narrative is. Impact text can point toward a Watch event or Rituals context, but it is not a guaranteed live-alert subscription.")}
${step(3,"Open the longer item","Tap <b>Read full story</b> when present. Depending on the card, the longer article may include optional media and related upcoming events. Follow a related event to its matchup and provider options.")}
${box("Keep your bearings","Narratives are generated from available source data. Time labels and topical headlines can become stale; use Rebuild Stories if needed, and confirm live information on the event card.")}
`,shot("trending","Trending detail: kind and relative time, impact, longer-story entry.")));

pages.push(page(15, "13 / BEHIND THE GAME", "Pick a playbook", `
<p>Open Behind the Stories from Stories. Scroll the topic library and tap a subject to open its self-contained article. The pages are scrollable reading material, not searchable schedules: there are no sport chips or live-event filters within these articles.</p>
<table><tr><th>Topic</th><th>Learn to recognize</th></tr><tr><td>Hockey Family Tree</td><td>NHL → AHL → ECHL development relationships.</td></tr><tr><td>Cycling Circuits</td><td>Three road Grand Tours and pairs-based Epic Series MTB races.</td></tr><tr><td>Endurance Athletics</td><td>Road, track, short mountain and ultra-trail circuits.</td></tr><tr><td>Paddling 101</td><td>South Africa’s three multi-day canoe marathons.</td></tr><tr><td>Triple Crown 101</td><td>The three US thoroughbred Classics and race-card terms.</td></tr><tr><td>Racing 101</td><td>F1 race weekends versus WRC timed stages.</td></tr></table>
${box("How to leave","Scroll to the end for the article footer, or use the back arrow to return to the topic library. Event dates and broadcaster notes in the articles are background context; check current access independently.")}
`,shot("deep-talk","Behind the Stories topic library; select one of six explainers.")));

pages.push(page(16, "PLAYBOOK / 01", "Hockey Family Tree", `
<p>This reference lists NHL clubs with their AHL development partner and ECHL affiliate(s). Open <b>Behind the Stories → Hockey Family Tree</b>; scroll club by club rather than looking for a live game card.</p>
${sub("How to read a club card","The NHL badge and team name anchor the card. Beneath it, the AHL row identifies the development partner; one or more ECHL rows may follow. “No affiliate” means the entry has no listed relationship in that tier, not that the NHL team does not exist.")}
${sub("Why it matters","Use a prospect’s organization to understand why an AHL or ECHL game might matter to NHL followers. Affiliations can change between seasons; use the article’s verification note as context and report a suspected outdated mapping through Settings.")}
${box("Try it","Find a club you follow, read its AHL row, then compare its ECHL rows. Return to Stories and look for a related game in Watch; the reference itself is not a provider link.")}
`,shot("playbook-affiliates","NHL Affiliates reference with NHL, AHL and ECHL rows.")));

pages.push(page(17, "PLAYBOOK / 02", "Cycling Circuits", `
<p>Open <b>Behind the Stories → Cycling Circuits</b>. Scroll through both sections; these are different kinds of stage racing.</p>
${sub("Grand Tours — the Big Three","Giro d’Italia (May, pink jersey), Tour de France (July, yellow jersey), and Vuelta a España (August–September) each run about three weeks on the road. Look for cumulative standings as well as stage wins.")}
${sub("Epic Series — Mountain Bike Stage Racing","Pairs race multiple stages together; Cape Epic (March), 4Islands Epic (April), Andorra Epic Pyrenees (July), Swiss Epic (August), and Wines2Whales (November) are the article’s named events. Terrain and partner pacing matter; pairs risk a penalty if they finish too far apart.")}
${box("When browsing Watch","A one-day cycling fixture is not necessarily a Grand Tour stage. Read the event’s series/session detail before assuming it corresponds to a playbook example.")}
`,shot("playbook-cycling","Cycling article: road Grand Tours and Epic Series sections.")));

pages.push(page(18, "PLAYBOOK / 03", "Endurance Athletics", `
<p>Open <b>Behind the Stories → Endurance Athletics</b> and scroll through <b>all five</b> circuits, not only the opening Marathon Majors list.</p>
<ul><li><b>World Marathon Majors:</b> Tokyo, Boston, London, Sydney, Berlin, Chicago and New York City; the article distinguishes the seven events from Abbott Six Star status for the six core majors.</li>
<li><b>Comrades Marathon:</b> South African ultramarathon between Durban and Pietermaritzburg, alternating Up/Down routes, with a strict 12-hour cutoff and tiered medals.</li>
<li><b>Wanda Diamond League:</b> track-and-field meets award event points toward a season Final; compare event disciplines, not only the meet name.</li>
<li><b>Golden Trail World Series:</b> technical, shorter mountain/trail races; examples include Zegama-Aizkorri, Sierre-Zinal and a Grand Finale.</li>
<li><b>UTMB World Series:</b> long ultra-trail events award Running Stones toward UTMB Mont-Blanc; distances and climbing are central to the story.</li></ul>
${box("Interpret the card","A meet, marathon and ultra are not interchangeable. Read the circuit heading before following any related date or provider note.")}
`,shot("playbook-endurance","Endurance article; keep scrolling for all five circuit sections.")));

pages.push(page(19, "PLAYBOOK / 04", "Paddling 101", `
<p>Open <b>Behind the Stories → Paddling 101</b> and read its three parts: the races, the format, and what to watch for.</p>
${sub("SA Big Three","Dusi (February, 120 km / three days) is known for portages; Berg River (July, 240 km / four days) tests weather and endurance; Fish River (October, 82 km / two days) is faster and technical with dam-fed rapids. A same-year sweep is an unofficial paddling triple crown.")}
${sub("How a canoe marathon works","K1 means singles, K2 doubles. Participants start in seeding batches. Rapids, flat water and overland boat carries share the course; cumulative time across days determines the leader, not only the final stage.")}
${sub("What to watch for","Watch water levels and release announcements, portage speed, and how early leaders pace themselves across successive days. The article names leading South African paddlers as context, not a guarantee of their entry.")}
`,shot("playbook-paddling","Paddling article covering races, format and viewing cues.")));

pages.push(page(20, "PLAYBOOK / 05", "Triple Crown 101", `
<p>Open <b>Behind the Stories → Triple Crown 101</b> to read the three sections: why the achievement matters, the three Classics, and race-card vocabulary.</p>
${sub("Why the sweep is rare","Only three-year-old thoroughbreds can compete, so each horse has one chance. Winning three spring races in roughly five weeks tests pace, recovery and stamina.")}
${sub("The three Classics","Kentucky Derby (first Saturday in May, Churchill Downs, 1¼ miles); Preakness Stakes (third Saturday in May, Pimlico, 1 3/16 miles); Belmont Stakes (early June, traditionally Belmont Park, 1½ miles). Verify current venue and broadcast details before a given season.")}
${sub("How to read a race card","Post position is the starting gate; morning line is an estimated pre-race price, not final odds. A furlong is ⅛ mile. Exacta predicts first and second in order; trifecta predicts the first three in order.")}
`,shot("playbook-horse","Triple Crown article: significance, three races and race-card glossary.")));

pages.push(page(21, "PLAYBOOK / 06", "Racing 101", `
<p>Open <b>Behind the Stories → Racing 101</b>; read all three sections before comparing a race event with a qualifying session.</p>
${sub("Formula 1 — the circuit pinnacle","Practice tunes a car, knockout qualifying sets the grid, sprint weekends add a shorter points race, and Sunday’s Grand Prix is the main contest. Watch tyres, pit windows and the drivers’/constructors’ standings. The article lists Monaco, Britain, Belgium, Italy, Singapore and Abu Dhabi as marquee rounds.")}
${sub("World Rally Championship","A rally spans days of timed special stages; a single car races against the clock with a co-driver reading pace notes. Monte Carlo, Safari Kenya, Finland, Acropolis Greece and Saudi Arabia illustrate how surfaces and weather change strategy.")}
${sub("How to follow a season","Compare F1 race/sprint points with WRC stage-rally, Sunday and Power Stage points. Teams have separate constructors/manufacturers stakes. The article’s broadcaster and schedule examples are contextual, not guaranteed current availability.")}
`,shot("playbook-racing","Racing article: F1, WRC and season-following sections.")));

pages.push(page(22, "14 / SAVE AN INTENTION", "My Plan · Serie A", `
${step(1,"Open My Plan","From Watch, tap View my plan; a link may also appear in What to Watch Next. This is a Serie A pilot, not a universal sports planner.")}
${step(2,"Add a match","Open an eligible Serie A fixture and choose <b>Watch live</b> or <b>Highlights</b>. These are the two viewing intentions, not stream reservations.")}
${step(3,"Manage the list","Switch between <b>This week</b> and <b>Upcoming</b>, apply the available team filter, and edit an intention or remove a match if plans change. If the page is empty, add a supported fixture first.")}
${box("Storage and delivery","The plan stays local to this device; it does not sync. Pulse does not send reminders or notifications for this plan. A Highlights intention does not guarantee a clip or replay becomes available.")}
`,shot("plan","My Plan empty state before any Serie A fixture is saved.")));

pages.push(page(23, "15 / WHEN THINGS LOOK WRONG", "Refresh & troubleshoot", `
${sub("Schedules missing or a list is empty","Check connection, enabled sports/leagues, Favorites only and any sport/league chips. Clear filters, then open Settings → Refresh Data → Refresh Schedules. An empty eligible slate is possible.")}
${sub("Stories are stale","Settings → Refresh Data → Rebuild Stories requests fresh narratives. This is separate from Refresh Schedules; refreshing events does not itself rebuild story text. A Stories pull-to-refresh may also request a rebuild.")}
${sub("An error appears","Read the exact on-screen error and retry the specific action. If it persists, record the screen, time, feature and message for support. Do not assume every empty result is a network error or suppress an explicit error.")}
${sub("Watch or Replay fails","Open the provider, check that you are signed in and that your package, territory and rights include that stream. Replay/highlights can arrive later or may never be offered. Pulse does not control third-party playback.")}
${box("Scores and alerts","Live scores depend on active data feeds and refreshes. An in-app Chaos Alert appears while Watch is active when promotion conditions are observed; no push/background alert or user trigger configuration is promised.")}
`));

pages.push(page(24, "16 / KEEP IN MIND", "Reference & boundaries", `
<table><tr><th>Question</th><th>Reliable answer</th></tr>
<tr><td>Is Chaos a strict favorite filter?</td><td>No. Favorites and anchors affect ordering, but compelling eligible games outside a flat list filter may appear.</td></tr>
<tr><td>Can I change alert thresholds?</td><td>No user-adjustable trigger controls are provided.</td></tr>
<tr><td>Does “Hide scores” mean spoiler-free?</td><td>No. Daily Wrap scores can be hidden, but headlines can reveal outcomes and live screens still show scores.</td></tr>
<tr><td>Are fixture times all Pacific?</td><td>No. Ritual windows are PT; event times may be device-local or shown as UTC in some sources.</td></tr>
<tr><td>Are the screenshots live?</td><td>No. They are authentic phone-sized web-preview captures from September 29 PT / September 30 UTC, 2026. Timestamps and scores are illustrative snapshots.</td></tr>
<tr><td>Does the plan sync or notify me?</td><td>No. The Serie A pilot is device-local and sends no reminders.</td></tr></table>
<p>Coverage is limited by data feeds, supported leagues, rights and providers. “Available” in a card never guarantees access to every fixture, score, highlight or replay. The app is a discovery layer, not a streaming subscription.</p>
<div class="closing">LOOK FOR THE MOMENT. FOLLOW THE STORY.</div>
`));

if (pages.length !== 24) throw new Error(`Expected 24 pages; found ${pages.length}`);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulse — Complete User Guide</title><style>
:root{--ink:#242236;--muted:#656377;--purple:#7040da;--teal:#117e75;--line:#e4e0ea;--pink:#d6549b}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#e9e6ee;color:var(--ink);font:14px/1.48 Arial,Helvetica,sans-serif}
.page{position:relative;width:8.5in;height:11in;overflow:hidden;background:#fff;margin:22px auto;padding:.58in .64in .67in;box-shadow:0 12px 35px #221c381a;break-after:page}
.running,.foot{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);font-size:9px;letter-spacing:.16em;font-weight:700;color:var(--muted)}
.running{padding-bottom:11px}.running b{color:var(--purple);font-size:13px}
.foot{position:absolute;bottom:.42in;left:.64in;right:.64in;border-top:1px solid var(--line);border-bottom:0;padding-top:9px}
.kicker{color:var(--purple);font-size:10px;letter-spacing:.16em;font-weight:800;margin:27px 0 7px}
h1{font:normal 35px/1.1 Georgia,serif;letter-spacing:-.035em;margin:0 0 20px}h1 em{color:var(--purple)}
h2{font-size:14px;line-height:1.3;margin:16px 0 5px;color:#302b43}p{margin:0 0 10px}b,strong{font-weight:700}
.layout{display:block}.with-image{display:grid;grid-template-columns:minmax(0,1fr) 205px;gap:20px;align-items:start}.copy{min-width:0}
.visuals{display:flex;flex-direction:column;gap:14px;min-width:0}figure{margin:0}figure img{display:block;width:100%;height:auto;border-radius:11px;border:1px solid #ddd7e4;box-shadow:0 5px 16px #31224820}figcaption{font-size:10px;color:var(--muted);line-height:1.35;margin-top:6px}figcaption b{color:var(--purple);letter-spacing:.07em}
.step{margin:0 0 14px}.step strong{display:block;color:#322448;font-size:14px}.step p{margin:4px 0 0}
.box{background:#f5f2fb;border-left:3px solid var(--purple);padding:11px 13px;margin:16px 0 0;font-size:12px}.box b{color:var(--purple)}.box p{margin:4px 0 0}
table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.38;margin:13px 0 15px}th{text-align:left;color:var(--purple);font-size:10px;text-transform:uppercase;letter-spacing:.07em;background:#f4f0fb}td,th{padding:7px 9px;vertical-align:top;border-bottom:1px solid var(--line)}td:first-child{font-weight:700;width:27%}.compact td,.compact th{padding:5px 8px}.compact td:nth-child(2){width:12%}
ul{padding-left:19px;margin:10px 0}li{margin-bottom:10px}.small{color:var(--muted);font-size:12px}.lead{font:normal 24px/1.35 Georgia,serif;max-width:575px;margin:48px 0}
.cover{background:linear-gradient(143deg,#fff 57%,#f4edff)}.cover h1{font-size:72px;margin-top:42px}.cover .layout{max-width:640px}.cover-band{border-top:3px solid var(--purple);border-bottom:1px solid var(--line);padding:20px 0;display:flex;justify-content:space-between;letter-spacing:.14em;color:var(--purple);font-size:11px;font-weight:700;margin:60px 0 30px}
.toc{columns:2;column-gap:28px}.toc a{display:flex;break-inside:avoid;justify-content:space-between;gap:7px;border-bottom:1px solid var(--line);padding:7px 0;color:var(--ink);text-decoration:none;font-size:12px}.toc b{color:var(--purple)}.toc+.small{margin-top:23px}
.twoshots .with-image{grid-template-columns:minmax(0,1fr) 202px}.twoshots .visuals{flex-direction:row;gap:8px}.twoshots figure{width:50%;min-width:0}.twoshots figcaption{font-size:9px}
.gallery .with-image{grid-template-columns:minmax(0,1fr) 260px}.gallery .visuals{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gallery figcaption{font-size:8px}.gallery .copy{font-size:12px}.gallery table{font-size:11px}.gallery td,.gallery th{padding:5px}.gallery .box{font-size:11px}
.closing{font:normal 25px Georgia,serif;letter-spacing:.02em;color:var(--purple);border-top:3px solid var(--purple);margin-top:36px;padding-top:21px}
@page{size:letter;margin:0}@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{margin:0;box-shadow:none;page-break-after:always;break-after:page} .page:last-child{page-break-after:auto;break-after:auto}}
@media screen and (max-width:820px){body{background:white}.page{width:100%;height:auto;min-height:0;overflow:visible;margin:0;box-shadow:none;padding:25px 22px 60px;border-bottom:2px solid var(--line)}.foot{left:22px;right:22px;bottom:15px}.with-image,.twoshots .with-image,.gallery .with-image{display:block}.visuals{max-width:270px;margin:20px auto}.twoshots .visuals{max-width:380px}.gallery .visuals{max-width:420px}.toc{columns:1}.cover h1{font-size:55px}}
</style></head><body><main>${pages.join("\n")}</main></body></html>`;

const used = [...html.matchAll(/alt="([^"]+)"/g)].length;
if (used !== images.length) throw new Error(`Expected ${images.length} screenshots, embedded ${used}`);
fs.writeFileSync(path.join(root, "Pulse-Complete-User-Guide.html"), html);
const pdf = path.join(root, "Pulse-Complete-User-Guide.pdf");
const chrome = process.env.CHROMIUM || "/repl/tools/bin/chromium";
execFileSync(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, `file://${path.join(root, "Pulse-Complete-User-Guide.html")}`], { stdio: "pipe", timeout: 120000 });
console.log(`Wrote ${pdf}; ${pages.length} designed pages; ${used} embedded screenshots.`);