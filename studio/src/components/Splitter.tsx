// Poignée de séparation redimensionnable (change studio-layout-revamp).
// Drag au pointeur + clavier (flèches), tactile via touch-action: none.
// Le parent reçoit des deltas incrémentaux (onDelta) et persiste à la fin (onFin).
import { useRef } from "react";

export default function Splitter({
  label,
  onDelta,
  onFin,
  onReset,
}: {
  label: string;
  onDelta: (dxPx: number) => void;
  onFin?: () => void;
  /** Reset (double-clic, touche Origine) : restaure la largeur par défaut. */
  onReset?: () => void;
}) {
  const trace = useRef<{ x: number; actif: boolean }>({ x: 0, actif: false });
  const finir = () => {
    if (!trace.current.actif) return;
    trace.current.actif = false;
    onFin?.();
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={onReset ? `${label} — Double-cliquer pour réinitialiser` : label}
      tabIndex={0}
      onDoubleClick={() => onReset?.()}
      onPointerDown={(e) => {
        e.preventDefault();
        trace.current = { x: e.clientX, actif: true };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!trace.current.actif) return;
        onDelta(e.clientX - trace.current.x);
        trace.current.x = e.clientX;
      }}
      onPointerUp={finir}
      onPointerCancel={finir}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onDelta(-8);
        else if (e.key === "ArrowRight") onDelta(8);
        else if (e.key === "Home") { onReset?.(); e.preventDefault(); return; }
        else return;
        e.preventDefault();
        onFin?.();
      }}
className="shrink-0 grow-0 w-4 min-h-11 self-stretch cursor-col-resize touch-manipulation rounded-md flex items-center justify-center"
       onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; }}
       onMouseLeave={(e) => { if (!trace.current.actif) e.currentTarget.style.background = "transparent"; }}
     >
       <span aria-hidden="true" className="rounded-sm" style={{ width: 3, height: 40, background: "var(--line-forte)" }} />
    </div>
  );
}
