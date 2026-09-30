// Run with: node deliverables/pulse-manual/build-manual.js
// The resulting HTML embeds the five existing phone screenshots as JPEG data URIs.
const fs = require("node:fs");
const path = require("node:path");

const dir = __dirname;
const image = (name, alt) => {
  const bytes = fs.readFileSync(path.join(dir, "screenshots", `${name}.jpg`));
  return `<img src="data:image/jpeg;base64,${bytes.toString("base64")}" alt="${alt}" width="402" height="874">`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Pulse — User Manual</title>
<style>
  :root { --ink:#212034; --muted:#646477; --line:#e6e3ef; --purple:#7040da; --teal:#129c89; --pink:#dc519e; --paper:#fff; }
  *, *::before, *::after { box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body { margin:0; background:#f2f0f5; color:var(--ink); font:16px/1.6 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .document { max-width:930px; margin:28px auto; padding:0 64px 70px; background:var(--paper); box-shadow:0 14px 45px #30284914; }
  a { color:var(--purple); text-underline-offset:3px; }
  a:hover { color:var(--pink); }
  .topline { display:flex; align-items:center; justify-content:space-between; padding:29px 0 17px; border-bottom:1px solid var(--line); font-size:11px; letter-spacing:.16em; text-transform:uppercase; font-weight:800; color:var(--muted); }
  .brand { display:flex; align-items:center; gap:9px; font-size:14px; letter-spacing:.09em; color:var(--ink); }
  .brandmark { color:var(--purple); font-size:25px; line-height:1; }
  .hero { padding:67px 0 37px; border-bottom:1px solid var(--line); }
  .eyebrow { margin:0 0 15px; color:var(--purple); font-size:11px; letter-spacing:.19em; text-transform:uppercase; font-weight:800; }
  .hero h1 { font-family:Georgia,"Times New Roman",serif; font-size:clamp(54px,9vw,88px); font-weight:400; line-height:.98; letter-spacing:-.055em; margin:0 0 23px; }
  .hero h1 em { color:var(--purple); font-weight:400; }
  .lede { max-width:570px; color:#4b4a5e; font-size:20px; line-height:1.48; margin:0; }
  .ribbon { display:flex; gap:8px; margin-top:32px; }
  .ribbon span { width:45px; height:4px; border-radius:4px; background:var(--purple); }
  .ribbon span:nth-child(2) { background:var(--teal); }
  .ribbon span:nth-child(3) { background:var(--pink); }
  .intro-grid { display:grid; grid-template-columns:1fr 1fr; gap:42px; padding:35px 0 38px; }
  .intro-grid h2 { font-family:Georgia,"Times New Roman",serif; font-size:24px; font-weight:400; margin:0 0 14px; }
  .contents { list-style:none; margin:0; padding:0; }
  .contents li { border-bottom:1px solid var(--line); }
  .contents a { display:flex; align-items:baseline; gap:14px; padding:7px 0; text-decoration:none; color:var(--ink); font-size:14px; }
  .contents a:hover { color:var(--purple); }
  .contents b { font-size:11px; letter-spacing:.08em; color:var(--purple); }
  .note { padding:18px 21px; background:#f7f5fc; border-left:3px solid var(--purple); color:#4b4a60; font-size:13px; line-height:1.65; }
  .note strong { color:var(--ink); }
  section { border-top:1px solid var(--line); padding:36px 0 40px; scroll-margin-top:20px; }
  .section-head { display:grid; grid-template-columns:55px 1fr; gap:12px; align-items:start; margin-bottom:16px; }
  .num { color:var(--purple); font-size:12px; font-weight:800; letter-spacing:.1em; padding-top:10px; }
  .section-head h2 { font:400 36px/1.15 Georgia,"Times New Roman",serif; letter-spacing:-.035em; margin:0; }
  .section-head p { color:var(--muted); margin:7px 0 0; max-width:590px; }
  .body-indent { padding-left:67px; }
  .steps { margin:0; padding-left:20px; }
  .steps li { padding-left:6px; margin:0 0 10px; }
  .steps li::marker { color:var(--purple); font-weight:800; }
  p { margin:0 0 13px; }
  .feature { display:grid; grid-template-columns:minmax(0,1fr) 232px; gap:31px; align-items:start; padding-left:67px; }
  .feature-copy { min-width:0; }
  figure { margin:0; }
  .screen { max-width:232px; margin-left:auto; }
  .screen img { display:block; width:100%; height:auto; border-radius:16px; border:1px solid #dcd9e4; box-shadow:0 7px 23px #30284919; }
  figcaption { font-size:11px; line-height:1.5; color:var(--muted); margin-top:9px; }
  figcaption strong { color:var(--ink); }
  .callout { margin:18px 0 0; border-radius:7px; padding:13px 15px; background:#f1faf8; border-left:3px solid var(--teal); font-size:13px; line-height:1.55; }
  .callout.pink { background:#fdf3f9; border-color:var(--pink); }
  .callout.purple { background:#f7f4fd; border-color:var(--purple); }
  .tag { display:inline-block; color:var(--teal); font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.11em; margin:9px 0 7px; }
  .window-list { margin:16px 0 0; border-top:1px solid var(--line); }
  .window { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; padding:7px 0; border-bottom:1px solid var(--line); font-size:13px; line-height:1.35; }
  .window span:last-child { color:var(--muted); white-space:nowrap; }
  .mini-heading { font-weight:750; font-size:14px; margin:16px 0 7px; }
  .troubleshooting { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding-left:67px; }
  .trouble { border:1px solid var(--line); padding:16px 18px; break-inside:avoid; }
  .trouble h3 { font-size:15px; margin:0 0 7px; }
  .trouble p { font-size:13px; color:#55546a; margin:0; }
  .reference { padding-left:67px; }
  .reference ul { margin:0; padding-left:20px; }
  .reference li { margin:0 0 10px; padding-left:4px; }
  .closing { margin:0 0 8px; padding:23px 0 0; border-top:1px solid var(--line); color:var(--muted); font-size:11px; line-height:1.6; }
  @media (max-width:650px) {
    body { background:#fff; }
    .document { margin:0; padding:0 22px 38px; box-shadow:none; }
    .topline { padding-top:19px; }
    .hero { padding:49px 0 33px; }
    .hero h1 { font-size:58px; }
    .lede { font-size:18px; }
    .intro-grid { grid-template-columns:1fr; gap:19px; }
    section { padding:31px 0; }
    .section-head { grid-template-columns:39px 1fr; gap:4px; }
    .section-head h2 { font-size:30px; }
    .body-indent, .reference { padding-left:43px; }
    .feature { grid-template-columns:1fr; padding-left:43px; gap:18px; }
    .screen { max-width:210px; margin:0 auto; }
    .troubleshooting { padding-left:43px; grid-template-columns:1fr; }
  }
  @page { size:letter; margin:0.59in 0.65in 0.62in; }
  @media print {
    html { scroll-behavior:auto; }
    body { background:#fff; font-size:10pt; line-height:1.43; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .document { width:auto; max-width:none; margin:0; padding:0; box-shadow:none; }
    .topline { padding:0 0 10pt; }
    .hero { padding:30pt 0 22pt; }
    .hero h1 { font-size:59pt; }
    .lede { font-size:14pt; }
    .intro-grid { padding:23pt 0 16pt; }
    .intro-grid h2 { font-size:17pt; }
    .contents a { font-size:9pt; padding:5pt 0; }
    .note { font-size:8.5pt; }
    section { padding:24pt 0 20pt; }
    .section-head { margin-bottom:12pt; }
    .section-head h2 { font-size:25pt; }
    .section-head p { margin-top:3pt; }
    .feature { grid-template-columns:minmax(0,1fr) 145pt; gap:18pt; }
    .screen { max-width:145pt; }
    figcaption { font-size:8pt; }
    .callout { margin-top:11pt; padding:9pt 11pt; font-size:8.5pt; }
    .window { font-size:8.5pt; padding:4pt 0; }
    .tag { font-size:8pt; }
    .trouble { padding:10pt 12pt; }
    .trouble p { font-size:8.5pt; }
    .steps li { margin-bottom:6pt; }
    .feature, figure, .section-head, .window, .intro-grid, .callout { break-inside:avoid; }
    a { color:inherit; text-decoration:none; }
    #quick-start { break-before:page; }
    #rituals, #stories, #settings, #plan, #refresh { break-before:page; }
  }
</style>
</head>
<body>
<main class="document">
  <header class="topline"><div class="brand"><span class="brandmark" aria-hidden="true">⌁</span> PULSE</div><span>User manual · September 2026</span></header>
  <div class="hero">
    <p class="eyebrow">A guide to your viewing day</p>
    <h1>Follow the <em>pulse.</em></h1>
    <p class="lede">Find what is on, settle into a weekend ritual, catch up on stories, and make a simple plan for Serie A.</p>
    <div class="ribbon" aria-hidden="true"><span></span><span></span><span></span></div>
  </div>
  <div class="intro-grid">
    <nav aria-label="Contents">
      <h2>In this guide</h2>
      <ol class="contents">
        <li><a href="#quick-start"><b>01</b> Quick start</a></li>
        <li><a href="#watch"><b>02</b> Watch</a></li>
        <li><a href="#rituals"><b>03</b> Rituals</a></li>
        <li><a href="#stories"><b>04</b> Stories</a></li>
        <li><a href="#settings"><b>05</b> Settings &amp; favorites</a></li>
        <li><a href="#plan"><b>06</b> My Plan · Serie A pilot</a></li>
        <li><a href="#refresh"><b>07</b> Refresh &amp; troubleshooting</a></li>
        <li><a href="#notes"><b>08</b> Important notes</a></li>
      </ol>
    </nav>
    <aside class="note"><strong>About these images.</strong> The screenshots are from an actual phone-sized web preview captured September 29, 2026 (PT). Native screens may differ. Visible fixture dates, scores, counts, and event times are examples from that capture—not a current schedule.</aside>
  </div>

  <section id="quick-start">
    <div class="section-head"><span class="num">01 /</span><div><h2>Quick start</h2><p>Three destinations, one place to begin.</p></div></div>
    <div class="body-indent">
      <ol class="steps">
        <li>Use the bottom tabs: <strong>Watch</strong> (pulse icon), <strong>Rituals</strong> (shirt icon), and <strong>Stories</strong> (stars icon).</li>
        <li>Start in <strong>Watch</strong> for current and next events. Tap a card for its details and viewing options.</li>
        <li>Open a <strong>gear</strong> to reach Settings; choose favorites and viewing preferences there. You can return to Watch, Rituals, or Stories using the bottom tabs.</li>
      </ol>
      <div class="callout">Pulse helps you discover and navigate events. To watch a stream, you need your own access to the relevant provider or service; video does not play inside Pulse.</div>
    </div>
  </section>

  <section id="watch">
    <div class="section-head"><span class="num">02 /</span><div><h2>Watch</h2><p>Find the live moment, then look ahead.</p></div></div>
    <div class="feature">
      <div class="feature-copy">
        <ol class="steps">
          <li>Tap the <strong>pulse tab</strong>. Browse current and next events; scroll for more cards and sections.</li>
          <li>See <strong>Chaos Mode</strong> for a ranked, compelling live pick when eligible events are available. It is a discovery signal, not a guarantee of coverage.</li>
          <li>Tap an event card for details and available viewing links. An upcoming event shows a disabled <strong>Starting soon</strong> action; a live event may show <strong>Join Live</strong>; a finished event may show <strong>Watch Replay</strong>.</li>
        </ol>
        <div class="callout purple"><strong>Availability varies.</strong> A button or provider listing does not guarantee that a stream or replay is accessible. Provider subscriptions, location, rights, and replay availability may apply.</div>
      </div>
      <figure class="screen">${image("watch", "Watch tab showing Chaos Mode, live event cards, View my plan, and the bottom navigation")}
        <figcaption><strong>Watch preview.</strong> Chaos Mode appears above live cards; the bottom pulse icon identifies this tab.</figcaption>
      </figure>
    </div>
  </section>

  <section id="rituals">
    <div class="section-head"><span class="num">03 /</span><div><h2>Rituals</h2><p>A weekend guide organized by viewing mood.</p></div></div>
    <div class="feature">
      <div class="feature-copy">
        <ol class="steps">
          <li>Tap the <strong>shirt tab</strong> to open Rituals.</li>
          <li>Swipe through the ritual carousel to browse each themed window. Tap a ritual card to open its guide and featured events.</li>
        </ol>
        <p class="tag">Weekly windows · all Pacific Time</p>
        <div class="window-list" aria-label="Ritual weekly windows">
          <div class="window"><strong>Family Game Night</strong><span>Fri 6–9 pm</span></div>
          <div class="window"><strong>Friday Night Mode</strong><span>Fri 9 pm–midnight</span></div>
          <div class="window"><strong>Warm-Up</strong><span>Sat 6 am–noon</span></div>
          <div class="window"><strong>Game Day</strong><span>Sat 4–8 pm</span></div>
          <div class="window"><strong>Extra Time</strong><span>Sat 8 pm–midnight</span></div>
          <div class="window"><strong>Coffee &amp; Chill</strong><span>Sun 6 am–noon</span></div>
        </div>
        <div class="callout">The ritual windows above are defined in PT. Times shown on individual event cards may follow your device’s time zone.</div>
      </div>
      <figure class="screen">${image("rituals", "Rituals tab showing the Family Game Night carousel card and shirt tab")}
        <figcaption><strong>Rituals preview.</strong> Swipe the large cards; tap one to read its guide.</figcaption>
      </figure>
    </div>
  </section>

  <section id="stories">
    <div class="section-head"><span class="num">04 /</span><div><h2>Stories</h2><p>The day’s narratives, together.</p></div></div>
    <div class="feature">
      <div class="feature-copy">
        <ol class="steps">
          <li>Tap the <strong>stars tab</strong> to open Stories.</li>
          <li>Tap <strong>The Daily Wrap</strong> card to open the full wrap and read its stories.</li>
          <li>To control final-score spoilers <em>in the wrap</em>, open Settings and adjust <strong>Hide scores in Daily Wrap</strong>.</li>
        </ol>
        <div class="callout pink"><strong>Spoiler scope:</strong> hiding scores in the Daily Wrap does not hide scores across every live or event screen. Treat live scores elsewhere in Pulse as visible.</div>
      </div>
      <figure class="screen">${image("stories", "Stories tab showing The Daily Wrap card and stars tab")}
        <figcaption><strong>Stories preview.</strong> Tap the Daily Wrap cover to read the full view.</figcaption>
      </figure>
    </div>
  </section>

  <section id="settings">
    <div class="section-head"><span class="num">05 /</span><div><h2>Settings &amp; favorites</h2><p>Make discovery fit what you follow.</p></div></div>
    <div class="feature">
      <div class="feature-copy">
        <ol class="steps">
          <li>Tap a <strong>gear</strong> to open Settings. Expand <strong>Your Favorites</strong> to manage favorites.</li>
          <li>Use <strong>Only show favorites in schedules</strong> to restrict schedule lists to your favorites. If a schedule looks empty, check this filter first.</li>
          <li>Expand <strong>Sports Packs</strong> and <strong>Networks</strong> to review those preferences.</li>
          <li><strong>Hide scores in Daily Wrap</strong> is on by default; turn it off if you want final scores shown on wrap story cards.</li>
        </ol>
        <div class="callout purple">Settings groups expand when tapped. The screenshot shows their collapsed state; options such as the favorites-only schedule filter appear inside the expanded group.</div>
      </div>
      <figure class="screen">${image("settings", "Settings screen showing the Hide scores in Daily Wrap switch and collapsed preference groups")}
        <figcaption><strong>Settings preview.</strong> The teal switch indicates Daily Wrap score hiding is enabled.</figcaption>
      </figure>
    </div>
  </section>

  <section id="plan">
    <div class="section-head"><span class="num">06 /</span><div><h2>My Plan</h2><p>A small, local viewing plan for Serie A.</p></div></div>
    <div class="feature">
      <div class="feature-copy">
        <ol class="steps">
          <li>On Watch, tap <strong>View my plan</strong> to open My Plan. This is a <strong>Serie A pilot only</strong>.</li>
          <li>Open a Serie A event and choose <strong>Watch live</strong> or <strong>Highlights</strong> to record your viewing intention.</li>
          <li>Back in My Plan, switch between <strong>This week</strong> and <strong>Upcoming</strong>; use the available filter, change an intention, or remove an item as needed.</li>
        </ol>
        <div class="callout pink">Your plan is stored locally on this device; it does not sync across devices. “Highlights” is an intention, not a promise that highlights will exist. No reminders or notifications are promised.</div>
      </div>
      <figure class="screen">${image("plan", "My Plan Serie A empty state with This week and Upcoming tabs")}
        <figcaption><strong>My Plan preview.</strong> The empty state is shown deliberately, before any Serie A match has been added.</figcaption>
      </figure>
    </div>
  </section>

  <section id="refresh">
    <div class="section-head"><span class="num">07 /</span><div><h2>Refresh &amp; troubleshooting</h2><p>Start with filters, then check the data.</p></div></div>
    <div class="body-indent">
      <p>In <strong>Settings → Refresh Data</strong>, use <strong>Refresh Schedules</strong> to request schedule data again. <strong>Rebuild Stories</strong> is a separate action for story content; refreshing schedules does not replace rebuilding stories.</p>
    </div>
    <div class="troubleshooting">
      <div class="trouble"><h3>Schedule looks empty?</h3><p>Check <strong>Only show favorites in schedules</strong> and your selected preferences. Clear a restrictive filter, then try Refresh Schedules.</p></div>
      <div class="trouble"><h3>Connection or API error?</h3><p>Check your connection and retry the relevant refresh. If it persists, capture a screenshot showing the <strong>exact error message</strong> and where it appeared; do not assume the error is caused by a filter.</p></div>
      <div class="trouble"><h3>Story content looks stale?</h3><p>Use <strong>Rebuild Stories</strong> under Refresh Data. This is distinct from Refresh Schedules.</p></div>
      <div class="trouble"><h3>Provider link not working?</h3><p>Check your provider access and availability in your region. A listed stream or replay may be unavailable even when its event card is visible.</p></div>
    </div>
  </section>

  <section id="notes">
    <div class="section-head"><span class="num">08 /</span><div><h2>Important notes</h2><p>What the guide does—and does not—promise.</p></div></div>
    <div class="reference">
      <ul>
        <li>Coverage depends on available data. Pulse does not guarantee complete fixtures or live scores for every league, or that every event has a stream, replay, or highlights.</li>
        <li>Ritual <strong>window definitions</strong> use Pacific Time. Individual fixture times can be displayed according to your device; check the event detail for the time shown to you.</li>
        <li>The five screenshots are authentic phone-sized <strong>web preview</strong> captures from September 29, 2026 (PT). A native build can look different. Dates, scores, counts, and times pictured are illustrative snapshots, not live schedule information.</li>
        <li>This manual describes discovery and navigation. It does not promise in-app video playback, reminders, notifications, or cross-device plan synchronization.</li>
      </ul>
    </div>
  </section>
  <footer class="closing">PULSE · USER MANUAL <span aria-hidden="true">/</span> Use the contents links to jump between sections in the HTML edition.</footer>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(dir, "Pulse-User-Manual.html"), html);
console.log(`Wrote ${path.join(dir, "Pulse-User-Manual.html")} (${Buffer.byteLength(html)} bytes)`);