// Poignée de séparation redimensionnable (change studio-layout-revamp).
// Drag au pointeur + clavier (flèches), tactile via touch-action: none.
// Le parent reçoit des deltas incrémentaux (onDelta) et persiste à la fin (onFin).
import { useRef } from "react";

export default function Splitter({
  label,
  onDelta,
  onFin,
}: {
  label: string;
  onDelta: (dxPx: number) => void;
  onFin?: () => void;
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
      tabIndex={0}
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
        else return;
        e.preventDefault();
        onFin?.();
      }}
      style={{
        flex: "0 0 auto",
        width: 16,
        minHeight: 44,
        alignSelf: "stretch",
        cursor: "col-resize",
        touchAction: "none",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; }}
      onMouseLeave={(e) => { if (!trace.current.actif) e.currentTarget.style.background = "transparent"; }}
    >
      <span aria-hidden="true" style={{ width: 3, height: 40, borderRadius: 2, background: "var(--line-forte)" }} />
    </div>
  );
}
