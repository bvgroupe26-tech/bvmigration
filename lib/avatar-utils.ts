const LOCAL_AVATAR_PREFIX = "bv-profile-avatar:";

export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar?.trim()) return null;
  const value = avatar.trim();
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/api/nest/")) return value;
  if (value.startsWith("/api/")) {
    return value.replace(/^\/api(?!\/nest)/, "/api/nest");
  }
  const path = value.startsWith("/") ? value : `/${value}`;
  return `/api/nest${path}`;
}

export function readLocalProfileAvatar(userId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${LOCAL_AVATAR_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function writeLocalProfileAvatar(userId: number, dataUrl: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LOCAL_AVATAR_PREFIX}${userId}`, dataUrl);
}

export function clearLocalProfileAvatar(userId: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${LOCAL_AVATAR_PREFIX}${userId}`);
}

export async function fileToAvatarDataUrl(file: File, maxEdge = 512): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez une image (JPG, PNG, etc.).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("L'image ne doit pas dépasser 8 Mo.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de traiter l'image.");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = src;
  });
}
