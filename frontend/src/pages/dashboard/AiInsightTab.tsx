import { useState, useEffect } from 'react';

// ── Palette ───────────────────────────────────────────────────────────────────
const C_CYAN      = '#06B6D4';
const C_EMERALD   = '#34D399';
const C_PINK      = '#F472B6';
const C_LAVENDER  = '#A78BFA';
const C_INDIGO    = '#818CF8';
const C_AMBER     = '#F59E0B';

// ── Explicit types ────────────────────────────────────────────────────────────
type SeverityKey = 'critical' | 'watch' | 'action' | 'ok';
type SignalType  = 'up' | 'warn' | 'info' | 'down';
type DomainKey   = 'events' | 'cameras' | 'users';
type FeedFilter  = 'all' | 'critical' | 'watch' | 'ok';
type ViewMode    = 'command' | 'timeline' | 'health';

interface KPI        { label: string; value: string; sub: string; accent: string; icon: string; }
interface Signal     { label: string; type: SignalType; }
interface BarSegment { pct: number; color: string; label: string; }
interface Action     { label: string; icon: string; accent: string; }

interface DomainData {
  severity:      SeverityKey;
  severityLabel: string;
  headline:      string;
  kpis:          KPI[];
  signals:       Signal[];
  barLabel:      string;
  barSegments:   BarSegment[];
  actions:       Action[];
}

type InsightDataMap = Record<DomainKey, DomainData>;

// ── Static data ───────────────────────────────────────────────────────────────
const INSIGHT_DATA: InsightDataMap = {
  events: {
    severity: 'watch',
    severityLabel: 'Watch',
    headline: 'Activity spiked +13.2% today vs yesterday. CAM-07 at Main Gate is generating the highest alert volume. Peak traffic clusters at 8–10 AM and 5–7 PM. 81% resolution rate maintained.',
    kpis: [
      { label: 'Total Events', value: '3,847', sub: '30-day window',   accent: C_CYAN,     icon: '📋' },
      { label: 'Resolved',     value: '3,102', sub: '81% rate',        accent: C_EMERALD,  icon: '✅' },
      { label: 'Pending',      value: '620',   sub: 'in queue',        accent: C_AMBER,    icon: '⏳' },
      { label: 'Critical',     value: '125',   sub: 'needs attention', accent: C_PINK,     icon: '🚨' },
    ],
    signals: [
      { label: '+13.2% vs yesterday',    type: 'up'   },
      { label: 'Peak 8–10 AM · 5–7 PM', type: 'warn' },
      { label: 'CAM-07 top alert source', type: 'info' },
      { label: '125 critical open',      type: 'down' },
      { label: 'Avg resolve: 18 min',    type: 'info' },
    ],
    barLabel: 'Event type distribution',
    barSegments: [
      { pct: 47, color: C_CYAN,     label: 'Motion 47%' },
      { pct: 17, color: C_PINK,     label: 'Intrusion 17%' },
      { pct: 13, color: C_INDIGO,   label: 'Face 13%' },
      { pct: 11, color: C_EMERALD,  label: 'Vehicle 11%' },
      { pct: 12, color: C_LAVENDER, label: 'Other 12%' },
    ],
    actions: [
      { label: 'Clear critical queue', icon: '⚡', accent: C_PINK },
      { label: 'Review CAM-07 feed',   icon: '📹', accent: C_CYAN },
      { label: 'Schedule peak roster', icon: '📅', accent: C_AMBER },
    ],
  },
  cameras: {
    severity: 'critical',
    severityLabel: 'Critical',
    headline: 'Only 5 of 194 cameras are currently online. 166 units offline across 14 zones — Perimeter East is worst with 21 down. 23 in scheduled maintenance. Immediate field inspection required.',
    kpis: [
      { label: 'Total Fleet',  value: '194', sub: '14 zones',       accent: C_CYAN,     icon: '📹' },
      { label: 'Online',       value: '5',   sub: '2.6% coverage',  accent: C_EMERALD,  icon: '🟢' },
      { label: 'Offline',      value: '166', sub: 'urgent',         accent: C_PINK,     icon: '🔴' },
      { label: 'Maintenance',  value: '23',  sub: 'scheduled',      accent: C_LAVENDER, icon: '🔧' },
    ],
    signals: [
      { label: 'Perimeter East: 21 offline', type: 'down' },
      { label: 'Perimeter West: 19 offline', type: 'down' },
      { label: 'Loading Bay A: 18 offline',  type: 'warn' },
      { label: 'Uptime avg: 99.85%',         type: 'up'   },
    ],
    barLabel: 'Fleet health ratio',
    barSegments: [
      { pct: 3,  color: C_EMERALD,  label: 'Online 3%' },
      { pct: 12, color: C_LAVENDER, label: 'Maintenance 12%' },
      { pct: 85, color: C_PINK,     label: 'Offline 85%' },
    ],
    actions: [
      { label: 'Dispatch Perimeter East', icon: '🚨', accent: C_PINK },
      { label: 'Schedule fleet audit',    icon: '🔧', accent: C_LAVENDER },
      { label: 'View offline map',        icon: '🗺️', accent: C_CYAN },
    ],
  },
  users: {
    severity: 'action',
    severityLabel: 'Action',
    headline: '12 pending approvals with 3 new today — immediate action required. 96 of 128 users active this month at 75% engagement. Login traffic peaked on May 17 at 71 sessions. Operators lead at 41%.',
    kpis: [
      { label: 'Total Users', value: '128', sub: '12 new this month', accent: C_CYAN,     icon: '👥' },
      { label: 'Active',      value: '96',  sub: '75% engagement',    accent: C_EMERALD,  icon: '✅' },
      { label: 'Pending',     value: '12',  sub: '3 new today',       accent: C_LAVENDER, icon: '⏳' },
      { label: 'Suspended',   value: '4',   sub: 'no change',         accent: C_PINK,     icon: '🚫' },
    ],
    signals: [
      { label: '3 approvals need action today', type: 'warn' },
      { label: 'Peak logins May 17: 71',        type: 'up'   },
      { label: 'Operators: largest role (52)',   type: 'info' },
      { label: '4 suspended accounts',          type: 'down' },
    ],
    barLabel: 'Role distribution',
    barSegments: [
      { pct: 41, color: C_CYAN,     label: 'Operator 41%' },
      { pct: 30, color: C_EMERALD,  label: 'Viewer 30%' },
      { pct: 19, color: C_INDIGO,   label: 'Auditor 19%' },
      { pct: 10, color: C_LAVENDER, label: 'Admin 10%' },
    ],
    actions: [
      { label: 'Approve pending users',  icon: '✅', accent: C_LAVENDER },
      { label: 'Review suspended list',  icon: '🔍', accent: C_PINK },
      { label: 'Export user report',     icon: '📊', accent: C_CYAN },
    ],
  },
};

