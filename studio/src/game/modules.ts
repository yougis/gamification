export interface ModuleRegistryEntry {
  type: string;
  render?: (data: Record<string, unknown>) => unknown;
  needsLock?: boolean;
}

// Tap valide si dans un polygone dilate (unites % : meme espace que les polygones).
export function hitTest(polygons: { x: number; y: number; w: number; h: number }[], px: number, py: number, dilatation: number): boolean {
  return polygons.some(
    (p) => px >= p.x - dilatation && px <= p.x + p.w + dilatation && py >= p.y - dilatation && py <= p.y + p.h + dilatation,
  );
}

export interface ArCaps {
  cameraGranted: boolean;
  arSupported: boolean;
  modelSizeMb: number;
  budgetMb: number;
}

export function arMode(caps: ArCaps): { mode: "ar" | "fallback2D"; motif: string } {
  if (!caps.cameraGranted) return { mode: "fallback2D", motif: "camera refusee ou indisponible" };
  if (!caps.arSupported) return { mode: "fallback2D", motif: "AR non supporte par l'appareil" };
  if (caps.modelSizeMb > caps.budgetMb) {
    return { mode: "fallback2D", motif: `modele ${caps.modelSizeMb} Mo > budget ${caps.budgetMb} Mo` };
  }
  return { mode: "ar", motif: "capteurs et budget OK" };
}
