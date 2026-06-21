# Open questions

Unresolved decisions. Each heading is something we have *not* settled. Leave a
comment on the line you have an opinion about.

## 1. One PR per file, or one PR per review session?

Today the app opens one review PR per file. An alternative is one PR per review
"session" that can hold comments across many files. Per-file is simpler to look
up; per-session is tidier in the PR list.

## 2. Where do resolved threads live?

GitHub can mark review threads as resolved, but only via the GraphQL API. Do we
add a "Resolve" button now, or leave resolution as an informal convention?

## 3. How should we handle a file that changed after comments exist?

If the spec is edited on the main branch after a review PR was created, the
comment anchors point at the old snapshot. Options:

- Leave the old anchors and show a "may be outdated" badge.
- Re-create the review PR against the new content and try to re-map comments.
- Do nothing and rely on the github.com link for exact context.

## 4. Should we support non-Markdown files?

The whole app assumes `.md` / `.markdown` / `.mdx`. Plain `.txt` specs and
`.adoc` (AsciiDoc) would be easy to allow. Is that scope creep?

## 5. Authentication beyond a PAT

A pasted personal access token is the simplest no-backend option, but it asks a
lot of casual reviewers. Is a tiny serverless OAuth proxy worth breaking the
"no backend" rule for?

## 6. Multi-repo support

Right now you open one repository at a time. Should the app remember several and
let you switch quickly, or is one-at-a-time fine?
