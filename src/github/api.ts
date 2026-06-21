import { GitHubClient } from "./client";
import { base64ToUtf8, shortHash, slugifyPath } from "../utils/strings";
import type {
  CommentThread,
  GitHubUser,
  RepoRef,
  ReviewComment,
  ReviewPR,
  TreeEntry,
} from "../types";

const BRANCH_PREFIX = "spec-together";

/** Marker embedded in a review PR body so we can find it again later. */
function prMarker(ref: RepoRef, path: string): string {
  return `<!-- spec-together:branch=${ref.branch};path=${path} -->`;
}

function branchNames(ref: RepoRef, path: string) {
  const id = `${slugifyPath(path)}-${shortHash(`${ref.branch}:${path}`)}`;
  return {
    base: `${BRANCH_PREFIX}/base/${id}`,
    head: `${BRANCH_PREFIX}/review/${id}`,
  };
}

export async function getCurrentUser(gh: GitHubClient): Promise<GitHubUser> {
  return gh.get<GitHubUser>("/user");
}

export async function getDefaultBranch(
  gh: GitHubClient,
  owner: string,
  repo: string,
): Promise<string> {
  const data = await gh.get<{ default_branch: string }>(
    `/repos/${owner}/${repo}`,
  );
  return data.default_branch;
}

export interface RepoSummary {
  full_name: string;
  default_branch: string;
}

/** Repositories the token can access, most-recently-updated first. */
export async function listUserRepos(
  gh: GitHubClient,
): Promise<RepoSummary[]> {
  const out: RepoSummary[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh.get<RepoSummary[]>(
      `/user/repos?per_page=100&sort=updated&page=${page}`,
    );
    out.push(
      ...batch.map((r) => ({
        full_name: r.full_name,
        default_branch: r.default_branch,
      })),
    );
    if (batch.length < 100) break;
  }
  return out;
}

/** Branch names for a repo (best-effort; used for autocomplete). */
export async function listBranches(
  gh: GitHubClient,
  owner: string,
  repo: string,
): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh.get<{ name: string }[]>(
      `/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
    );
    out.push(...batch.map((b) => b.name));
    if (batch.length < 100) break;
  }
  return out;
}

/** List every Markdown file on the given branch (recursive git tree). */
export async function listMarkdownFiles(
  gh: GitHubClient,
  ref: RepoRef,
): Promise<{ files: TreeEntry[]; truncated: boolean }> {
  const data = await gh.get<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(
      ref.branch,
    )}?recursive=1`,
  );
  const files = data.tree
    .filter(
      (e) => e.type === "blob" && /\.(md|markdown|mdx)$/i.test(e.path),
    )
    .sort((a, b) => a.path.localeCompare(b.path));
  return { files, truncated: data.truncated };
}

export async function getFileContent(
  gh: GitHubClient,
  ref: RepoRef,
  path: string,
): Promise<string> {
  const data = await gh.get<{ content: string; encoding: string }>(
    `/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(
      path,
    )}?ref=${encodeURIComponent(ref.branch)}`,
  );
  return data.encoding === "base64" ? base64ToUtf8(data.content) : data.content;
}

interface PullSummary {
  number: number;
  html_url: string;
  body: string | null;
  head: { sha: string };
}

