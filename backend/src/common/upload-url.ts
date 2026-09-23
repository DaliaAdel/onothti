export function publicUploadUrl(storageKey?: string | null): string | null {
  if (!storageKey || storageKey.includes("..")) {
    return null;
  }
  if (/^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }
  if (storageKey.startsWith("avatars/") || storageKey.startsWith("portfolio/")) {
    return `/uploads/${storageKey}`;
  }
  return null;
}
