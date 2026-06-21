// Thin wrapper around the GitHub REST API using fetch + a fine-grained PAT.
// No backend: the token lives only in the browser and is sent directly to the
// GitHub API (github.com or a GitHub Enterprise host).

import { PUBLIC_GITHUB } from "./host";

export class GitHubError extends Error {
  status: number;
  /** GitHub's machine-readable errors array, when present. */
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.details = details;
  }
}

export class GitHubClient {
  /**
   * @param token       Fine-grained PAT, sent as a Bearer token.
   * @param apiBaseUrl  REST API root (no trailing slash). Defaults to public
   *                    GitHub; pass a GitHub Enterprise root for self-hosted.
   */
  constructor(
    private token: string,
    private apiBaseUrl: string = PUBLIC_GITHUB.api,
  ) {}

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      const message =
        (data && (data.message as string)) || `${res.status} ${res.statusText}`;
      throw new GitHubError(res.status, message, data?.errors);
    }
    return data as T;
  }

  get<T = unknown>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }
}
