import { strict as assert } from "node:assert";
import { ApiFailure, checkApiResponse, formatApiFailure, parseApiJson } from "../lib/api-errors";

async function main() {
  const origin = "https://example.test";
  assert.deepEqual(
    await parseApiJson(new Response('{"events":[]}', { headers: { "Content-Type": "application/json; charset=utf-8" } }), origin),
    { events: [] },
  );
  // apiRequest validates the status and Content-Type before returning a Response;
  // parsing afterward must still be able to read the untouched success body.
  const checked = new Response('{"success":true}', { headers: { "Content-Type": "application/json" } });
  await checkApiResponse(checked, origin);
  assert.equal(checked.bodyUsed, false);
  assert.deepEqual(await parseApiJson(checked, origin), { success: true });
  await assert.rejects(
    parseApiJson(new Response("<html>expo router shell</html>", { headers: { "Content-Type": "text/html" } }), origin),
    (error: unknown) => error instanceof ApiFailure && error.kind === "non-json" &&
      error.message.includes("routing/proxy") && !error.message.includes("expo router shell"),
  );
  await assert.rejects(
    parseApiJson(new Response("{broken", { headers: { "Content-Type": "application/json" } }), origin),
    (error: unknown) => error instanceof ApiFailure && error.kind === "invalid-json",
  );
  await assert.rejects(
    checkApiResponse(new Response('{"code":"SCRIPT_TIMEOUT","error":"secret path"}', {
      status: 504, headers: { "Content-Type": "application/json" },
    }), origin),
    (error: unknown) => error instanceof ApiFailure && error.status === 504 &&
      error.message.includes("time limit") && !error.message.includes("secret path"),
  );
  await assert.rejects(
    checkApiResponse(new Response("<html>private contents</html>", { status: 502, headers: { "Content-Type": "text/html" } }), origin),
    (error: unknown) => error instanceof ApiFailure && error.status === 502 &&
      !error.message.includes("private contents"),
  );
  assert.match(formatApiFailure({ kind: "network", origin }), /Cannot reach API/);
  assert.match(formatApiFailure({ kind: "configuration", origin: null }), /unresolved API origin/);
  console.log("API error reporting tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });