// Predicats fichiers image (pur, testable hors navigateur).
const EXT_IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i;

export function estImageAcceptable(f: { name: string; type: string }): boolean {
  return f.type.startsWith("image/") || EXT_IMAGE.test(f.name);
}
