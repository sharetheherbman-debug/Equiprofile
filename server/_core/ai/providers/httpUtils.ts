type ProviderHttpErrorCode =
  | "network_dns"
  | "network_refused"
  | "network_fetch_failed"
  | "timeout"
  | "auth"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "server_error"
  | "invalid_response"
  | "unknown";

export class ProviderHttpError extends Error {
  readonly code: ProviderHttpErrorCode;
  readonly status?: number;
  readonly endpoint?: string;
  readonly provider?: string;
  readonly details?: string;

  constructor(message: string, opts: {
    code: ProviderHttpErrorCode;
    status?: number;
    endpoint?: string;
    provider?: string;
    details?: string;
  }) {
    super(message);
    this.name = "ProviderHttpError";
    this.code = opts.code;
    this.status = opts.status;
    this.endpoint = opts.endpoint;
    this.provider = opts.provider;
    this.details = opts.details;
  }
}

export function normalizeBaseUrl(baseUrl: string, desiredSuffix = "/v1"): string {
  const cleaned = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!cleaned) return "";
  if (!desiredSuffix) return cleaned;
  const suffix = desiredSuffix.startsWith("/") ? desiredSuffix : `/${desiredSuffix}`;
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicateSuffixPattern = new RegExp(`(${escapedSuffix})+$`, "i");
  const deduped = cleaned.replace(duplicateSuffixPattern, suffix);
  if (deduped.toLowerCase().endsWith(suffix.toLowerCase())) return deduped;
  return `${deduped}${suffix}`;
}

export function buildEndpoint(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function abortableFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw toProviderHttpError(error, url);
  } finally {
    clearTimeout(timeout);
  }
}

export async function throwForHttpError(response: Response, provider: string, endpoint: string): Promise<void> {
  if (response.ok) return;
  const body = await safeReadResponseText(response);
  const status = response.status;
  const code: ProviderHttpErrorCode =
    status === 401 ? "auth" :
      status === 403 ? "forbidden" :
        status === 404 ? "not_found" :
          status === 429 ? "rate_limited" :
            status >= 500 ? "server_error" :
              "invalid_response";
  throw new ProviderHttpError(
    `${provider} request failed (${status}) at ${endpoint}${body ? `: ${body}` : ""}`,
    { code, status, endpoint, provider, details: body },
  );
}

export function toProviderHttpError(error: unknown, endpoint?: string, provider?: string): ProviderHttpError {
  if (error instanceof ProviderHttpError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ProviderHttpError(
      `${provider ?? "Provider"} request timed out${endpoint ? ` at ${endpoint}` : ""}`,
      { code: "timeout", endpoint, provider },
    );
  }

  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("enotfound") || lower.includes("dns")) {
    return new ProviderHttpError(
      `${provider ?? "Provider"} DNS/network resolution failed${endpoint ? ` at ${endpoint}` : ""}: ${raw}`,
      { code: "network_dns", endpoint, provider, details: raw },
    );
  }
  if (lower.includes("econnrefused")) {
    return new ProviderHttpError(
      `${provider ?? "Provider"} connection refused${endpoint ? ` at ${endpoint}` : ""}: ${raw}`,
      { code: "network_refused", endpoint, provider, details: raw },
    );
  }
  if (lower.includes("fetch failed")) {
    return new ProviderHttpError(
      `${provider ?? "Provider"} network fetch failed${endpoint ? ` at ${endpoint}` : ""}: ${raw}`,
      { code: "network_fetch_failed", endpoint, provider, details: raw },
    );
  }
  return new ProviderHttpError(
    `${provider ?? "Provider"} request failed${endpoint ? ` at ${endpoint}` : ""}: ${raw}`,
    { code: "unknown", endpoint, provider, details: raw },
  );
}

export async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 2000);
  } catch {
    return "";
  }
}

export function parseUsageFromOpenAI(payload: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
  return {
    promptTokens: Number(payload?.usage?.prompt_tokens ?? payload?.usage?.promptTokens ?? 0),
    completionTokens: Number(payload?.usage?.completion_tokens ?? payload?.usage?.completionTokens ?? 0),
    totalTokens: Number(payload?.usage?.total_tokens ?? payload?.usage?.totalTokens ?? 0),
  };
}