const TIMELINE_ITEMS: Array<{
  time: string;
  sev: 'critical' | 'watch' | 'ok';
  domain: string;
  text: string;
}> = [
  { time: 'Today · 05:28 AM', sev: 'critical', domain: 'Cameras', text: '166 cameras offline — only 5 of 194 active. Perimeter East worst zone with 21 units down.' },
  { time: 'Today · 05:28 AM', sev: 'critical', domain: 'Events',  text: 'Intrusion alert triggered at Warehouse Entry via CAM-15. Severity: High. Immediate response needed.' },
  { time: 'Today · 05:22 AM', sev: 'watch',    domain: 'Users',   text: '12 user approvals pending — 3 added today. Approval queue growing. Action recommended.' },
  { time: 'Today · 05:11 AM', sev: 'watch',    domain: 'Events',  text: 'Event activity spiked +13.2% vs yesterday. CAM-07 at Main Gate generating highest alert volume.' },
  { time: 'Today · 04:55 AM', sev: 'ok',       domain: 'Users',   text: '96 users active this month. Login peak on May 17 at 71 sessions. Engagement at 75%.' },
  { time: 'Today · 04:41 AM', sev: 'ok',       domain: 'Events',  text: 'Average event resolution time holding at 18 minutes. Within SLA targets. 81% resolution rate.' },
];

