export function fileUrl(storageKey?: string | null): string | null {
  if (!storageKey || storageKey.includes("..")) {
    return null;
  }
  const key = storageKey.split(" | ")[0].trim();
  if (/^https?:\/\//i.test(key)) {
    return key;
  }
  if (key.includes("\n") || !key.includes("/")) {
    return null;
  }
  const path = key.startsWith("/") ? key : `/uploads/${key.replace(/^uploads\//, "")}`;
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function publicUploadUrl(storageKey?: string | null): string | null {
  if (!storageKey || storageKey.includes("..")) {
    return null;
  }
  const key = storageKey.split(" | ")[0].trim();
  if (/^https?:\/\//i.test(key)) {
    return key;
  }
  if (!/^(avatars|portfolio|proofs|proof|receipts)\//.test(key)) {
    return null;
  }
  return fileUrl(key);
}
