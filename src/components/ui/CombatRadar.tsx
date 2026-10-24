import type { EnemyState, PickupState } from "@/store/useGameStore";
import { projectRadarContact } from "@/lib/radarProjection";
import { PICKUP_PRESENTATION } from "@/lib/pickupPresentation";
import { PickupIcon } from "./PickupIcon";

export function CombatRadar({ enemies, pickups, position, heading, selectedId }: {
  enemies: Record<string, EnemyState>;
  pickups: Record<string, PickupState>;
  position: [number, number];
  heading: number;
  selectedId?: string;
}) {
  const supplyMarkers: {id: string; kind: PickupState["kind"]; x: number; y: number; anchorX: number; anchorY: number}[] = [];
  const sorted = Object.values(pickups).map(pickup => ({pickup, ...projectRadarContact(pickup.position[0] - position[0], pickup.position[2] - position[1], heading)}))
    .sort((a, b) => Number(b.pickup.id === selectedId) - Number(a.pickup.id === selectedId) || a.distance - b.distance || a.pickup.id.localeCompare(b.pickup.id)).slice(0, 8);
  for (const {pickup, x, y} of sorted) {
    // Separate only along the horizontal axis: front/back and true range remain clear.
    const offset = [0, -22, 22, -44, 44, -66, 66, -88, 88].find(offset =>
      Math.hypot(x + offset, y) < 101 && supplyMarkers.every(marker => Math.hypot(marker.x - x - offset, marker.y - y) >= 21)) ?? 0;
    supplyMarkers.push({id: pickup.id, kind: pickup.kind, x: x + offset, y, anchorX: x, anchorY: y});
  }
  const north = projectRadarContact(0, -900, heading);
  return (
    <div data-hud-radar-panel className="wf-frame p-2">
      <div className="mb-1 flex justify-between gap-2 text-[10px] text-wf-dim"><span>RADAR // NOSE_UP</span><span>900M</span></div>
      <svg role="img" aria-label="Radar, aircraft nose at top, tail at bottom" data-hud-radar viewBox="-120 -120 240 240" className="block h-full w-full overflow-visible">
        <circle r={105} fill="#000" fillOpacity={0.55} stroke="#f2f2f0" strokeOpacity={0.8} />
        <circle r={51} fill="none" stroke="white" strokeOpacity={0.14} />
        <path d="M0 -103V-12M0 12V103M-103 0H-12M12 0H103" stroke="white" strokeOpacity={0.12} />
        <path d="M0 0L-41 -98A106 106 0 0 1 41 -98Z" fill="#f2f2f0" fillOpacity={0.07} />
        <text x={north.x * 1.2} y={north.y * 1.2 + 3} fill="#f2f2f0" textAnchor="middle" fontSize={11}>N</text>
        {supplyMarkers.map(marker => (
          <g key={marker.id} data-radar-pickup={marker.id} data-radar-x={marker.anchorX} data-radar-y={marker.anchorY} transform={`translate(${marker.x} ${marker.y})`}>
            <title>{PICKUP_PRESENTATION[marker.kind].label}</title>
            <path d={`M0 0L${marker.anchorX-marker.x} ${marker.anchorY-marker.y}`} stroke={PICKUP_PRESENTATION[marker.kind].color} strokeWidth={1} />
            <rect x={-10} y={-10} width={20} height={20} rx={3} fill="#000" stroke={marker.id === selectedId ? "white" : PICKUP_PRESENTATION[marker.kind].color} strokeWidth={1.6} />
            <PickupIcon kind={marker.kind} x={-8} y={-8} width={16} height={16} color="white" />
          </g>
        ))}
        {Object.values(enemies).slice(0, 12).map(enemy => {
          const contact = projectRadarContact(enemy.position[0]-position[0], enemy.position[2]-position[1], heading);
          return <g key={enemy.id} data-radar-enemy={enemy.id} data-radar-x={contact.x} data-radar-y={contact.y} transform={`translate(${contact.x} ${contact.y})`} opacity={contact.outside ? 0.5 : 1}>
            <title>{enemy.role}, {Math.round(contact.distance)} m</title>
            <path d="M0 -5L5 4H-5Z" fill={enemy.role === "bomber" ? "#ffd572" : "#ff7878"} stroke="#05070a" strokeWidth={1.5} />
          </g>;
        })}
        <path d="M0 -9L6 7L0 4L-6 7Z" fill="white" stroke="#05070a" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
