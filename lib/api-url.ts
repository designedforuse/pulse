export interface ApiUrlOptions {
  webOrigin?: string | null;
  configuredDomain?: string | null;
  manifestHost?: string | null;
  manifestUrl?: string | null;
  isDevelopment?: boolean;
}

function isReplitHost(hostname: string): boolean {
  return hostname.endsWith(".replit.dev") || hostname.endsWith(".repl.co");
}

function toBaseUrl(value: string, schemeHint?: string | null): string {
  const trimmed = value.trim();
  const hintedScheme =
    schemeHint?.startsWith("https:") || schemeHint?.startsWith("exps:")
      ? "https"
      : schemeHint?.startsWith("http:") || schemeHint?.startsWith("exp:")
        ? "http"
        : null;
  const url = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
      ? trimmed.replace(/^exps?:/i, (scheme) => scheme.toLowerCase() === "exps:" ? "https:" : "http:")
      : `${hintedScheme ?? "https"}://${trimmed}`,
  );

  // Replit routes public workflow traffic by hostname. A literal public
  // :5000 URL is not the Express endpoint.
  if (isReplitHost(url.hostname)) {
    url.protocol = "https:";
    if (url.port === "5000") url.port = "";
  }

  // hostUri can include a platform path in exported Expo manifests. API
  // routes always live at the host root.
  return `${url.origin}/`;
}

export function resolveApiBaseUrl(options: ApiUrlOptions): string {
  const webOrigin = options.webOrigin?.trim();
  if (webOrigin) {
    return toBaseUrl(webOrigin);
  }

  const configured = options.configuredDomain?.trim();
  const validConfigured = configured && !configured.includes("$") ? configured : null;
  const manifestHost = options.manifestHost?.trim();

  // During native development, the manifest is the authoritative address of
  // the currently running Metro session. Environment values can remain in a
  // cached bundle after a frontend workflow restart.
  if (options.isDevelopment && manifestHost) {
    return toBaseUrl(manifestHost, options.manifestUrl);
  }

  if (validConfigured) {
    return toBaseUrl(validConfigured);
  }

  if (manifestHost) {
    return toBaseUrl(manifestHost, options.manifestUrl);
  }

  throw new Error("Unable to resolve API origin");
}