// ── Severity config ───────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; border: string; text: string; label: string }> = {
  critical: { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)',  text: '#F472B6', label: 'Critical' },
  watch:    { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',   text: '#F59E0B', label: 'Watch'    },
  action:   { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)',  text: '#A78BFA', label: 'Action'   },
  ok:       { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',   text: '#34D399', label: 'OK'       },
  up:       { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)', text: '#34D399', label: ''  },
  warn:     { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', text: '#F59E0B', label: ''  },
  info:     { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)',  text: '#06B6D4', label: ''  },
  down:     { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)', text: '#F472B6', label: ''  },
};

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimCount({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.max(target / 35, 1);
    const t = setInterval(() => {
      n += step;
      if (n >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(n));
    }, 28);
    return () => clearInterval(t);
  }, [target]);
  return <>{val.toLocaleString()}</>;
}

// ── SVG ring ──────────────────────────────────────────────────────────────────
function Ring({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 32, cx = 40, cy = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={cx} y={cy - 4} fill={color} textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="700" fontFamily="'DM Mono', monospace">{score}</text>
      <text x={cx} y={cy + 13} fill="var(--text-muted, #6B7FA3)" textAnchor="middle"
        fontSize="9" fontFamily="'Outfit', sans-serif">{label}</text>
    </svg>
  );
}

// ── Domain strip cell ─────────────────────────────────────────────────────────
function StripCell({ domain, data, active, onClick }: {
  domain: DomainKey;
  data: DomainData;
  active: boolean;
  onClick: () => void;
}) {
  const sev = SEV[data.severity];
  const icons: Record<DomainKey, string> = { events: '🔔', cameras: '📹', users: '👥' };
  const bigAccent = data.kpis[0].accent;
  const barPct = domain === 'cameras' ? 3 : domain === 'users' ? 75 : 81;

  return (
    <div onClick={onClick} style={{
      flex: 1, padding: '16px 18px', cursor: 'pointer',
      background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
      borderBottom: active ? `2px solid ${bigAccent}` : '2px solid transparent',
      transition: 'all 0.2s ease',
      borderRight: domain !== 'users' ? '1px solid var(--border-default, rgba(255,255,255,0.07))' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16,
          background: `${bigAccent}18`, border: `1px solid ${bigAccent}30`,
        }}>{icons[domain]}</div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
          background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
        }}>{sev.label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: bigAccent, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-1px', lineHeight: 1 }}>
        {data.kpis[0].value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)', margin: '3px 0 10px' }}>
        {data.kpis[0].sub}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 7 }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: bigAccent, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: data.signals[0].type === 'up' ? C_EMERALD : C_AMBER }}>
          {data.signals[0].type === 'up' ? '↑' : '⚠'}
        </span>
        {data.signals[0].label}
      </div>
    </div>
  );
}

