// Resolve the REST API root and web UI root for either public GitHub or a
// GitHub Enterprise host. The app talks directly to these from the browser, so
// the only thing that changes between deployments is the base URL.

export interface GitHubHost {
  /** REST API root, no trailing slash (used for every fetch). */
  api: string;
  /** Web UI root, no trailing slash (used for links back to GitHub). */
  web: string;
}

export const PUBLIC_GITHUB: GitHubHost = {
  api: "https://api.github.com",
  web: "https://github.com",
};

/**
 * Turn a user-entered host into API + web base URLs.
 *
 * - Empty / `github.com` / `api.github.com` → public GitHub.
 * - `<tenant>.ghe.com` (Enterprise Cloud with data residency) → `api.<host>`.
 * - Anything else (GitHub Enterprise *Server*, e.g. `github.acme.com`) →
 *   `https://<host>/api/v3`.
 *
 * Accepts a bare hostname or a full URL; only the host is used.
 */
export function resolveHost(input: string | null | undefined): GitHubHost {
  const raw = (input ?? "").trim();
  if (!raw) return PUBLIC_GITHUB;

  const host = raw
    .replace(/^https?:\/\//i, "") // strip scheme if pasted as a URL
    .replace(/\/.*$/, "") // strip any path
    .toLowerCase();

  if (!host || host === "github.com" || host === "api.github.com") {
    return PUBLIC_GITHUB;
  }

  // GitHub Enterprise Cloud with a dedicated subdomain: <tenant>.ghe.com.
  if (host.endsWith(".ghe.com")) {
    return { api: `https://api.${host}`, web: `https://${host}` };
  }

  // GitHub Enterprise Server: the REST API lives under /api/v3.
  return { api: `https://${host}/api/v3`, web: `https://${host}` };
}

/** Normalize user input to the bare host we persist (or "" for public). */
export function normalizeHostInput(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  const host = raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return host === "github.com" || host === "api.github.com" ? "" : host;
}
