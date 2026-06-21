# Spec-together

Collaborative Markdown review on top of GitHub — **no backend**. Browse every
Markdown file in a repo, select one or more lines of *any* file (even files
nobody has edited), and leave threaded comments. Everything is stored in git as
real GitHub pull-request review comments.

Think "Track changes / comments in MS Word", but the document is a `.md` file in
a repo and the comments live in GitHub.

## How it works

GitHub only lets you attach a line comment to lines that appear in a pull
request **diff**. A file nobody edited has no diff, so you normally can't
comment on it.

Spec-together works around this without touching your real branch:

1. When you post the first comment on a file, the app opens a **review-only
   pull request** between two throwaway branches:
   - a **base** branch where the file is *deleted*, and
   - a **head** branch where the file is *present* (parented on base).
2. The PR diff is therefore the **entire file as an addition**, so every line is
   commentable.
3. Your comment is posted as a normal GitHub PR **review comment** (with full
   single- or multi-line ranges and threaded replies).

Your default branch is never modified. The PR is purely a container for the
conversation, and the comments are visible natively on github.com too.

There is no database and no server: the app is a static single-page app that
talks directly to `api.github.com` from your browser using a token you provide.

## Features

- 🔑 Sign in with a fine-grained Personal Access Token (stored only in your
  browser's `localStorage`).
- 📂 Browse and filter every Markdown file (`.md`, `.markdown`, `.mdx`) in a
  repo/branch.
- 🖱️ Click a line number to comment; Shift-click to select a range.
- 💬 Threaded replies on each comment, rendered with GitHub-flavored Markdown.
- 👀 Toggle between **Source** (commentable) and rendered **Preview**.
- 🔗 Every thread links back to the comment on github.com.

## Token setup

Create a **fine-grained** token at
[Settings → Developer settings → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new):

1. Grant access to the repositories you want to review.
2. Under **Repository permissions**, set:
   - **Contents** → Read and write (to create the throwaway review branches)
   - **Pull requests** → Read and write (to open PRs and post comments)
3. Paste the token into the app's sign-in screen.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds the app and publishes it to
GitHub Pages on every push to `main`.

1. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main`; the site deploys to
   `https://<owner>.github.io/<repo>/`.

The Vite `base` path defaults to `/spec-together/`. If your repo has a different
name, set `SPEC_TOGETHER_BASE` (e.g. `SPEC_TOGETHER_BASE=/my-repo/`) when
building, or edit `vite.config.ts`.

## Limitations

- The token needs write access because creating the review branches and posting
  review comments are write operations. Read-only tokens can't comment.
- Very large repos: GitHub may truncate the recursive file tree; the app warns
  when this happens.
- Comments are anchored to the file's content at the time the review PR was
  created. If the file changes substantially afterward, line anchors reflect the
  original snapshot (the PR link always shows the exact context).
