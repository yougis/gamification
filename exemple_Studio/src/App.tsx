import { useState } from 'react';

type Section = 'composer' | 'importer' | 'relire' | 'valider' | 'preview' | 'exporter';
type Status  = 'draft' | 'reviewed' | 'published';
type NType   = 'story' | 'quiz' | 'riddle' | 'geoloc' | 'pool' | 'ending';

interface GNode {
  id: string; type: NType; label: string; status: Status;
  x: number; y: number; module: string; activation: string; latch: boolean;
}
interface GEdge { from: string; to: string; }

const NW = 132, NH = 50;

const NODES: GNode[] = [
  { id: 'START',    type: 'story',  label: 'Introduction',      status: 'reviewed', x: 36,  y: 195, module: 'story-v2',  activation: 'always',                           latch: false },
  { id: 'ENIGME_1', type: 'quiz',   label: 'Quiz Bibliothèque', status: 'reviewed', x: 248, y: 72,  module: 'quiz-v3',   activation: 'OR(START)',                         latch: true  },
  { id: 'ENIGME_2', type: 'riddle', label: 'Salle des Armes',   status: 'draft',    x: 248, y: 290, module: 'riddle-v1', activation: 'OR(START)',                         latch: true  },
  { id: 'ENIGME_3', type: 'geoloc', label: 'Jardin Secret',     status: 'draft',    x: 460, y: 355, module: 'geoloc-v2', activation: 'AND(ENIGME_2)',                     latch: false },
  { id: 'POOL_A',   type: 'pool',   label: 'Pool 3/5',          status: 'reviewed', x: 460, y: 100, module: 'pool-v1',   activation: 'POOL(ENIGME_1,ENIGME_2,ENIGME_3)',  latch: false },
  { id: 'FIN',      type: 'ending', label: 'Dénouement Final',  status: 'reviewed', x: 672, y: 190, module: 'ending-v1', activation: 'AND(POOL_A)',                       latch: false },
];

const EDGES: GEdge[] = [
  { from: 'START',    to: 'ENIGME_1' },
  { from: 'START',    to: 'ENIGME_2' },
  { from: 'ENIGME_1', to: 'POOL_A'   },
  { from: 'ENIGME_2', to: 'POOL_A'   },
  { from: 'ENIGME_2', to: 'ENIGME_3' },
  { from: 'ENIGME_3', to: 'POOL_A'   },
  { from: 'POOL_A',   to: 'FIN'      },
];

const TYPE_COLOR: Record<NType, string> = {
  story: '#8b5cf6', quiz: '#3b82f6', riddle: '#ec4899',
  geoloc: '#f97316', pool: '#14b8a6', ending: '#6366f1',
};
const TYPE_LABEL: Record<NType, string> = {
  story: 'STORY', quiz: 'QUIZ', riddle: 'RIDDLE', geoloc: 'GEO', pool: 'POOL', ending: 'END',
};
const STATUS_COLOR: Record<Status, string> = {
  draft: '#f59e0b', reviewed: '#00e5ff', published: '#10b981',
};

function getNode(id: string) { return NODES.find(n => n.id === id)!; }

