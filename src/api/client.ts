const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiClientOptions {
  tenantId?: string;
  authToken?: string | null;
}

/**
 * Returns the tenant id to use for API calls.
 * For now this is a hard-coded dev tenant. Later we can
 * replace this with a real tenant selection mechanism.
 */
function getDefaultTenantId(): string {
  return "dev-tenant";
}

async function request<TResponse>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  options: ApiClientOptions = {}
): Promise<TResponse> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": options.tenantId ?? getDefaultTenantId()
  };

  if (options.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("Content-Type") ?? "";

  // Try to parse JSON if present, but don't crash if the body is empty
  let responseBody: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (responseBody &&
        typeof responseBody === "object" &&
        "error" in responseBody &&
        typeof (responseBody as any).error === "string" &&
        (responseBody as any).error) ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage) as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = response.status;
    error.body = responseBody;
    throw error;
  }

  return responseBody as TResponse;
}

export const apiClient = {
  get<TResponse>(path: string, options?: ApiClientOptions) {
    return request<TResponse>(path, "GET", undefined, options);
  },

  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: ApiClientOptions
  ) {
    return request<TResponse>(path, "POST", body, options);
  },

  put<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: ApiClientOptions
  ) {
    return request<TResponse>(path, "PUT", body, options);
  },

  delete<TResponse>(path: string, options?: ApiClientOptions) {
    return request<TResponse>(path, "DELETE", undefined, options);
  }
};
