import { useState } from "react";
import { getDefaultBranch } from "../github/api";
import { useSession } from "../state/session";

export function RepoPicker() {
  const { client, setRepo } = useSession();
  const [value, setValue] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    const match = value.trim().match(/([^/\s]+)\/([^/\s]+)/);
    if (!match) {
      setError('Enter a repository as "owner/repo".');
      return;
    }
    const [, owner, repo] = match;
    setBusy(true);
    setError(null);
    try {
      const chosenBranch =
        branch.trim() || (await getDefaultBranch(client, owner, repo));
      setRepo({ owner, repo, branch: chosenBranch });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not open repo: ${err.message}`
          : "Could not open repo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered">
      <div className="card">
        <h2>Open a repository</h2>
        <p className="muted">
          Your token needs Contents + Pull requests (read &amp; write) access to
          this repo.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="repo">Repository</label>
          <input
            id="repo"
            placeholder="owner/repo"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <label htmlFor="branch">Branch (optional)</label>
          <input
            id="branch"
            placeholder="defaults to the repo's default branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Opening…" : "Open"}
          </button>
        </form>
      </div>
    </div>
  );
}