// ── Shared ──────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cls = {
    draft:     'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    reviewed:  'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
    published: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  }[status];
  return (
    <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${cls}`}>
      {status}
    </span>
  );
}

// ── Graph Canvas ─────────────────────────────────────────────────────────────

function GraphCanvas({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <svg viewBox="0 0 840 460" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.6" fill="#1e2228" />
        </pattern>
        <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#2a3040" />
        </marker>
        <marker id="arr-w" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#f59e0b60" />
        </marker>
      </defs>

      <rect width="840" height="460" fill="url(#dots)" />

      {EDGES.map((e, i) => {
        const s = getNode(e.from), t = getNode(e.to);
        if (!s || !t) return null;
        const x1 = s.x + NW, y1 = s.y + NH / 2;
        const x2 = t.x,      y2 = t.y + NH / 2;
        const isDraft = s.status === 'draft' || t.status === 'draft';
        return (
          <path
            key={i}
            d={`M${x1},${y1} C${x1 + 55},${y1} ${x2 - 55},${y2} ${x2},${y2}`}
            fill="none"
            stroke={isDraft ? '#f59e0b50' : '#2a3040'}
            strokeWidth="1.5"
            strokeDasharray={isDraft ? '5,3' : undefined}
            markerEnd={isDraft ? 'url(#arr-w)' : 'url(#arr)'}
          />
        );
      })}

      {NODES.map(n => {
        const sel   = n.id === selectedId;
        const tc    = TYPE_COLOR[n.type];
        const sc    = STATUS_COLOR[n.status];
        const draft = n.status === 'draft';

        return (
          <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(n.id)}>
            {sel && (
              <rect x={n.x - 3} y={n.y - 3} width={NW + 6} height={NH + 6} rx="6"
                fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.45" />
            )}
            <rect x={n.x} y={n.y} width={NW} height={NH} rx="4"
              fill="#111318"
              stroke={draft ? '#f59e0b' : sel ? '#00e5ff' : '#1e2228'}
              strokeWidth={sel ? 1.5 : 1}
              strokeDasharray={draft && !sel ? '4,2' : undefined}
            />
            <rect x={n.x} y={n.y + 5} width="3" height={NH - 10} rx="1.5" fill={tc} />
            <text x={n.x + 11} y={n.y + 16}
              fontSize="8" fill={tc} fontWeight="600" letterSpacing="1.5"
              fontFamily="JetBrains Mono, monospace">
              {TYPE_LABEL[n.type]}
            </text>
            <circle cx={n.x + NW - 11} cy={n.y + 13} r="3.5" fill={sc} opacity="0.9" />
            <text x={n.x + 11} y={n.y + 33}
              fontSize="11" fill={sel ? '#e8eaed' : '#c0c6d0'}
              fontFamily="Inter, sans-serif">
              {n.label.length > 15 ? n.label.slice(0, 14) + '…' : n.label}
            </text>
            <text x={n.x + 11} y={n.y + 44}
              fontSize="8" fill="#374151"
              fontFamily="JetBrains Mono, monospace">
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Node Property Panel ───────────────────────────────────────────────────────

function NodePanel({ node }: { node: GNode | null }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-dim">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12h6M12 9v6" strokeLinecap="round" />
        </svg>
        <span className="text-[9px] font-mono text-fog">Sélectionner un nœud</span>
      </div>
    );
  }

  const tc = TYPE_COLOR[node.type];

  return (
    <div className="p-4 flex flex-col gap-4 h-full">
      <div className="flex items-start gap-2.5">
        <div className="w-0.5 self-stretch rounded-full mt-0.5" style={{ background: tc }} />
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: tc }}>
            {TYPE_LABEL[node.type]}
          </div>
          <div className="text-sm font-semibold text-snow leading-snug">{node.label}</div>
          <div className="font-mono text-[8px] text-fog mt-0.5">{node.id}</div>
        </div>
        <StatusPill status={node.status} />
      </div>

      <div className="flex flex-col gap-2">
        {[
          { k: 'Module',     v: node.module     },
          { k: 'Activation', v: node.activation },
          { k: 'Latch',      v: node.latch ? 'true' : 'false' },
        ].map(r => (
          <div key={r.k}>
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-1">{r.k}</div>
            <div className="font-mono text-[10px] text-snow bg-canvas border border-rule rounded px-2 py-1.5 break-all">
              {r.v}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-rule flex gap-2">
        <button className="flex-1 text-[8px] font-mono uppercase tracking-wider py-1.5 rounded border border-rule text-fog hover:border-neon hover:text-neon transition-colors">
          Éditer
        </button>
        {node.status === 'draft' && (
          <button className="flex-1 text-[8px] font-mono uppercase tracking-wider py-1.5 rounded border border-caution/40 text-caution hover:bg-caution/10 transition-colors">
            Relire
          </button>
        )}
      </div>
    </div>
  );
}

// ── COMPOSER ─────────────────────────────────────────────────────────────────

function ComposerView() {
  const [selId, setSelId] = useState<string | null>(null);
  const selNode = NODES.find(n => n.id === selId) ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-rule shrink-0 bg-panel">
        <span className="text-[8px] font-mono uppercase tracking-widest text-fog mr-1">+ Ajouter</span>
        {(Object.keys(TYPE_COLOR) as NType[]).map(t => (
          <button key={t}
            className="px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider border border-rule text-fog hover:text-snow hover:border-snow/25 transition-colors">
            {TYPE_LABEL[t]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 font-mono text-[8px] text-fog">
          <span><span className="text-snow">6</span> nœuds</span>
          <span><span className="text-caution">2</span> draft</span>
          <span>7 arêtes</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-canvas overflow-hidden">
          <GraphCanvas selectedId={selId} onSelect={setSelId} />
        </div>
        <div className="w-56 shrink-0 border-l border-rule bg-panel flex flex-col">
          <div className="px-4 py-2 border-b border-rule shrink-0">
            <span className="text-[8px] font-mono uppercase tracking-widest text-fog">Propriétés</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <NodePanel node={selNode} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VALIDATEUR ────────────────────────────────────────────────────────────────

const C2_ERRORS = [
  { id: 'E001', node: 'ENIGME_2', sev: 'error', msg: "Nœud en statut draft — bloquera l'export" },
  { id: 'E002', node: 'ENIGME_3', sev: 'error', msg: "Nœud en statut draft — bloquera l'export" },
  { id: 'W001', node: 'ENIGME_3', sev: 'warn',  msg: 'Branche potentiellement inatteignable sans activation préalable de ENIGME_2' },
];

function ValidateurView() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl">
        <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Validation</h2>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-panel border border-rule rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C1 — Schéma AJV</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pass" />
                <span className="font-mono text-[8px] text-pass uppercase">Pass</span>
              </div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Draft-07 conforme. Tous les champs requis présents. Types valides.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">0 erreur · 0 avertissement</div>
          </div>

          <div className="bg-panel border border-fail/20 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C2 — Applicative</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-fail" />
                <span className="font-mono text-[8px] text-fail uppercase">Fail</span>
              </div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Cycles, atteignabilité isEnding, cohérence HOLD, objets/indices référencés.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">2 erreurs · 1 avertissement</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-5">
          {C2_ERRORS.map(e => (
            <div key={e.id} className={`flex items-start gap-3 bg-panel border rounded px-4 py-3 ${e.sev === 'error' ? 'border-fail/20' : 'border-caution/20'}`}>
              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${e.sev === 'error' ? 'bg-fail' : 'bg-caution'}`} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[8px] text-fog">{e.id}</span>
                  <span className={`font-mono text-[8px] uppercase ${e.sev === 'error' ? 'text-fail' : 'text-caution'}`}>{e.sev}</span>
                  <span className="font-mono text-[8px] text-neon">→ {e.node}</span>
                </div>
                <span className="text-[11px] text-snow">{e.msg}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 bg-fail/5 border border-fail/15 rounded">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2"/>
            <path d="M7 4.5v2.5M7 10v.4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[9px] text-fail">Export bloqué — corriger les erreurs C2 avant de continuer.</span>
        </div>
      </div>
    </div>
  );
}

