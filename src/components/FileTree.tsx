import { useEffect, useMemo, useState } from "react";
import { listMarkdownFiles } from "../github/api";
import { useSession } from "../state/session";
import type { RepoRef, TreeEntry } from "../types";

interface Props {
  repo: RepoRef;
  selected: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ repo, selected, onSelect }: Props) {
  const { client } = useSession();
  const [files, setFiles] = useState<TreeEntry[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setFiles(null);
    setError(null);
    listMarkdownFiles(client, repo)
      .then(({ files, truncated }) => {
        if (cancelled) return;
        setFiles(files);
        setTruncated(truncated);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load files.");
      });
    return () => {
      cancelled = true;
    };
  }, [client, repo]);

  const shown = useMemo(() => {
    if (!files) return [];
    const q = filter.trim().toLowerCase();
    return q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files;
  }, [files, filter]);

  return (
    <nav className="filetree">
      <input
        className="filter"
        placeholder="Filter Markdown files…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      {!files && !error && <p className="muted small">Loading files…</p>}
      {files && shown.length === 0 && (
        <p className="muted small">No Markdown files match.</p>
      )}
      <ul>
        {shown.map((f) => (
          <li key={f.path}>
            <button
              className={f.path === selected ? "file active" : "file"}
              onClick={() => onSelect(f.path)}
              title={f.path}
            >
              {f.path}
            </button>
          </li>
        ))}
      </ul>
      {truncated && (
        <p className="muted small">
          ⚠️ This repo's file tree is large and was truncated by GitHub; some
          files may be missing.
        </p>
      )}
    </nav>
  );
}
