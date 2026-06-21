import { useEffect, useMemo, useState } from "react";
import {
  getDefaultBranch,
  listBranches,
  listUserRepos,
  type RepoSummary,
} from "../github/api";
import { useSession } from "../state/session";

export function RepoPicker() {
  const { client, setRepo } = useSession();
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [value, setValue] = useState("");
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the user's repositories once, for the repo autocomplete.
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    listUserRepos(client)
      .then((r) => !cancelled && setRepos(r))
      .catch(() => !cancelled && setRepos([]));
    return () => {
      cancelled = true;
    };
  }, [client]);

  const parsed = useMemo(() => {
    const m = value.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
    return m ? { owner: m[1], repo: m[2] } : null;
  }, [value]);

  // When a full "owner/repo" is entered, default the branch to that repo's
  // default branch and load its branches for the branch autocomplete.
  useEffect(() => {
    if (!client || !parsed) {
      setBranches([]);
      return;
    }
    let cancelled = false;
    const known = repos?.find(
      (r) => r.full_name.toLowerCase() === value.trim().toLowerCase(),
    );
    if (known) setBranch(known.default_branch || "main");
    listBranches(client, parsed.owner, parsed.repo)
      .then((b) => !cancelled && setBranches(b))
      .catch(() => !cancelled && setBranches([]));
    return () => {
      cancelled = true;
    };
    // Only re-run when the parsed repo changes, not on every branch keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, parsed?.owner, parsed?.repo, repos]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !parsed) {
      setError('Choose a repository as "owner/repo".');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const chosenBranch =
        branch.trim() ||
        (await getDefaultBranch(client, parsed.owner, parsed.repo));
      setRepo({ owner: parsed.owner, repo: parsed.repo, branch: chosenBranch });
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
          {repos === null
            ? "Loading your repositories…"
            : "Pick a repository and branch, or type any owner/repo you can access."}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="repo">Repository</label>
          <input
            id="repo"
            list="repo-options"
            placeholder="owner/repo"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <datalist id="repo-options">
            {repos?.map((r) => (
              <option key={r.full_name} value={r.full_name} />
            ))}
          </datalist>

          <label htmlFor="branch">Branch</label>
          <input
            id="branch"
            list="branch-options"
            placeholder="main"
            autoComplete="off"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
          <datalist id="branch-options">
            {branches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || !parsed}>
            {busy ? "Opening…" : "Open"}
          </button>
        </form>
      </div>
    </div>
  );
}
