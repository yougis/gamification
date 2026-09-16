import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Game, GameNode, NodePosition, IndoorPlan, CalibrationState } from "../game/types";
import { computeBbox, detectGeofenceOverlaps, setNodePosition } from "../game/mcp";

interface MapViewProps {
  game: Game;
  sel: string | null;
  onSelect: (nodeId: string | null) => void;
  onGameChange: (updater: (g: Game) => Game) => void;
}

// ── Helpers ──

function getLatLng(node: GameNode): { lat: number; lng: number } | null {
  const c = node.activation.requires.find((r) => r.type === "GEOFENCE" && typeof r.lat === "number" && typeof r.lng === "number");
  if (c && typeof c.lat === "number" && typeof c.lng === "number") return { lat: c.lat, lng: c.lng };
  return null;
}

function getRadius(node: GameNode): number {
  const c = node.activation.requires.find((r) => r.type === "GEOFENCE" && typeof r.radiusMeters === "number");
  return (c?.radiusMeters as number) ?? 30;
}

function metersToLatDeg(m: number): number { return m / 111_320; }
function metersToLngDeg(m: number, atLat: number): number { return m / (111_320 * Math.cos((atLat * Math.PI) / 180)); }

function circleGeoJSON(lat: number, lng: number, radiusM: number): GeoJSON.Feature {
  const steps = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 360;
    const rad = (bearing * Math.PI) / 180;
    const dLat = metersToLatDeg(radiusM * Math.cos(rad));
    const dLng = metersToLngDeg(radiusM * Math.sin(rad), lat);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
}

// ── Component ──

