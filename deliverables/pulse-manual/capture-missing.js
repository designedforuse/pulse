// Capture real web-preview states via Chromium DevTools Protocol (no app mutations).
// Usage: REPLIT_DEV_DOMAIN=... node deliverables/pulse-manual/capture-missing.js
const { spawn } = require("node:child_process");
const { writeFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const WebSocket = require("ws");

const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain) throw new Error("REPLIT_DEV_DOMAIN is required");
const origin = `https://${domain}`;
const out = path.join(__dirname, "screenshots");
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let chrome, ws, serial = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 25000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    let result;
    try { result = await evaluate(expression); } catch { await sleep(350); continue; }
    if (result) return result;
    await sleep(350);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}
async function navigate(route, expression) {
  await send("Page.navigate", { url: origin + route });
  await waitFor(expression, 40000);
  await sleep(1700); // allow fonts and remote images to finish painting
  console.log(route, (await evaluate("document.body.innerText")).slice(0, 165).replace(/\n/g, " / "));
}
async function click(expression) {
  const ok = await evaluate(`(() => { const el = ${expression}; if (!el) return false; el.scrollIntoView({block:'center'}); el.click(); return true; })()`);
  if (!ok) throw new Error(`Missing click target: ${expression}`);
  await sleep(800);
}
async function capture(name) {
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 89, captureBeyondViewport: false });
  writeFileSync(path.join(out, `${name}.jpg`), Buffer.from(data, "base64"));
  console.log("Saved", name);
}
async function main() {
  const port = 19371;
  chrome = spawn(process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/repl/tools/bin/chromium", [
    "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/pulse-manual-capture-${process.pid}`, "about:blank",
  ], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 100; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = tabs.find((x) => x.type === "page")?.webSocketDebuggerUrl;
      if (target) break;
    } catch {}
    await sleep(150);
  }
  if (!target) throw new Error("Chromium CDP endpoint did not start");
  ws = new WebSocket(target);
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  ws.on("message", (bytes) => {
    const msg = JSON.parse(bytes.toString());
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result);
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Emulation.setTimezoneOverride", { timezoneId: "America/Los_Angeles" });

  // The six actual playbook routes, rendered with live app data/content.
  for (const [name, route] of process.env.SKIP_PLAYBOOKS ? [] : [
    ["playbook-affiliates", "/affiliates"],
    ["playbook-cycling", "/cycling-circuits"],
    ["playbook-endurance", "/endurance-athletics"],
    ["playbook-paddling", "/paddling-101"],
    ["playbook-horse", "/horse-racing-101"],
    ["playbook-racing", "/racing-101"],
  ]) {
    await navigate(route, "document.body.innerText.length > 110 && !document.body.innerText.includes('Loading…')");
    await capture(name);
  }

  await navigate("/", "document.body.innerText.length > 100");
  if (!(await evaluate("!!document.querySelector('[data-testid=\"stories-deep-talk-tile\"]')"))) {
    console.log("Home view:", (await evaluate("document.body.innerText")).slice(0, 500));
    await click(`[...document.querySelectorAll('[role="tab"]')].find(el => el.innerText.includes('Stories'))`);
  }
  await waitFor("!!document.querySelector('[data-testid=\"stories-deep-talk-tile\"]')", 40000);
  // Actual horizontally paging ScrollView: move the scroll container to each live slide.
  async function slide(index, expected) {
    const result = await evaluate(`(() => {
      const tile = document.querySelector('[data-testid="stories-deep-talk-tile"]');
      const scroller = tile?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement;
      if (!scroller) return null;
      const children = [...scroller.firstElementChild.children];
      const target = children[${index}];
      if (!target || !target.innerText.includes(${JSON.stringify(expected)})) return {length:children.length,labels:children.map(c=>c.innerText.slice(0,60))};
      scroller.scrollLeft = ${index} * scroller.clientWidth;
      return {width:scroller.clientWidth,left:scroller.scrollLeft,index:${index}};
    })()`);
    if (!result || !("left" in result)) throw new Error(`Missing carousel slide ${index}: ${JSON.stringify(result)}`);
    await sleep(750);
  }
  await slide(1, "WHAT TO");
  await capture("stories-next-cover");
  const trendingIndex = await evaluate(`(() => {
    const tile = document.querySelector('[data-testid="stories-trending-tile"]');
    return tile ? [...tile.parentElement.parentElement.parentElement.parentElement.children].findIndex(c => c.contains(tile)) : -1;
  })()`);
  if (trendingIndex < 0) throw new Error("No real trending-stories slide in this feed");
  await slide(trendingIndex, "TRENDING");
  await capture("stories-trending-cover");
  const behindIndex = await evaluate(`(() => {
    const tile = document.querySelector('[data-testid="stories-deep-talk-tile"]');
    return [...tile.parentElement.parentElement.parentElement.parentElement.children].findIndex(c => c.contains(tile));
  })()`);
  await slide(behindIndex, "BEHIND THE");
  await capture("stories-behind-cover");

  await navigate("/month-schedule", "document.body.innerText.includes('This Week')");
  await click(`[...document.querySelectorAll('[role="tab"]')].find(el => el.innerText === 'This Week')`);
  console.log("Week tab:", await evaluate(`[...document.querySelectorAll('[role="tab"]')].map(el=>({text:el.innerText,selected:el.getAttribute('aria-selected'),class:el.className.slice(0,80)}))`));
  await capture("what-next-week");

  // A featured event is auto-selected. A non-featured event card in More Games
  // opens the picker on a regular tap; UnifiedEventCard does not register onLongPress.
  for (const ritual of ["saturday_sunrise", "saturday_spotlight", "saturday_after_hours", "sunday_session", "friday_lights", "friday_after_hours"]) {
    await navigate(`/guide/${ritual}`, "document.body.innerText.includes('More Games') || document.body.innerText.includes('No Games Right Now')");
    const count = await evaluate("document.querySelectorAll('[data-testid^=\"event-\"]').length");
    if (count < 2) { console.log("No alternate card", ritual, count); continue; }
    const eventId = await evaluate(`(() => {
      const cards = [...document.querySelectorAll('[data-testid^="event-"]')];
      return cards[1]?.getAttribute('data-testid');
    })()`);
    await click(`document.querySelector('[data-testid=${JSON.stringify(eventId)}]')`);
    await waitFor("document.body.innerText.includes('Set as Featured')");
    await capture("ritual-picker");
    await click(`document.querySelector('[data-testid="set-featured-btn"]')`);
    await waitFor("document.body.innerText.includes('MANUAL') && document.body.innerText.includes('Reset to Auto')");
    await capture("ritual-manual");
    console.log("Featured selection", ritual, eventId);
    break;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  ws?.close();
  chrome?.kill();
});