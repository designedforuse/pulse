import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Web previews and published web builds use their own origin; Metro
  // forwards /api during development and Express serves it in production.
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/`;
  }
  const configured = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (configured && !configured.includes("$")) {
    const url = new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`);
    // Replit exposes the workflow through the HTTPS domain, not as a literal
    // public `:5000` endpoint. Keep custom/native hosts untouched.
    if (
      url.port === "5000" &&
      (url.hostname.endsWith(".replit.dev") || url.hostname.endsWith(".repl.co"))
    ) {
      url.port = "";
    }
    return url.href;
  }

  // Older Expo previews could bake the unexpanded `$REPLIT_DEV_DOMAIN` into
  // the web bundle. Recover the sibling backend host from the public Expo
  // origin instead of issuing a request to the literal placeholder.
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname.replace(/\.expo\./, ".");
    return `https://${host}/`;
  }

  throw new Error("EXPO_PUBLIC_DOMAIN is not set");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