// ── Detail pane ───────────────────────────────────────────────────────────────
function DetailPane({ domain }: { domain: DomainKey }) {
  const d = INSIGHT_DATA[domain];
  const signalIcon: Record<SignalType, string> = { up: '↑', warn: '⚠', info: '●', down: '↓' };

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default, rgba(255,255,255,0.07))', background: 'rgba(0,0,0,0.15)' }}>
      <p style={{ fontSize: 13, color: 'var(--text-dimmer, #8899BB)', lineHeight: 1.7, marginBottom: 14 }}>
        {d.headline}
      </p>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {d.kpis.map(k => (
          <div key={k.label} style={{
            background: 'var(--bg-card-inner, #111827)', borderRadius: 10, padding: '10px 12px',
            border: `1px solid ${k.accent}22`,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted, #6B7FA3)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: k.accent, letterSpacing: '-0.5px' }}>
              <AnimCount target={parseInt(k.value.replace(/,/g, ''), 10)} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted, #6B7FA3)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Signal chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {d.signals.map((s, i) => {
          const sc = SEV[s.type] ?? SEV.info;
          return (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
              background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 10 }}>{signalIcon[s.type]}</span>{s.label}
            </span>
          );
        })}
      </div>

      {/* Distribution bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)', marginBottom: 6 }}>{d.barLabel}</div>
        <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
          {d.barSegments.map((s, i) => (
            <div key={i} style={{
              width: `${s.pct}%`, height: '100%', background: s.color,
              borderRadius: i === 0 ? '99px 0 0 99px' : i === d.barSegments.length - 1 ? '0 99px 99px 0' : 0,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 7 }}>
          {d.barSegments.map((s, i) => (
            <span key={i} style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: '1px solid var(--border-default, rgba(255,255,255,0.07))', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted, #6B7FA3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Recommended actions
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {d.actions.map((a, i) => (
            <button key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: `${a.accent}15`, color: a.accent,
              border: `1px solid ${a.accent}35`,
              cursor: 'pointer', fontFamily: 'var(--font-main, sans-serif)',
              transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = `${a.accent}28`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${a.accent}15`)}
            >
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────
function TimelineView() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const dotColor: Record<string, string> = { critical: C_PINK, watch: C_AMBER, ok: C_EMERALD };
  const domainColor: Record<string, string> = { Events: C_CYAN, Cameras: C_PINK, Users: C_LAVENDER };

  const filters: { key: FeedFilter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'critical', label: 'Critical' },
    { key: 'watch',    label: 'Watch'    },
    { key: 'ok',       label: 'OK'       },
  ];

  const filtered = filter === 'all'
    ? TIMELINE_ITEMS
    : TIMELINE_ITEMS.filter(i => i.sev === filter);

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading, #fff)' }}>Activity signal feed</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
              border: '1px solid',
              borderColor: filter === f.key ? 'rgba(255,255,255,0.18)' : 'var(--border-default, rgba(255,255,255,0.07))',
              background: filter === f.key ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: filter === f.key ? 'var(--text-heading, #fff)' : 'var(--text-muted, #6B7FA3)',
              cursor: 'pointer', fontFamily: 'var(--font-main, sans-serif)',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{
          position: 'absolute', left: 7, top: 6, bottom: 6,
          width: 1, background: 'var(--border-default, rgba(255,255,255,0.07))',
        }} />
        {filtered.map((item, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 16 }}>
            <div style={{
              position: 'absolute', left: -15, top: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: dotColor[item.sev],
              border: '2px solid var(--bg-card, #0D1320)',
              boxShadow: item.sev === 'critical' ? `0 0 8px ${dotColor[item.sev]}` : 'none',
            }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted, #6B7FA3)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 3 }}>
              {item.time}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-primary, #F0F4FF)', lineHeight: 1.55, marginBottom: 6 }}>
              {item.text}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: SEV[item.sev].bg, color: SEV[item.sev].text,
                border: `1px solid ${SEV[item.sev].border}`,
              }}>{SEV[item.sev].label}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: `${domainColor[item.domain] ?? C_CYAN}12`,
                color: domainColor[item.domain] ?? C_CYAN,
                border: `1px solid ${domainColor[item.domain] ?? C_CYAN}30`,
              }}>{item.domain}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Health view ───────────────────────────────────────────────────────────────
function HealthView() {
  const scores: Array<{
    title: string; score: number; color: string; icon: string;
    rows: Array<{ label: string; val: string; pct: number; color: string }>;
  }> = [
    {
      title: 'Events health', score: 81, color: C_CYAN, icon: '🔔',
      rows: [
        { label: 'Resolution rate', val: '81%',    pct: 81, color: C_EMERALD },
        { label: 'Critical open',   val: '125',    pct: 32, color: C_PINK    },
        { label: 'Avg resolve',     val: '18 min', pct: 72, color: C_CYAN    },
      ],
    },
    {
      title: 'Camera health', score: 3, color: C_PINK, icon: '📹',
      rows: [
        { label: 'Online rate', val: '2.6%',      pct: 3,  color: C_EMERALD  },
        { label: 'Offline',     val: '166 units', pct: 85, color: C_PINK     },
        { label: 'Avg uptime',  val: '99.85%',    pct: 99, color: C_EMERALD  },
      ],
    },
    {
      title: 'User health', score: 75, color: C_LAVENDER, icon: '👥',
      rows: [
        { label: 'Active rate',   val: '75%', pct: 75, color: C_EMERALD  },
        { label: 'Pending queue', val: '12',  pct: 40, color: C_LAVENDER },
        { label: 'Suspended',     val: '4',   pct: 12, color: C_PINK     },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {scores.map(s => (
          <div key={s.title} style={{
            background: 'var(--bg-card-inner, #111827)', borderRadius: 12,
            padding: '14px 16px', border: '1px solid var(--border-default, rgba(255,255,255,0.07))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading, #fff)' }}>{s.title}</span>
              <span style={{
                fontSize: 13, width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
              }}>{s.icon}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Ring score={s.score} color={s.color} label="/ 100" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.rows.map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)' }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: r.color }}>{r.val}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const AIInsightTab = () => {
  const [view, setView]               = useState<ViewMode>('command');
  const [activeDomain, setActiveDomain] = useState<DomainKey>('events');

  const viewBtns: { key: ViewMode; icon: string; label: string }[] = [
    { key: 'command',  icon: '⊞', label: 'Command'  },
    { key: 'timeline', icon: '⟳', label: 'Timeline' },
    { key: 'health',   icon: '◎', label: 'Health'   },
  ];

  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{
        background: 'var(--bg-card, #0D1320)',
        border: '1px solid var(--border-default, rgba(255,255,255,0.07))',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: 'var(--shadow-card, 0 4px 24px rgba(0,0,0,0.4))',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px',
          borderBottom: '1px solid var(--border-default, rgba(255,255,255,0.07))',
          background: 'var(--bg-surface, #141C2E)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: C_EMERALD,
              display: 'inline-block', animation: 'db-pulse 2s infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading, #fff)' }}>
              AI insight command center
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
              background: 'rgba(52,211,153,0.12)', color: C_EMERALD,
              border: '1px solid rgba(52,211,153,0.25)',
            }}>Live · 30d</span>
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'var(--bg-card-inner, #111827)',
            border: '1px solid var(--border-default, rgba(255,255,255,0.07))',
            borderRadius: 10, padding: 3,
          }}>
            {viewBtns.map(b => (
              <button key={b.key} onClick={() => setView(b.key)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-main, sans-serif)',
                background: view === b.key ? 'var(--bg-surface-3, #1F2D47)' : 'transparent',
                color: view === b.key ? 'var(--text-heading, #fff)' : 'var(--text-muted, #6B7FA3)',
                boxShadow: view === b.key ? '0 1px 6px rgba(0,0,0,0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <span style={{ fontSize: 11 }}>{b.icon}</span>{b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Command view */}
        {view === 'command' && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default, rgba(255,255,255,0.07))' }}>
              {(Object.keys(INSIGHT_DATA) as DomainKey[]).map(domain => (
                <StripCell
                  key={domain}
                  domain={domain}
                  data={INSIGHT_DATA[domain]}
                  active={activeDomain === domain}
                  onClick={() => setActiveDomain(domain)}
                />
              ))}
            </div>
            <DetailPane domain={activeDomain} />
          </>
        )}

        {/* Timeline view */}
        {view === 'timeline' && <TimelineView />}

        {/* Health view */}
        {view === 'health' && <HealthView />}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--border-default, rgba(255,255,255,0.07))',
          background: 'var(--bg-surface, #141C2E)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #6B7FA3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>🕐</span>
            Updated just now · auto-refreshes every 5 min
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const msg = `Give me a full AI summary of the current dashboard state: Events (3,847 total, 81% resolved, 125 critical), Cameras (only 5/194 online, 166 offline), Users (12 pending approvals, 96 active).`;
                if (typeof (window as any).sendPrompt === 'function') (window as any).sendPrompt(msg);
              }}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 99,
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                background: 'transparent', color: 'var(--text-dimmer, #8899BB)',
                cursor: 'pointer', fontFamily: 'var(--font-main, sans-serif)',
              }}>Full summary ↗</button>
            <button
              onClick={() => {
                const msg = `Based on the dashboard data (166 cameras offline, 125 critical events, 12 pending user approvals), what are the top 3 immediate actions I should take?`;
                if (typeof (window as any).sendPrompt === 'function') (window as any).sendPrompt(msg);
              }}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 99,
                border: `1px solid rgba(6,182,212,0.35)`,
                background: 'rgba(6,182,212,0.12)', color: C_CYAN,
                cursor: 'pointer', fontFamily: 'var(--font-main, sans-serif)',
              }}>Top 3 actions ↗</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightTab;