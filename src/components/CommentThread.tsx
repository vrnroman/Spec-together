import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CommentThread as Thread, ReviewComment } from "../types";
import { timeAgo } from "../utils/strings";

function CommentBody({ c }: { c: ReviewComment }) {
  return (
    <div className="comment">
      <img className="avatar" src={c.user.avatar_url} alt="" width={24} height={24} />
      <div className="comment-main">
        <div className="comment-meta">
          <a href={c.user.html_url} target="_blank" rel="noreferrer">
            {c.user.login}
          </a>
          <span className="muted small"> · {timeAgo(c.created_at)}</span>
        </div>
        <div className="comment-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

interface Props {
  thread: Thread;
  onReply: (rootId: number, body: string) => Promise<void>;
}

export function CommentThreadView({ thread, onReply }: Props) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const range =
    thread.startLine === thread.endLine
      ? `Line ${thread.endLine}`
      : `Lines ${thread.startLine}–${thread.endLine}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await onReply(thread.root.id, reply.trim());
      setReply("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="thread">
      <div className="thread-range muted small">
        {range}
        {" · "}
        <a href={thread.root.html_url} target="_blank" rel="noreferrer">
          view on GitHub
        </a>
      </div>
      <CommentBody c={thread.root} />
      {thread.replies.map((r) => (
        <CommentBody key={r.id} c={r} />
      ))}

      {open ? (
        <form className="reply-form" onSubmit={submit}>
          <textarea
            autoFocus
            placeholder="Reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="row">
            <button type="submit" disabled={busy || !reply.trim()}>
              {busy ? "Sending…" : "Reply"}
            </button>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="ghost reply-toggle" onClick={() => setOpen(true)}>
          Reply
        </button>
      )}
    </div>
  );
}
