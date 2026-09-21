// Polices predefinies partagees (change studio-media-templates, design D3) :
// meme liste dans la barre d'outils de style et le branding, saisie libre en
// repli. `fontFamily` reste une string libre dans le schema (compatibilite).
export interface FontOption {
  value: string;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "system-ui", label: "Système" },
  { value: "Georgia", label: "Georgia" },
  { value: "serif", label: "Serif (Times)" },
  { value: "sans-serif", label: "Sans-serif (Arial)" },
  { value: "monospace", label: "Monospace" },
];

export function estPoliceConnue(value: string | undefined): boolean {
  return value != null && FONT_OPTIONS.some((o) => o.value === value);
}
