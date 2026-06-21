// Decode GitHub's base64 file payloads (which include newlines) into UTF-8.
export function base64ToUtf8(b64: string): string {
  const clean = b64.replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

// Small, stable, dependency-free hash (djb2) rendered as base36. Used to make
// branch names deterministic per file so we can find an existing review PR.
export function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // >>> 0 forces unsigned 32-bit before stringifying.
  return (h >>> 0).toString(36);
}

// Turn a file path into a ref-safe slug, e.g. "docs/My Spec.md" -> "docs-my-spec-md".
export function slugifyPath(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5) return "just now";
  const steps: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = secs;
  for (const [size, name] of steps) {
    if (value < size) {
      const n = Math.floor(value);
      return `${n} ${name}${n === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "a long time ago";
}
