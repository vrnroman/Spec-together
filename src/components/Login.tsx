import { useState } from "react";
import { GitHubClient } from "../github/client";
import { getCurrentUser } from "../github/api";
import { normalizeHostInput, resolveHost } from "../github/host";
import { useSession } from "../state/session";

export function Login() {
  const { signIn } = useSession();
  const [token, setToken] = useState("");
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const normalizedHost = normalizeHostInput(host);
      const client = new GitHubClient(
        token.trim(),
        resolveHost(normalizedHost).api,
      );
      const user = await getCurrentUser(client);
      signIn(token.trim(), user, normalizedHost);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not sign in: ${err.message}`
          : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <div className="card auth-card">
        <h1>Spec&#8209;together</h1>
        <p className="muted">
          Open any Markdown file in a GitHub repo and leave threaded line
          comments. No backend — every comment is stored in git as a pull
          request review comment.
        </p>

        <form onSubmit={submit}>
          <label htmlFor="token">Personal access token</label>
          <input
            id="token"
            type="password"
            placeholder="github_pat_…"
            value={token}
            autoComplete="off"
            onChange={(e) => setToken(e.target.value)}
          />

          <details className="help">
            <summary>Using GitHub Enterprise?</summary>
            <label htmlFor="host">Enterprise host</label>
            <input
              id="host"
              type="text"
              placeholder="github.your-company.com"
              value={host}
              autoComplete="off"
              onChange={(e) => setHost(e.target.value)}
            />
            <p className="muted small">
              Leave blank for public github.com. For GitHub Enterprise Server
              enter your host (e.g. <code>github.acme.com</code>); for Enterprise
              Cloud with data residency use <code>your-tenant.ghe.com</code>.
              The browser must be able to reach that host's API directly.
            </p>
          </details>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || !token.trim()}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>

        <details className="help">
          <summary>How do I create a token?</summary>
          <ol>
            <li>
              Go to{" "}
              <a
                href={`${resolveHost(host).web}/settings/tokens`}
                target="_blank"
                rel="noreferrer"
              >
                Settings → Developer settings → access tokens
              </a>
              .
            </li>
            <li>Grant access to the repository (or repositories) you'll review.</li>
            <li>
              Under <strong>Repository permissions</strong>, set{" "}
              <strong>Contents</strong> and <strong>Pull requests</strong> to
              <strong> Read and write</strong>.
            </li>
            <li>Create the token and paste it above.</li>
          </ol>
          <p className="muted small">
            The token is stored only in this browser (localStorage) and sent
            directly to api.github.com.
          </p>
        </details>
      </div>
    </div>
  );
}