// ── RELIRE ────────────────────────────────────────────────────────────────────

function RelireView() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(NODES.map(n => [n.id, n.status]))
  );
  const mark = (id: string) => setStatuses(prev => ({ ...prev, [id]: 'reviewed' }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Relire</h2>
        <div className="bg-panel border border-rule rounded-md overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-rule">
                {['ID', 'Label', 'Type', 'Module', 'Statut', 'Révisé par', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[8px] uppercase tracking-widest text-fog">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NODES.map((n, i) => {
                const s = statuses[n.id];
                return (
                  <tr key={n.id} className={`border-b border-rule/40 hover:bg-pane2 transition-colors ${i % 2 ? 'bg-canvas/25' : ''}`}>
                    <td className="px-4 py-3 font-mono text-[9px] text-neon">{n.id}</td>
                    <td className="px-4 py-3 text-snow text-[11px]">{n.label}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: TYPE_COLOR[n.type] }}>
                        {TYPE_LABEL[n.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[9px] text-fog">{n.module}</td>
                    <td className="px-4 py-3"><StatusPill status={s} /></td>
                    <td className="px-4 py-3 font-mono text-[9px] text-fog">{s !== 'draft' ? 'c.dupont' : '—'}</td>
                    <td className="px-4 py-3">
                      {s === 'draft' ? (
                        <button onClick={() => mark(n.id)}
                          className="px-2 py-1 text-[8px] font-mono uppercase tracking-wider border border-neon/35 text-neon hover:bg-neon/10 rounded transition-colors">
                          Valider →
                        </button>
                      ) : (
                        <span className="font-mono text-[9px] text-pass">✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── IMPORTER ─────────────────────────────────────────────────────────────────

const IMPORT_HISTORY = [
  { name: 'chateau-v1.2.json', date: '2026-09-14  17:42', nodes: 6, ok: true  },
  { name: 'chateau-v1.1.json', date: '2026-09-12  09:15', nodes: 5, ok: true  },
  { name: 'test-draft.json',   date: '2026-09-10  14:03', nodes: 3, ok: false },
];

function ImporterView() {
  const [drag, setDrag] = useState(false);
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-xl">
        <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Importer</h2>

        <div
          className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-3 py-16 mb-6 transition-colors ${drag ? 'border-neon bg-neon/5' : 'border-rule hover:border-fog/40 cursor-pointer'}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={() => setDrag(false)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={drag ? '#00e5ff' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3M8.5 11.5 12 15l3.5-3.5"/>
            <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>
          </svg>
          <div className="text-center">
            <div className="text-sm text-snow mb-1">Glisser un fichier <span className="font-mono text-neon">game.json</span></div>
            <div className="font-mono text-[8px] text-fog">ou cliquer pour parcourir — import 100 % local, zéro réseau</div>
          </div>
        </div>

        <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Historique des imports</div>
        <div className="flex flex-col gap-2">
          {IMPORT_HISTORY.map((h, i) => (
            <div key={i} className="flex items-center gap-3 bg-panel border border-rule rounded px-4 py-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                <path d="M14 2v6h6"/>
              </svg>
              <div className="flex-1">
                <div className="font-mono text-[9px] text-snow">{h.name}</div>
                <div className="font-mono text-[8px] text-fog">{h.date} · {h.nodes} nœuds</div>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${h.ok ? 'bg-pass' : 'bg-fail'}`} />
              <button className="text-[8px] font-mono uppercase tracking-wider text-fog hover:text-neon transition-colors">
                Charger
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PREVIEW ───────────────────────────────────────────────────────────────────

const SIM_STEPS = [
  { nodeId: 'START',    event: 'INIT',       input: null,               output: 'Affichage intro',    bypass: false },
  { nodeId: 'ENIGME_1', event: 'ACTIVATE',   input: 'OR(START) → true', output: 'Nœud activé',        bypass: false },
  { nodeId: 'ENIGME_1', event: 'ANSWER',     input: 'Victor Hugo',      output: 'correct',             bypass: false },
  { nodeId: 'POOL_A',   event: 'POOL_CHECK', input: '1/3 validés',      output: 'seuil non atteint',   bypass: true  },
];

function PreviewView() {
  const [step, setStep] = useState(0);
  const cur  = SIM_STEPS[step];
  const node = NODES.find(n => n.id === cur.nodeId)!;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow">Prévisualiser</h2>
          <button onClick={() => setStep(0)}
            className="text-[8px] font-mono uppercase tracking-wider px-3 py-1.5 border border-rule rounded text-fog hover:border-neon/40 hover:text-neon transition-colors">
            ↺ Rejouer fixture
          </button>
        </div>

        <div className="bg-panel border border-rule rounded-md p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-0.5 h-8 rounded-full" style={{ background: TYPE_COLOR[node.type] }} />
            <div>
              <div className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: TYPE_COLOR[node.type] }}>
                {TYPE_LABEL[node.type]}
              </div>
              <div className="text-sm font-semibold text-snow">{node.label}</div>
            </div>
            <div className="ml-auto font-mono text-[8px] text-fog">étape {step + 1}/{SIM_STEPS.length}</div>
            {cur.bypass && (
              <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 bg-caution/10 border border-caution/20 text-caution rounded-sm">
                bypass
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { l: 'Événement', v: cur.event     },
              { l: 'Entrée',    v: cur.input ?? '—' },
              { l: 'Sortie',    v: cur.output     },
            ].map(r => (
              <div key={r.l}>
                <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-1">{r.l}</div>
                <div className="font-mono text-[9px] text-snow bg-canvas rounded px-2 py-1.5">{r.v}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="px-4 py-1.5 text-[8px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:border-fog disabled:opacity-30 transition-colors">
              ← Précédent
            </button>
            <button onClick={() => setStep(s => Math.min(SIM_STEPS.length - 1, s + 1))} disabled={step === SIM_STEPS.length - 1}
              className="px-4 py-1.5 text-[8px] font-mono uppercase tracking-wider border border-neon/30 rounded text-neon hover:bg-neon/10 disabled:opacity-30 transition-colors">
              Suivant →
            </button>
            <button className="ml-auto px-3 py-1.5 text-[8px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:border-caution/40 hover:text-caution transition-colors">
              Bypass capteur
            </button>
          </div>
        </div>

        <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Trace de simulation</div>
        <div className="bg-canvas border border-rule rounded p-3 space-y-1">
          {SIM_STEPS.slice(0, step + 1).map((s, i) => {
            const n = NODES.find(nd => nd.id === s.nodeId)!;
            return (
              <div key={i} className={`flex gap-2 font-mono text-[9px] ${i === step ? 'text-snow' : 'text-fog'}`}>
                <span className="text-dim select-none w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span style={{ color: TYPE_COLOR[n.type] }}>[{s.nodeId}]</span>
                <span>{s.event}</span>
                {s.bypass && <span className="text-caution">[bypass]</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── EXPORTER ─────────────────────────────────────────────────────────────────

const PREFLIGHT = [
  { ok: true,  label: 'Schéma C1 conforme (AJV Draft-07)' },
  { ok: true,  label: 'Tous les nœuds atteignables depuis START' },
  { ok: true,  label: 'Nœud isEnding présent (FIN)' },
  { ok: false, label: '2 nœuds en statut draft (ENIGME_2, ENIGME_3)' },
  { ok: false, label: 'holdMode: none — kiosque nécessite reviewed complet' },
];

function ExporterView() {
  const blocked = PREFLIGHT.some(p => !p.ok);
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-md">
        <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Exporter</h2>

        <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Contrôle pré-export</div>
        <div className="bg-panel border border-rule rounded-md overflow-hidden mb-5">
          {PREFLIGHT.map((p, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < PREFLIGHT.length - 1 ? 'border-b border-rule/40' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                {p.ok ? (
                  <>
                    <circle cx="7" cy="7" r="6" stroke="#10b981" strokeWidth="1.2"/>
                    <path d="M4.5 7l2 2 3-3" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </>
                ) : (
                  <>
                    <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2"/>
                    <path d="M5 5l4 4M9 5l-4 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
                  </>
                )}
              </svg>
              <span className={`text-[11px] ${p.ok ? 'text-snow' : 'text-fail'}`}>{p.label}</span>
            </div>
          ))}
        </div>

        <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Manifeste (aperçu)</div>
        <div className="bg-canvas border border-rule rounded p-3 mb-5 font-mono text-[9px] space-y-1">
          <div className="flex"><span className="text-neon flex-1">game.json</span><span className="text-fog mr-4">v2.4.1</span><span className="text-fog">12.4 KB</span></div>
          <div className="flex"><span className="text-neon flex-1">assets/intro.mp4</span><span className="text-fog">4.2 MB</span></div>
          <div className="flex"><span className="text-neon flex-1">assets/map.png</span><span className="text-fog">340 KB</span></div>
          <div className="pt-2 border-t border-rule text-fog">
            sha256: <span className="text-dim">a3f2c1d8…e9c8e1</span> · 3 fichiers · 4.56 MB
          </div>
        </div>

        <button disabled={blocked}
          className={`w-full py-3 rounded font-display font-bold text-sm uppercase tracking-widest transition-all ${
            blocked
              ? 'bg-fail/8 border border-fail/20 text-fail/50 cursor-not-allowed'
              : 'bg-neon text-canvas hover:brightness-110'
          }`}>
          {blocked ? 'Export bloqué — corriger les erreurs' : 'Exporter le pack offline'}
        </button>
      </div>
    </div>
  );
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

type NavItem = { id: Section; label: string; badge?: number };
const NAV: NavItem[] = [
  { id: 'composer', label: 'Composer'      },
  { id: 'importer', label: 'Importer'      },
  { id: 'relire',   label: 'Relire',        badge: 2 },
  { id: 'valider',  label: 'Valider',       badge: 2 },
  { id: 'preview',  label: 'Prévisualiser' },
  { id: 'exporter', label: 'Exporter'      },
];

function NavIcon({ id }: { id: Section }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {id === 'composer' && <>
        <rect x="3" y="3" width="8" height="8" rx="1"/>
        <rect x="13" y="3" width="8" height="8" rx="1"/>
        <rect x="3" y="13" width="8" height="8" rx="1"/>
        <path d="M17 13v8M13 17h8"/>
      </>}
      {id === 'importer' && <>
        <path d="M12 15V3M8.5 11.5 12 15l3.5-3.5"/>
        <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>
      </>}
      {id === 'relire' && <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
        <circle cx="12" cy="12" r="3"/>
      </>}
      {id === 'valider' && <>
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 12l3 3 5-5"/>
      </>}
      {id === 'preview' && (
        <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
      )}
      {id === 'exporter' && <>
        <path d="M12 9v12M8.5 12.5 12 9l3.5 3.5"/>
        <path d="M4 7V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1"/>
      </>}
    </svg>
  );
}

// ── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState<Section>('composer');

  const views = {
    composer: <ComposerView />,
    importer: <ImporterView />,
    relire:   <RelireView />,
    valider:  <ValidateurView />,
    preview:  <PreviewView />,
    exporter: <ExporterView />,
  };

  return (
    <div className="flex h-screen bg-canvas text-snow overflow-hidden">

      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-panel border-r border-rule flex flex-col">
        <div className="px-5 py-5 border-b border-rule">
          <div className="font-display font-extrabold text-xl tracking-[0.22em] uppercase text-snow leading-none">
            Studio
          </div>
          <div className="font-mono text-[7px] text-fog tracking-[0.18em] mt-1 uppercase">
            Jeu Numérique
          </div>
        </div>

        <div className="px-4 py-3 border-b border-rule">
          <div className="text-[7px] font-mono uppercase tracking-widest text-fog mb-1">Projet actif</div>
          <div className="text-[11px] font-semibold text-snow leading-snug">Mystère au Château</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-caution" />
            <span className="font-mono text-[7px] text-caution">2 nœuds draft</span>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  active ? 'text-neon bg-neon/5' : 'text-fog hover:text-snow hover:bg-pane2'
                }`}>
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon rounded-r" />
                )}
                <NavIcon id={item.id} />
                <span className="text-[11px] font-medium">{item.label}</span>
                {item.badge != null && (
                  <span className="ml-auto font-mono text-[7px] bg-fail/20 text-fail px-1.5 py-0.5 rounded-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-rule">
          <div className="font-mono text-[7px] text-fog">v2.4.1 — Undo/Redo actif</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-11 shrink-0 border-b border-rule flex items-center px-5 gap-4 bg-panel/60">
          <span className="font-display font-bold text-sm tracking-widest uppercase text-snow">
            {NAV.find(n => n.id === section)?.label}
          </span>
          <div className="h-3 w-px bg-rule" />
          <div className="flex items-center gap-4 font-mono text-[8px] text-fog">
            <span><span className="text-snow">6</span> nœuds</span>
            <span><span className="text-caution">2</span> draft</span>
            <span><span className="text-pass">4</span> reviewed</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors">
              Undo
            </button>
            <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors">
              Redo
            </button>
            <button disabled
              className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-fail/20 rounded text-fail/45 cursor-not-allowed">
              Exporter
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          {views[section]}
        </main>
      </div>
    </div>
  );
}
