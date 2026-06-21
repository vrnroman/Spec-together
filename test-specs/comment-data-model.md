# Comment data model

This document describes how an abstract "comment on a spec" maps onto concrete
GitHub objects. It is the most load-bearing design decision in the app, so it is
a good target for review.

## The core constraint

GitHub's review-comment API can only anchor a comment to a line that appears in
a pull request's diff. A file that has never been edited has no diff, and
therefore no commentable lines.

## The workaround

For each file that receives comments, the app maintains a **review-only pull
request** between two throwaway branches:

| Branch | Contents of the spec file |
| ------ | ------------------------- |
| base   | the file is deleted       |
| head   | the file is present       |

Because the head branch adds the whole file relative to base, every line of the
file shows up in the diff as an addition, and every line becomes commentable.
The repository's real branches are never modified.

## Object mapping

- A **spec** is a Markdown file at a path on a branch.
- A **review session** for that spec is one pull request.
- A **comment** is one pull-request review comment, anchored to a line range on
  the RIGHT side of the diff.
- A **thread** is a root review comment plus its replies (`in_reply_to`).
- A **resolved thread** is, for now, just a thread the team agrees is done.
  There is no resolved bit stored yet — see open questions.

## Identity and lookup

The app finds the review PR for a file by embedding a marker comment in the PR
body:

```
<!-- spec-together:branch=<branch>;path=<path> -->
```

Branch names are derived deterministically from the branch and path, so the same
file always maps to the same review PR.

## Known weaknesses

1. Comments are anchored to the file content at the moment the review PR was
   created. If the file later changes a lot, the line numbers can drift.
2. One PR per file could get noisy in a repository with hundreds of specs.
3. Anyone with read access to the repo can see the throwaway review branches,
   which some teams may find untidy.
