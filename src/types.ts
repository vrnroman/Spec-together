export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
}

export interface RepoRef {
  owner: string;
  repo: string;
  /** Branch to browse. Defaults to the repo's default branch. */
  branch: string;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

/** A single GitHub pull-request review comment. */
export interface ReviewComment {
  id: number;
  body: string;
  path: string;
  /** End line of the comment range (1-based, on the file's RIGHT side). */
  line: number | null;
  /** Start line for a multi-line comment, else null. */
  start_line: number | null;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  html_url: string;
  /** Set when this comment is a reply within a thread. */
  in_reply_to_id?: number;
}

/** A root comment plus its replies, anchored to a line range. */
export interface CommentThread {
  root: ReviewComment;
  replies: ReviewComment[];
  startLine: number;
  endLine: number;
}

/** The review-only PR that hosts comments for one Markdown file. */
export interface ReviewPR {
  number: number;
  html_url: string;
  /** Head commit SHA — required as commit_id when posting review comments. */
  headSha: string;
  path: string;
}
