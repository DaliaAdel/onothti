export function publicUploadUrl(storageKey?: string | null): string | null {
  if (!storageKey || storageKey.includes("..")) {
    return null;
  }
  if (/^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }
  if (storageKey.startsWith("avatars/") || storageKey.startsWith("portfolio/")) {
    const path = `/uploads/${storageKey}`;
    const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    return base ? `${base}${path}` : path;
  }
  return null;
}
