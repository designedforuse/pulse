import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./api-url";
import { ApiFailure, checkApiResponse, parseApiJson } from "./api-errors";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const manifestHost =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;
  const launchUrl = Constants.manifest2?.launchAsset?.url;

  return resolveApiBaseUrl({
    // Web stays same-origin so Metro can proxy /api in development and
    // Express can serve it directly in production.
    webOrigin:
      Platform.OS === "web" && typeof window !== "undefined" ? window.location?.origin : null,
    configuredDomain: process.env.EXPO_PUBLIC_DOMAIN,
    manifestHost,
    manifestUrl: launchUrl ?? Constants.experienceUrl,
    isDevelopment: __DEV__,
  });
}

function apiEndpoint(route: string): URL {
  let baseUrl: string;
  try {
    baseUrl = getApiUrl();
    return new URL(route, baseUrl);
  } catch {
    throw new ApiFailure("configuration", null);
  }
}

async function apiFetch(url: URL, init?: RequestInit): Promise<Response> {
  try {
    // React Native's global fetch is available in Expo Go without depending
    // on the optional ExpoFetchModule native implementation.
    return await fetch(url.toString(), init);
  } catch {
    throw new ApiFailure("network", url.origin);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = apiEndpoint(route);

  const res = await apiFetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await checkApiResponse(res, url.origin);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const unauthorizedBehavior = options.on401;
  return async ({ queryKey }) => {
    const url = apiEndpoint(queryKey.join("/") as string);

    const res = await apiFetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    return await parseApiJson<T>(res, url.origin);
  };
}

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
