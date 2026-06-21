# Product overview

## Problem

Teams write specifications as Markdown and keep them in git, but reviewing those
specs is awkward. GitHub pull requests only let you comment on lines that were
*changed* in the PR. If a spec already lives on the main branch and nobody has
edited it, there is no natural place to leave inline, line-anchored feedback.

People work around this with long Slack threads, Google Docs copies, or issue
comments that quote line numbers by hand. All three drift out of sync with the
file in git.

## What Spec-together does

Spec-together is a single-page web app with no backend of its own. It uses
GitHub as the only store:

1. You authenticate with a fine-grained personal access token.
2. You browse every Markdown file in a repository.
3. You select one or more lines of any file and leave a comment.
4. The comment is saved in git as a native pull-request review comment.

Because everything is a normal GitHub object, comments are visible on
github.com, survive independently of this app, and can be exported or migrated
like any other PR data.

## Who it is for

- Spec authors who want structured feedback on a document, not a wall of chat.
- Reviewers who want to point at an exact line without editing the file.
- Teams that already keep specs in git and do not want yet another tool with its
  own database and login.

## Non-goals

- Spec-together is **not** an editor. It does not change the spec's content; it
  only attaches conversation to it.
- It is **not** a real-time collaborative cursor experience. Comments appear
  after a refresh, not character-by-character.
- It does **not** store anything outside of GitHub. There is no analytics
  backend and no separate account system.

## Success criteria

A reviewer should be able to go from "I opened the app" to "I left a line
comment on an unedited spec" in under a minute, without reading documentation.
