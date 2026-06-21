import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createReviewComment,
  ensureReviewPR,
  findReviewPR,
  getFileContent,
  listThreads,
  replyToComment,
} from "../github/api";
import { useSession } from "../state/session";
import type { CommentThread, RepoRef, ReviewPR } from "../types";
import { CommentThreadView } from "./CommentThread";

interface Props {
  repo: RepoRef;
  path: string;
}

export function FileViewer({ repo, path }: Props) {
  const { client } = useSession();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"source" | "preview">("source");

  const [pr, setPr] = useState<ReviewPR | null>(null);
  const [threads, setThreads] = useState<CommentThread[]>([]);

  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // Load file content + any existing review thread whenever the file changes.
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setContent(null);
    setError(null);
    setPr(null);
    setThreads([]);
    setSelStart(null);
    setSelEnd(null);

    (async () => {
      try {
        const text = await getFileContent(client, repo, path);
        if (cancelled) return;
        setContent(text);
        const found = await findReviewPR(client, repo, path);
        if (cancelled) return;
        setPr(found);
        if (found) {
          const t = await listThreads(client, repo.owner, repo.repo, found.number);
          if (!cancelled) setThreads(t);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load file.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, repo, path]);

  const lines = useMemo(
    () => (content == null ? [] : content.replace(/\n$/, "").split("\n")),
    [content],
  );

  const threadsByLine = useMemo(() => {
    const map = new Map<number, CommentThread[]>();
    for (const t of threads) {
      const arr = map.get(t.endLine) ?? [];
      arr.push(t);
      map.set(t.endLine, arr);
    }
    return map;
  }, [threads]);

  const lo = selStart != null && selEnd != null ? Math.min(selStart, selEnd) : null;
  const hi = selStart != null && selEnd != null ? Math.max(selStart, selEnd) : null;

  function clickLine(n: number, shift: boolean) {
    if (shift && selStart != null) setSelEnd(n);
    else {
      setSelStart(n);
      setSelEnd(n);
    }
  }

  async function reload(prNum: number) {
    if (!client) return;
    setThreads(await listThreads(client, repo.owner, repo.repo, prNum));
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!client || lo == null || hi == null || !draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const reviewPr = pr ?? (await ensureReviewPR(client, repo, path));
      setPr(reviewPr);
      await createReviewComment(
        client,
        repo.owner,
        repo.repo,
        reviewPr,
        draft.trim(),
        lo,
        hi,
      );
      setDraft("");
      setSelStart(null);
      setSelEnd(null);
      await reload(reviewPr.number);
    } catch (err) {
      setError(
        err instanceof Error ? `Could not post comment: ${err.message}` : "Failed.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function onReply(rootId: number, body: string) {
    if (!client || !pr) return;
    await replyToComment(client, repo.owner, repo.repo, pr.number, rootId, body);
    await reload(pr.number);
  }

  if (error) return <div className="viewer-msg error">{error}</div>;
  if (content == null) return <div className="viewer-msg muted">Loading…</div>;

  return (
    <div className="viewer">
      <header className="viewer-head">
        <div className="path">{path}</div>
        <div className="row">
          {pr && (
            <a className="pr-link" href={pr.html_url} target="_blank" rel="noreferrer">
              PR #{pr.number}
            </a>
          )}
          <div className="toggle">
            <button
              className={mode === "source" ? "active" : ""}
              onClick={() => setMode("source")}
            >
              Source
            </button>
            <button
              className={mode === "preview" ? "active" : ""}
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>
      </header>

      {mode === "preview" ? (
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <>
          <p className="hint muted small">
            Click a line number to start a comment; Shift-click another to select a
            range.
          </p>
          <div className="source">
            {lines.map((text, i) => {
              const n = i + 1;
              const selected = lo != null && hi != null && n >= lo && n <= hi;
              const lineThreads = threadsByLine.get(n);
              const hasThread = !!lineThreads?.length;
              return (
                <div key={n}>
                  <div className={`line${selected ? " selected" : ""}`}>
                    <button
                      className={`gutter${hasThread ? " has-thread" : ""}`}
                      onClick={(e) => clickLine(n, e.shiftKey)}
                      title="Comment on this line"
                    >
                      <span className="lineno">{n}</span>
                      {hasThread && <span className="dot">💬</span>}
                    </button>
                    <code className="code">{text || " "}</code>
                  </div>

                  {lineThreads?.map((t) => (
                    <CommentThreadView
                      key={t.root.id}
                      thread={t}
                      onReply={onReply}
                    />
                  ))}

                  {hi === n && lo != null && (
                    <form className="composer" onSubmit={submitComment}>
                      <div className="composer-range muted small">
                        Commenting on{" "}
                        {lo === hi ? `line ${hi}` : `lines ${lo}–${hi}`}
                        {!pr && " · a review PR will be created on first comment"}
                      </div>
                      <textarea
                        autoFocus
                        placeholder="Leave a comment… (Markdown supported)"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                      <div className="row">
                        <button type="submit" disabled={posting || !draft.trim()}>
                          {posting ? "Posting…" : "Comment"}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setSelStart(null);
                            setSelEnd(null);
                            setDraft("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