export default function MapView({ game, sel, onSelect, onGameChange }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const loadedRef = useRef(false);

  const indoorPlans = game.global?.indoorPlans as IndoorPlan[] | undefined;
  const isIndoor = Array.isArray(indoorPlans) && indoorPlans.length > 0;

  const [activeFloor, setActiveFloor] = useState<string>(indoorPlans?.[0]?.id ?? "");
  const [calibration, setCalibration] = useState<CalibrationState>({});
  const [calMode, setCalMode] = useState(false);
  const [calDistance, setCalDistance] = useState("");
  const [calError, setCalError] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [planSize, setPlanSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  const activePlan = indoorPlans?.find((p) => p.id === activeFloor) ?? indoorPlans?.[0];

  // ── Outdoor MapLibre init ──
  useEffect(() => {
    if (isIndoor || !mapContainer.current) return;
    if (mapRef.current) return;
    const bbox = computeBbox(game);
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["/tiles/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: bbox ? [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2] : [2.35, 48.85],
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl());
    map.on("load", () => { loadedRef.current = true; });
    map.on("error", (e) => console.warn("MapLibre error:", e.error?.message));
    mapRef.current = map;

    // Click to place node
    map.on("click", (e) => {
      if (calMode || !sel) return;
      const ll = e.lngLat;
      onGameChange((g) => {
        const node = g.nodes.find((n) => n.id === sel);
        if (!node) return g;
        const geoIdx = node.activation.requires.findIndex((c) => c.type === "GEOFENCE");
        if (geoIdx >= 0) {
          const updated = node.activation.requires.map((c, i) =>
            i === geoIdx ? { ...c, lat: ll.lat, lng: ll.lng } : c,
          );
          return {
            ...g,
            nodes: g.nodes.map((n) =>
              n.id === sel ? { ...n, activation: { ...n.activation, requires: updated } } : n,
            ),
          };
        }
        return {
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === sel
              ? { ...n, activation: { ...n.activation, requires: [...n.activation.requires, { type: "GEOFENCE", lat: ll.lat, lng: ll.lng, radiusMeters: 30 }] } }
              : n,
          ),
        };
      });
    });

    return () => { loadedRef.current = false; map.remove(); mapRef.current = null; };
  }, [isIndoor]);

  // ── Outdoor markers + geofence circles ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isIndoor || !loadedRef.current) return;

    // Clean previous
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (map.getLayer("geofence-fills")) map.removeLayer("geofence-fills");
    if (map.getLayer("geofence-strokes")) map.removeLayer("geofence-strokes");
    if (map.getSource("geofences")) map.removeSource("geofences");

    const features: GeoJSON.Feature[] = [];

    for (const node of game.nodes) {
      const ll = getLatLng(node);
      if (!ll) continue;

      const el = document.createElement("div");
      el.className = "map-node-marker";
      el.style.cssText = `width:24px;height:24px;border-radius:50%;border:2px solid white;cursor:pointer;
        background:${node.id === sel ? "#3b82f6" : node.isEnding ? "#22c55e" : "#ef4444"};
        box-shadow:0 2px 6px rgba(0,0,0,0.3);`;

      const label = document.createElement("span");
      label.textContent = node.id;
      label.style.cssText = "position:absolute;top:28px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;background:white;padding:1px 4px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,0.2);pointer-events:none;";
      el.appendChild(label);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(ll)
        .addTo(map);

      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(node.id);
      });

      // Drag support
      let isDragging = false;
      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!isDragging) return;
        marker.setLngLat(ev.lngLat);
        onGameChange((g) => {
          const nd = g.nodes.find((n) => n.id === node.id);
          if (!nd) return g;
          const geoIdx = nd.activation.requires.findIndex((c) => c.type === "GEOFENCE");
          if (geoIdx < 0) return g;
          const updated = nd.activation.requires.map((c, i) =>
            i === geoIdx ? { ...c, lat: ev.lngLat.lat, lng: ev.lngLat.lng } : c,
          );
          return { ...g, nodes: g.nodes.map((n) => n.id === node.id ? { ...n, activation: { ...n.activation, requires: updated } } : n) };
        });
      };
      const onUp = () => { isDragging = false; setDragging(null); map.off("mousemove", onMove); map.off("mouseup", onUp); };

      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        setDragging(node.id);
        onSelect(node.id);
        map.on("mousemove", onMove);
        map.on("mouseup", onUp);
      });

      markersRef.current.push(marker);

      features.push(circleGeoJSON(ll.lat, ll.lng, getRadius(node)));
    }

    if (features.length > 0) {
      map.addSource("geofences", { type: "geojson", data: { type: "FeatureCollection", features } });
      map.addLayer({ id: "geofence-fills", type: "fill", source: "geofences", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 } });
      map.addLayer({ id: "geofence-strokes", type: "line", source: "geofences", paint: { "line-color": "#3b82f6", "line-width": 1 } });
    }
  }, [game.nodes, sel, isIndoor]);

  // ── Outdoor fit bounds ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isIndoor || !loadedRef.current) return;
    const bbox = computeBbox(game);
    if (bbox) {
      map.fitBounds([[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]], { padding: 50 });
    }
  }, [game, isIndoor]);

  // ── Indoor plan image ──
  useEffect(() => {
    if (!isIndoor || !activePlan) return;
    const img = new Image();
    img.onload = () => { setPlanImage(img); setPlanSize({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.src = activePlan.image;
  }, [isIndoor, activePlan]);

  // ── Indoor click handler ──
  const handlePlanClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activePlan || calMode || !sel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = px / activePlan.scale;
    const y = py / activePlan.scale;
    onGameChange((g) => setNodePosition(g, sel, { planId: activePlan.id, x, y }));
  }, [activePlan, calMode, sel, onGameChange]);

  // ── Indoor calibration click ──
  const handleCalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!calMode || !activePlan) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (!calibration.pointA) {
      setCalibration({ pointA: { x: px, y: py } });
    } else if (!calibration.pointB) {
      setCalibration({ ...calibration, pointB: { x: px, y: py } });
    }
  }, [calMode, activePlan, calibration]);

  // ── Indoor calibration submit ──
  const handleCalSubmit = useCallback(() => {
    if (!calibration.pointA || !calibration.pointB || !activePlan) return;
    const distPx = Math.hypot(calibration.pointB.x - calibration.pointA.x, calibration.pointB.y - calibration.pointA.y);
    const distM = parseFloat(calDistance);
    if (isNaN(distM) || distM <= 0) { setCalError("La distance doit etre un nombre positif"); return; }
    if (distPx < 1) { setCalError("Les deux points doivent etre distincts"); return; }
    const newScale = distPx / distM;
    onGameChange((g) => ({
      ...g,
      global: {
        ...g.global,
        indoorPlans: (g.global?.indoorPlans as IndoorPlan[] | undefined)?.map((p) =>
          p.id === activePlan.id ? { ...p, scale: newScale } : p,
        ),
      },
    }));
    setCalibration({});
    setCalDistance("");
    setCalMode(false);
    setCalError("");
  }, [calibration, calDistance, activePlan, onGameChange]);

  // ── Overlap warnings ──
  const overlaps = detectGeofenceOverlaps(game);

  // ── Render ──

  if (isIndoor) {
    const displayW = planSize.w;
    const displayH = planSize.h;
    const indoorNodes = game.nodes.filter((n) => n.position?.planId === activeFloor);

    return (
      <div className="flex flex-col h-full">
        {/* Floor selector */}
        {indoorPlans && indoorPlans.length > 1 && (
          <div className="flex gap-1 p-1 border-b">
            {indoorPlans.map((p) => (
              <button
                key={p.id}
                className={`px-3 py-1 text-sm rounded ${p.id === activeFloor ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setActiveFloor(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Calibration controls */}
        <div className="flex items-center gap-2 p-1 border-b text-xs">
          <button
            className={`px-2 py-0.5 rounded ${calMode ? "bg-orange-500 text-white" : "bg-gray-200"}`}
            onClick={() => { setCalMode(!calMode); setCalibration({}); setCalError(""); }}
          >
            {calMode ? "Annuler calibration" : "Calibrer plan"}
          </button>
          {calMode && calibration.pointA && !calibration.pointB && (
            <span className="text-orange-600">Cliquez sur le point B</span>
          )}
          {calMode && calibration.pointA && calibration.pointB && (
            <>
              <input
                type="number"
                placeholder="Distance en m"
                value={calDistance}
                onChange={(e) => setCalDistance(e.target.value)}
                className="border rounded px-1 py-0.5 w-24"
              />
              <button className="px-2 py-0.5 bg-green-500 text-white rounded" onClick={handleCalSubmit}>
                Appliquer
              </button>
            </>
          )}
          {calError && <span className="text-red-500">{calError}</span>}
          {activePlan && <span className="ml-auto text-gray-500">Scale: {activePlan.scale.toFixed(1)} px/m</span>}
        </div>

        {/* Plan canvas */}
        <div
          className="relative flex-1 overflow-auto bg-gray-100"
          onClick={calMode ? handleCalClick : handlePlanClick}
          style={{ cursor: calMode ? "crosshair" : sel ? "pointer" : "default" }}
        >
          <div className="relative inline-block" style={{ width: displayW, height: displayH }}>
            {planImage && (
              <img src={planImage.src} className="absolute inset-0" style={{ width: displayW, height: displayH }} alt="Plan" />
            )}
            {/* Calibration points */}
            {calMode && calibration.pointA && (
              <div className="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
                style={{ left: calibration.pointA.x, top: calibration.pointA.y }} />
            )}
            {calMode && calibration.pointB && (
              <div className="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
                style={{ left: calibration.pointB.x, top: calibration.pointB.y }} />
            )}
            {/* Node markers */}
            {indoorNodes.map((n) => {
              const x = (n.position!.x) * (activePlan?.scale ?? 1);
              const y = (n.position!.y) * (activePlan?.scale ?? 1);
              const isSelected = n.id === sel;
              return (
                <div
                  key={n.id}
                  className="absolute w-5 h-5 rounded-full border-2 border-white cursor-pointer -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: x,
                    top: y,
                    background: isSelected ? "#3b82f6" : n.isEnding ? "#22c55e" : "#ef4444",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
                  title={n.id}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Outdoor: MapLibre container
  return (
    <div className="flex flex-col h-full">
      {/* Overlap warnings */}
      {overlaps.length > 0 && (
        <div className="px-2 py-1 bg-yellow-100 border-b text-xs text-yellow-800">
          {overlaps.map((o) => (
            <span key={`${o.a}-${o.b}`} className="mr-3">
              ⚠ Geofences chevauchent: {o.a} / {o.b}
            </span>
          ))}
        </div>
      )}
      <div ref={mapContainer} className="flex-1" />
    </div>
  );
}
