// Predicats fichiers image (pur, testable hors navigateur).
const EXT_IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i;

export function estImageAcceptable(f: { name: string; type: string }): boolean {
  return f.type.startsWith("image/") || EXT_IMAGE.test(f.name);
}

// Registre des assets de la session (change studio-lot-correctifs) : les
// chemins `assets/…` du JSON ne sont pas des URL affichables dans le
// Studio — ce registre résout un chemin vers une object URL créée depuis
// l'octet du fichier déposé (même mécanisme que la vignette ImagePicker).
// Les aperçus (panneau ET canvas) l'utilisent ; repli = chemin brut.
const assetsSession = new Map<string, { fichier: Blob; url: string | null }>();

export function enregistrerAssetSession(chemin: string, fichier: Blob): void {
  const prev = assetsSession.get(chemin);
  if (prev?.url) {
    try {
      URL.revokeObjectURL(prev.url);
    } catch {
      /* non bloquant */
    }
  }
  assetsSession.set(chemin, { fichier, url: null });
}

export function urlAssetSession(chemin: string): string | null {
  const entree = assetsSession.get(chemin);
  if (!entree) return null;
  if (!entree.url) entree.url = URL.createObjectURL(entree.fichier);
  return entree.url;
}

// Predicats fichiers media (change module-info-story) : video/audio du
// recit INFO, meme circuit manifest que les images (SHA-256, hors-pack
// refuse a l'export, jamais d'URL reseau dans les donnees).
const EXT_VIDEO = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;
const EXT_AUDIO = /\.(mp3|ogg|oga|wav|m4a|opus|flac)$/i;

export type MediaKind = "video" | "audio";

export function extensionsMedia(kind: MediaKind): string {
  return kind === "video" ? "mp4, webm, ogv, mov, m4v" : "mp3, ogg, wav, m4a, opus, flac";
}

export function estMediaAcceptable(kind: MediaKind, f: { name: string; type: string }): boolean {
  if (kind === "video") return f.type.startsWith("video/") || EXT_VIDEO.test(f.name);
  return f.type.startsWith("audio/") || EXT_AUDIO.test(f.name);
}
