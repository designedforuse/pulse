import { resolveApiBaseUrl } from "../lib/api-url";

function assertEqual(actual: string, expected: string, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log("\n=== API URL resolution tests ===\n");

assertEqual(
  resolveApiBaseUrl({
    webOrigin: "https://preview.example.test",
    configuredDomain: "api.example.test",
    manifestHost: "metro.example.test",
    isDevelopment: true,
  }),
  "https://preview.example.test/",
  "web always uses its same origin",
);

assertEqual(
  resolveApiBaseUrl({
    configuredDomain: "stale.example.test",
    manifestHost: "current.replit.dev",
    manifestUrl: "https://current.replit.dev/index.bundle",
    isDevelopment: true,
  }),
  "https://current.replit.dev/",
  "native development follows the current Expo manifest",
);

assertEqual(
  resolveApiBaseUrl({
    configuredDomain: "api.example.test",
    manifestHost: "metro.example.test",
    isDevelopment: false,
  }),
  "https://api.example.test/",
  "production native uses the configured API domain",
);

assertEqual(
  resolveApiBaseUrl({
    configuredDomain: "https://project.replit.dev:5000",
    isDevelopment: false,
  }),
  "https://project.replit.dev/",
  "Replit public URLs do not retain the internal backend port",
);

assertEqual(
  resolveApiBaseUrl({
    configuredDomain: "$REPLIT_DEV_DOMAIN",
    manifestHost: "192.168.1.20:8081",
    manifestUrl: "exp://192.168.1.20:8081",
    isDevelopment: true,
  }),
  "http://192.168.1.20:8081/",
  "LAN Expo manifests retain their HTTP transport",
);

assertEqual(
  resolveApiBaseUrl({
    manifestHost: "current.replit.dev",
    manifestUrl: "exp://current.replit.dev",
    isDevelopment: true,
  }),
  "https://current.replit.dev/",
  "Replit Expo links always use HTTPS for API requests",
);

console.log("\nAll API URL resolution tests passed.\n");