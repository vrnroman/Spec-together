# UI guidelines

Interaction and visual rules for the reviewer surface. These are opinions, not
laws — push back in the comments where you disagree.

## Layout

- A persistent left sidebar lists every Markdown file, with a filter box.
- The main panel shows one file at a time.
- Each file has two modes: **Source** (line-numbered, commentable) and
  **Preview** (rendered Markdown, read-only).

## Selecting lines

- Clicking a line number starts a single-line selection.
- Shift-clicking a second line number extends the selection into a range.
- The selected range is highlighted with a soft yellow background.

## Comments

- The composer appears directly beneath the last selected line, not in a
  separate panel, so the reviewer keeps their place in the document.
- Existing threads render inline beneath the line they are anchored to.
- Comment bodies support GitHub-flavored Markdown, including code blocks.
- Every thread links back to the underlying comment on github.com.

## Tone and copy

- Prefer plain verbs: "Comment", "Reply", "Sign out".
- Never block the UI on a network call without showing a pending state such as
  "Posting…".
- Errors are shown inline near the action that failed, in red, and never as a
  modal dialog.

## Accessibility (aspirational)

- All actions should be reachable by keyboard.
- Color is never the only signal; the comment indicator also uses an icon.
- Contrast should meet WCAG AA against the light theme.

## Open visual questions

- Should the comment indicator live in the gutter or in a margin rail to the
  right of the text?
- Should Preview mode also show comment indicators, even though you cannot
  create comments there?
