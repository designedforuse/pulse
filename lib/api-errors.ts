export type ApiFailureKind = "configuration" | "network" | "http" | "non-json" | "invalid-json";

export class ApiFailure extends Error {
  constructor(
    public readonly kind: ApiFailureKind,
    public readonly origin: string | null,
    public readonly status?: number,
    public readonly contentType?: string,
    public readonly code?: string,
  ) {
    super(formatApiFailure({ kind, origin, status, contentType, code }));
    this.name = "ApiFailure";
  }
}

const safeCodes: Record<string, string> = {
  SCRIPT_TIMEOUT: "Schedule job exceeded its server time limit",
  SCRIPT_FAILED: "Server schedule job failed",
  NO_SCHEDULE: "Server did not produce a schedule",
};

export function formatApiFailure({
  kind, origin, status, contentType, code,
}: {
  kind: ApiFailureKind;
  origin: string | null;
  status?: number;
  contentType?: string;
  code?: string;
}): string {
  const target = origin ?? "unresolved API origin";
  if (kind === "configuration") return `API URL configuration failed (${target}). Check the Expo session/API domain.`;
  if (kind === "network") return `Cannot reach API at ${target}. Check phone network and API availability.`;
  if (kind === "http") {
    const detail = code && safeCodes[code] ? ` — ${safeCodes[code]}` : "";
    return `API at ${target} returned HTTP ${status ?? "unknown"}${detail}. Check server availability.`;
  }
  const type = contentType ? contentType.split(";")[0].trim().slice(0, 60) : "missing Content-Type";
  return kind === "non-json"
    ? `API at ${target} returned ${type} (HTTP ${status ?? "unknown"}), not JSON. Check API routing/proxy.`
    : `API at ${target} returned invalid JSON (HTTP ${status ?? "unknown"}).`;
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiFailure ? error.message : "Unexpected API error. Check the API configuration.";
}

export async function checkApiResponse(res: Response, origin: string): Promise<void> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    // Never display raw HTML, server stack traces, URLs, or script stdout.
    let code: string | undefined;
    if (contentType.toLowerCase().includes("application/json")) {
      try {
        const data = await res.json();
        if (typeof data?.code === "string" && Object.hasOwn(safeCodes, data.code)) code = data.code;
      } catch { /* Status remains actionable even if the error body is malformed. */ }
    }
    throw new ApiFailure("http", origin, res.status, contentType, code);
  }
  if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
    throw new ApiFailure("non-json", origin, res.status, contentType);
  }
}

export async function parseApiJson<T>(res: Response, origin: string): Promise<T> {
  await checkApiResponse(res, origin);
  try {
    return await res.json() as T;
  } catch {
    throw new ApiFailure("invalid-json", origin, res.status);
  }
}