/** Look up an existing open review PR for a file without creating one. */
export async function findReviewPR(
  gh: GitHubClient,
  ref: RepoRef,
  path: string,
): Promise<ReviewPR | null> {
  const { owner, repo } = ref;
  const marker = prMarker(ref, path);
  const open = await gh.get<PullSummary[]>(
    `/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
  );
  const existing = open.find((p) => p.body?.includes(marker));
  if (!existing) return null;
  return {
    number: existing.number,
    html_url: existing.html_url,
    headSha: existing.head.sha,
    path,
  };
}

/**
 * Find the existing review PR for a file, or create one.
 *
 * The trick: GitHub only lets you line-comment lines that appear in a PR diff.
 * So we create a *base* branch with the file deleted and a *head* branch with
 * the file intact (parented on base). The PR diff is then the whole file as an
 * addition — every line becomes commentable — and the real branch is untouched.
 */
export async function ensureReviewPR(
  gh: GitHubClient,
  ref: RepoRef,
  path: string,
): Promise<ReviewPR> {
  const { owner, repo } = ref;

  // 1. Reuse an existing open review PR if one exists.
  const existing = await findReviewPR(gh, ref, path);
  if (existing) return existing;

  const marker = prMarker(ref, path);

  // 2. Resolve the source branch tip + its tree.
  const sourceRef = await gh.get<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref.branch)}`,
  );
  const sourceCommitSha = sourceRef.object.sha;
  const sourceCommit = await gh.get<{ tree: { sha: string } }>(
    `/repos/${owner}/${repo}/git/commits/${sourceCommitSha}`,
  );
  const sourceTreeSha = sourceCommit.tree.sha;

  // 3. Base tree = source tree with the file removed.
  const baseTree = await gh.post<{ sha: string }>(
    `/repos/${owner}/${repo}/git/trees`,
    {
      base_tree: sourceTreeSha,
      tree: [{ path, mode: "100644", type: "blob", sha: null }],
    },
  );

  // 4. Base commit (file absent) and head commit (file present, parented on base).
  const baseCommit = await gh.post<{ sha: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    {
      message: `spec-together: review base for ${path}`,
      tree: baseTree.sha,
      parents: [sourceCommitSha],
    },
  );
  const headCommit = await gh.post<{ sha: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    {
      message: `spec-together: open ${path} for review`,
      tree: sourceTreeSha,
      parents: [baseCommit.sha],
    },
  );

  // 5. Create (or fast-forward) the two scratch branches.
  const names = branchNames(ref, path);
  await upsertRef(gh, owner, repo, names.base, baseCommit.sha);
  await upsertRef(gh, owner, repo, names.head, headCommit.sha);

  // 6. Open the review PR.
  const pr = await gh.post<{ number: number; html_url: string }>(
    `/repos/${owner}/${repo}/pulls`,
    {
      title: `📝 Review: ${path}`,
      head: names.head,
      base: names.base,
      body:
        `Review thread for **\`${path}\`** opened with **Spec-together**.\n\n` +
        `The file is shown as an addition only so its lines can be commented ` +
        `on — \`${ref.branch}\` is not modified.\n\n${marker}`,
    },
  );

  return {
    number: pr.number,
    html_url: pr.html_url,
    headSha: headCommit.sha,
    path,
  };
}

async function upsertRef(
  gh: GitHubClient,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<void> {
  try {
    await gh.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha,
    });
  } catch {
    // Ref already exists (422) from a previous run — fast-forward it instead.
    await gh.patch(
      `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      { sha, force: true },
    );
  }
}

/** All review comments for a PR, grouped into threads by line range. */
export async function listThreads(
  gh: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<CommentThread[]> {
  const comments: ReviewComment[] = [];
  for (let page = 1; ; page++) {
    const batch = await gh.get<ReviewComment[]>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100&page=${page}`,
    );
    comments.push(...batch);
    if (batch.length < 100) break;
  }

  const byId = new Map<number, ReviewComment>();
  comments.forEach((c) => byId.set(c.id, c));

  const threads = new Map<number, CommentThread>();
  // Roots first so reply attachment can rely on them existing.
  for (const c of comments) {
    if (c.in_reply_to_id) continue;
    threads.set(c.id, {
      root: c,
      replies: [],
      startLine: c.start_line ?? c.line ?? 0,
      endLine: c.line ?? 0,
    });
  }
  for (const c of comments) {
    if (!c.in_reply_to_id) continue;
    const thread = threads.get(c.in_reply_to_id);
    if (thread) thread.replies.push(c);
  }

  for (const t of threads.values()) {
    t.replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return [...threads.values()].sort((a, b) => a.startLine - b.startLine);
}

/** Create a new review comment anchored to a line range (RIGHT side). */
export async function createReviewComment(
  gh: GitHubClient,
  owner: string,
  repo: string,
  pr: ReviewPR,
  body: string,
  startLine: number,
  endLine: number,
): Promise<ReviewComment> {
  const payload: Record<string, unknown> = {
    body,
    commit_id: pr.headSha,
    path: pr.path,
    line: endLine,
    side: "RIGHT",
  };
  if (startLine !== endLine) {
    payload.start_line = startLine;
    payload.start_side = "RIGHT";
  }
  return gh.post<ReviewComment>(
    `/repos/${owner}/${repo}/pulls/${pr.number}/comments`,
    payload,
  );
}

/** Reply within an existing thread. */
export async function replyToComment(
  gh: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  inReplyTo: number,
  body: string,
): Promise<ReviewComment> {
  return gh.post<ReviewComment>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    { body, in_reply_to: inReplyTo },
  );
}
