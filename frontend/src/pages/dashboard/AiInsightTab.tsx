import { useState, useEffect } from 'react';
import { useNsTranslation } from '@/hooks/Usetranslation';

// ── Palette ───────────────────────────────────────────────────────────────────
const C_CYAN      = '#06B6D4';
const C_EMERALD   = '#34D399';
const C_PINK      = '#F472B6';
const C_LAVENDER  = '#A78BFA';
const C_INDIGO    = '#818CF8';
const C_AMBER     = '#F59E0B';

// ── Types ─────────────────────────────────────────────────────────────────────
type SeverityKey = 'critical' | 'watch' | 'action' | 'ok';
type SignalType  = 'up' | 'warn' | 'info' | 'down';
type DomainKey   = 'events' | 'cameras' | 'users';
type FeedFilter  = 'all' | 'critical' | 'watch' | 'ok';
type ViewMode    = 'command' | 'timeline' | 'health';

interface KPI        { label: string; value: string; sub: string; accent: string; icon: string }
interface Signal     { label: string; type: SignalType }
interface BarSegment { pct: number; color: string; label: string }
interface Action     { label: string; icon: string; accent: string }
interface DomainData {
  severity: SeverityKey; severityLabel: string; headline: string;
  kpis: KPI[]; signals: Signal[]; barLabel: string;
  barSegments: BarSegment[]; actions: Action[];
}
type InsightDataMap = Record<DomainKey, DomainData>;

// ── SEV styles ────────────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)',  text: C_PINK     },
  watch:    { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',   text: C_AMBER    },
  action:   { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)',  text: C_LAVENDER },
  ok:       { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',   text: C_EMERALD  },
  up:       { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)', text: C_EMERALD  },
  warn:     { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', text: C_AMBER    },
  info:     { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)',  text: C_CYAN     },
  down:     { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)', text: C_PINK    },
};

// ── Build insight data FROM translation keys ──────────────────────────────────
// This is the core fix: every string comes from t() so it reacts to language changes
function buildInsightData(t: (k: string) => string): InsightDataMap {
  return {
    events: {
      severity: 'watch',
      severityLabel: t('ai_insight_tab.severity.watch'),
      headline: t('ai_insight_tab.events_domain.headline'),
      kpis: [
        { label: t('ai_insight_tab.events_domain.kpi_total'),    value: '3,847', sub: t('ai_insight_tab.domains.events') + ' · 30d', accent: C_CYAN,    icon: '📋' },
        { label: t('ai_insight_tab.events_domain.kpi_resolved'), value: '3,102', sub: '81%',                                        accent: C_EMERALD, icon: '✅' },
        { label: t('ai_insight_tab.events_domain.kpi_pending'),  value: '620',   sub: t('ai_insight_tab.filter_watch'),             accent: C_AMBER,   icon: '⏳' },
        { label: t('ai_insight_tab.events_domain.kpi_critical'), value: '125',   sub: t('ai_insight_tab.severity.critical'),        accent: C_PINK,    icon: '🚨' },
      ],
      signals: [
        { label: '+13.2% ' + t('ai_insight_tab.events_domain.kpi_total').toLowerCase(), type: 'up'   },
        { label: '8–10 AM · 5–7 PM',                                                    type: 'warn' },
        { label: 'CAM-07 top source',                                                    type: 'info' },
        { label: '125 ' + t('ai_insight_tab.severity.critical').toLowerCase(),          type: 'down' },
        { label: '18 min avg',                                                           type: 'info' },
      ],
      barLabel: t('ai_insight_tab.events_domain.bar_label'),
      barSegments: [
        { pct: 47, color: C_CYAN,     label: t('event_types.motion_detected') + ' 47%'  },
        { pct: 17, color: C_PINK,     label: t('event_types.intrusion_alert') + ' 17%'  },
        { pct: 13, color: C_INDIGO,   label: t('event_types.face_recognized') + ' 13%'  },
        { pct: 11, color: C_EMERALD,  label: t('event_types.vehicle_detected') + ' 11%' },
        { pct: 12, color: C_LAVENDER, label: '12%'                                       },
      ],
      actions: [
        { label: t('ai_insight_tab.events_domain.kpi_critical'), icon: '⚡', accent: C_PINK  },
        { label: 'CAM-07',                                        icon: '📹', accent: C_CYAN  },
        { label: t('ai_insight_tab.events_domain.kpi_pending'),  icon: '📅', accent: C_AMBER },
      ],
    },
    cameras: {
      severity: 'critical',
      severityLabel: t('ai_insight_tab.severity.critical'),
      headline: t('ai_insight_tab.cameras_domain.headline'),
      kpis: [
        { label: t('ai_insight_tab.cameras_domain.kpi_total'),       value: '194', sub: '14 zones',   accent: C_CYAN,     icon: '📹' },
        { label: t('ai_insight_tab.cameras_domain.kpi_online'),      value: '5',   sub: '2.6%',       accent: C_EMERALD,  icon: '🟢' },
        { label: t('ai_insight_tab.cameras_domain.kpi_offline'),     value: '166', sub: t('ai_insight_tab.severity.critical'), accent: C_PINK,     icon: '🔴' },
        { label: t('ai_insight_tab.cameras_domain.kpi_maintenance'), value: '23',  sub: 'scheduled',  accent: C_LAVENDER, icon: '🔧' },
      ],
      signals: [
        { label: 'Perimeter East: 21 ' + t('ai_insight_tab.cameras_domain.kpi_offline').toLowerCase(), type: 'down' },
        { label: 'Perimeter West: 19 ' + t('ai_insight_tab.cameras_domain.kpi_offline').toLowerCase(), type: 'down' },
        { label: 'Loading Bay A: 18 '  + t('ai_insight_tab.cameras_domain.kpi_offline').toLowerCase(), type: 'warn' },
        { label: '99.85% ' + t('ai_insight_tab.health.avg_uptime'),                                    type: 'up'   },
      ],
      barLabel: t('ai_insight_tab.cameras_domain.bar_label'),
      barSegments: [
        { pct: 3,  color: C_EMERALD,  label: t('ai_insight_tab.cameras_domain.kpi_online')      + ' 3%'  },
        { pct: 12, color: C_LAVENDER, label: t('ai_insight_tab.cameras_domain.kpi_maintenance') + ' 12%' },
        { pct: 85, color: C_PINK,     label: t('ai_insight_tab.cameras_domain.kpi_offline')     + ' 85%' },
      ],
      actions: [
        { label: 'Perimeter East',                                      icon: '🚨', accent: C_PINK     },
        { label: t('ai_insight_tab.cameras_domain.kpi_maintenance'),    icon: '🔧', accent: C_LAVENDER },
        { label: t('ai_insight_tab.cameras_domain.kpi_offline') + ' map', icon: '🗺️', accent: C_CYAN  },
      ],
    },
    users: {
      severity: 'action',
      severityLabel: t('ai_insight_tab.severity.action'),
      headline: t('ai_insight_tab.users_domain.headline'),
      kpis: [
        { label: t('ai_insight_tab.users_domain.kpi_total'),     value: '128', sub: '+12 ' + t('ai_insight_tab.domains.users').toLowerCase(), accent: C_CYAN,     icon: '👥' },
        { label: t('ai_insight_tab.users_domain.kpi_active'),    value: '96',  sub: '75%',                                                    accent: C_EMERALD,  icon: '✅' },
        { label: t('ai_insight_tab.users_domain.kpi_pending'),   value: '12',  sub: '3 today',                                                accent: C_LAVENDER, icon: '⏳' },
        { label: t('ai_insight_tab.users_domain.kpi_suspended'), value: '4',   sub: t('ai_insight_tab.filter_ok'),                            accent: C_PINK,     icon: '🚫' },
      ],
      signals: [
        { label: '3 ' + t('ai_insight_tab.users_domain.kpi_pending').toLowerCase() + ' today', type: 'warn' },
        { label: 'Peak May 17: 71',                                                             type: 'up'   },
        { label: 'Operators: 52 (' + t('ai_insight_tab.domains.users') + ')',                  type: 'info' },
        { label: '4 ' + t('ai_insight_tab.users_domain.kpi_suspended').toLowerCase(),          type: 'down' },
      ],
      barLabel: t('ai_insight_tab.users_domain.bar_label'),
      barSegments: [
        { pct: 41, color: C_CYAN,     label: 'Operator 41%' },
        { pct: 30, color: C_EMERALD,  label: 'Viewer 30%'   },
        { pct: 19, color: C_INDIGO,   label: 'Auditor 19%'  },
        { pct: 10, color: C_LAVENDER, label: 'Admin 10%'    },
      ],
      actions: [
        { label: t('ai_insight_tab.users_domain.kpi_pending'),   icon: '✅', accent: C_LAVENDER },
        { label: t('ai_insight_tab.users_domain.kpi_suspended'), icon: '🔍', accent: C_PINK     },
        { label: t('ai_insight_tab.domains.users'),              icon: '📊', accent: C_CYAN     },
      ],
    },
  };
}

// ── Build timeline FROM translation keys ──────────────────────────────────────
function buildTimeline(t: (k: string) => string) {
  return [
    {
      time: 'Today · 05:28 AM', sev: 'critical' as const, domain: t('ai_insight_tab.domains.cameras'),
      text: '166 ' + t('ai_insight_tab.cameras_domain.kpi_offline').toLowerCase() + ' — only 5/194 active. Perimeter East: 21 down.',
    },
    {
      time: 'Today · 05:28 AM', sev: 'critical' as const, domain: t('ai_insight_tab.domains.events'),
      text: t('event_types.intrusion_alert') + ' at Warehouse Entry via CAM-15. ' + t('ai_insight_tab.severity.critical') + '.',
    },
    {
      time: 'Today · 05:22 AM', sev: 'watch' as const, domain: t('ai_insight_tab.domains.users'),
      text: '12 ' + t('ai_insight_tab.users_domain.kpi_pending').toLowerCase() + ' — 3 added today.',
    },
    {
      time: 'Today · 05:11 AM', sev: 'watch' as const, domain: t('ai_insight_tab.domains.events'),
      text: t('ai_insight_tab.events_domain.kpi_total') + ' +13.2% vs yesterday. CAM-07 top source.',
    },
    {
      time: 'Today · 04:55 AM', sev: 'ok' as const, domain: t('ai_insight_tab.domains.users'),
      text: '96 ' + t('ai_insight_tab.users_domain.kpi_active').toLowerCase() + '. Peak May 17: 71 sessions. 75% engagement.',
    },
    {
      time: 'Today · 04:41 AM', sev: 'ok' as const, domain: t('ai_insight_tab.domains.events'),
      text: '18 min avg resolve. 81% ' + t('ai_insight_tab.events_domain.kpi_resolved').toLowerCase() + '.',
    },
  ];
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimCount({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.max(target / 35, 1);
    const timer = setInterval(() => {
      n += step;
      if (n >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(n));
    }, 28);
    return () => clearInterval(timer);
  }, [target]);
  return <>{val.toLocaleString()}</>;
}

// ── SVG Ring ──────────────────────────────────────────────────────────────────
function Ring({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 32, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={cx} y={cy - 4} fill={color} textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="700" fontFamily="inherit">{score}</text>
      <text x={cx} y={cy + 13} fill="var(--text-muted,#6B7FA3)" textAnchor="middle"
        fontSize="9" fontFamily="inherit">{label}</text>
    </svg>
  );
}

// ── Strip cell ────────────────────────────────────────────────────────────────
function StripCell({ domain, data, active, onClick }: {
  domain: DomainKey; data: DomainData; active: boolean; onClick: () => void;
}) {
  const sev    = SEV[data.severity];
  const icons: Record<DomainKey, string> = { events: '🔔', cameras: '📹', users: '👥' };
  const accent = data.kpis[0].accent;
  const barPct = domain === 'cameras' ? 3 : domain === 'users' ? 75 : 81;
  return (
    <div onClick={onClick} style={{
      flex: 1, padding: '16px 18px', cursor: 'pointer',
      background: active ? 'rgba(15,23,42,0.03)' : 'transparent',
      borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
      borderRight: domain !== 'users' ? '1px solid var(--border-default,rgba(15,23,42,0.07))' : 'none',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: `${accent}18`, border: `1px solid ${accent}30` }}>
          {icons[domain]}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
          {data.severityLabel}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: 'inherit', letterSpacing: '-1px', lineHeight: 1 }}>
        {data.kpis[0].value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)', margin: '3px 0 10px' }}>{data.kpis[0].sub}</div>
      <div style={{ height: 3, background: 'rgba(15,23,42,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 7 }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: accent, borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: data.signals[0].type === 'up' ? C_EMERALD : C_AMBER }}>
          {data.signals[0].type === 'up' ? '↑' : '⚠'}
        </span>
        {data.signals[0].label}
      </div>
    </div>
  );
}

// ── Detail pane ───────────────────────────────────────────────────────────────
function DetailPane({ domain, data, t }: { domain: DomainKey; data: InsightDataMap; t: (k: string) => string }) {
  const d = data[domain];
  const signalIcon: Record<SignalType, string> = { up: '↑', warn: '⚠', info: '●', down: '↓' };
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default,rgba(15,23,42,0.07))', background: '#f8fafc' }}>
      <p style={{ fontSize: 13, color: 'var(--text-dimmer,#8899BB)', lineHeight: 1.7, marginBottom: 14 }}>{d.headline}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {d.kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card-inner,#111827)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${k.accent}22` }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted,#6B7FA3)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'inherit', color: k.accent, letterSpacing: '-0.5px' }}>
              <AnimCount target={parseInt(k.value.replace(/,/g, ''), 10)} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted,#6B7FA3)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {d.signals.map((s, i) => {
          const sc = SEV[s.type] ?? SEV.info;
          return (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10 }}>{signalIcon[s.type]}</span>{s.label}
            </span>
          );
        })}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)', marginBottom: 6 }}>{d.barLabel}</div>
        <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
          {d.barSegments.map((s, i) => (
            <div key={i} style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: i === 0 ? '99px 0 0 99px' : i === d.barSegments.length - 1 ? '0 99px 99px 0' : 0 }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 7 }}>
          {d.barSegments.map((s, i) => (
            <span key={i} style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-default,rgba(15,23,42,0.07))', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted,#6B7FA3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {t('ai_insight_tab.recommended_actions')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {d.actions.map((a, i) => (
            <button key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${a.accent}15`, color: a.accent, border: `1px solid ${a.accent}35`, cursor: 'pointer', transition: 'all 0.15s ease' }}
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
function TimelineView({ t }: { t: (k: string) => string }) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const items = buildTimeline(t);
  const dotColor: Record<string, string> = { critical: C_PINK, watch: C_AMBER, ok: C_EMERALD };

  // Build domain→color map using translated domain names
  const domainColor: Record<string, string> = {
    [t('ai_insight_tab.domains.events')]:  C_CYAN,
    [t('ai_insight_tab.domains.cameras')]: C_PINK,
    [t('ai_insight_tab.domains.users')]:   C_LAVENDER,
  };

  const filterKeys: { key: FeedFilter; tKey: string }[] = [
    { key: 'all',      tKey: 'ai_insight_tab.filter_all'      },
    { key: 'critical', tKey: 'ai_insight_tab.filter_critical' },
    { key: 'watch',    tKey: 'ai_insight_tab.filter_watch'    },
    { key: 'ok',       tKey: 'ai_insight_tab.filter_ok'       },
  ];

  const filtered = filter === 'all' ? items : items.filter(i => i.sev === filter);

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading,#fff)' }}>
          {t('ai_insight_tab.activity_feed_title')}
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {filterKeys.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99, border: '1px solid', borderColor: filter === f.key ? 'rgba(15,23,42,0.18)' : 'var(--border-default,rgba(15,23,42,0.07))', background: filter === f.key ? 'rgba(15,23,42,0.07)' : 'transparent', color: filter === f.key ? 'var(--text-heading,#fff)' : 'var(--text-muted,#6B7FA3)', cursor: 'pointer' }}>
              {t(f.tKey)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 1, background: 'var(--border-default,rgba(15,23,42,0.07))' }} />
        {filtered.map((item, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 16 }}>
            <div style={{ position: 'absolute', left: -15, top: 4, width: 10, height: 10, borderRadius: '50%', background: dotColor[item.sev], border: '2px solid var(--bg-card,#0D1320)', boxShadow: item.sev === 'critical' ? `0 0 8px ${dotColor[item.sev]}` : 'none' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted,#6B7FA3)', fontFamily: 'inherit', marginBottom: 3 }}>{item.time}</div>
            <div style={{ fontSize: 12, color: 'var(--text-primary,#F0F4FF)', lineHeight: 1.55, marginBottom: 6 }}>{item.text}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: SEV[item.sev].bg, color: SEV[item.sev].text, border: `1px solid ${SEV[item.sev].border}` }}>
                {t(`ai_insight_tab.severity.${item.sev}`)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${domainColor[item.domain] ?? C_CYAN}12`, color: domainColor[item.domain] ?? C_CYAN, border: `1px solid ${domainColor[item.domain] ?? C_CYAN}30` }}>
                {item.domain}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Health view ───────────────────────────────────────────────────────────────
function HealthView({ t }: { t: (k: string) => string }) {
  const scores = [
    {
      title: t('ai_insight_tab.health.events_title'), score: 81, color: C_CYAN, icon: '🔔',
      rows: [
        { label: t('ai_insight_tab.health.resolution_rate'), val: '81%',    pct: 81, color: C_EMERALD },
        { label: t('ai_insight_tab.health.critical_open'),   val: '125',    pct: 32, color: C_PINK    },
        { label: t('ai_insight_tab.health.avg_resolve'),     val: '18 min', pct: 72, color: C_CYAN    },
      ],
    },
    {
      title: t('ai_insight_tab.health.cameras_title'), score: 3, color: C_PINK, icon: '📹',
      rows: [
        { label: t('ai_insight_tab.health.online_rate'), val: '2.6%',      pct: 3,  color: C_EMERALD },
        { label: t('ai_insight_tab.health.offline'),     val: '166 units', pct: 85, color: C_PINK    },
        { label: t('ai_insight_tab.health.avg_uptime'),  val: '99.85%',    pct: 99, color: C_EMERALD },
      ],
    },
    {
      title: t('ai_insight_tab.health.users_title'), score: 75, color: C_LAVENDER, icon: '👥',
      rows: [
        { label: t('ai_insight_tab.health.active_rate'),   val: '75%', pct: 75, color: C_EMERALD  },
        { label: t('ai_insight_tab.health.pending_queue'), val: '12',  pct: 40, color: C_LAVENDER },
        { label: t('ai_insight_tab.health.suspended'),     val: '4',   pct: 12, color: C_PINK     },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {scores.map(s => (
          <div key={s.title} style={{ background: 'var(--bg-card-inner,#111827)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-default,rgba(15,23,42,0.07))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-heading,#fff)' }}>{s.title}</span>
              <span style={{ fontSize: 13, width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}18`, border: `1px solid ${s.color}30` }}>{s.icon}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Ring score={s.score} color={s.color} label={t('ai_insight_tab.health.score_label')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.rows.map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)' }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: r.color }}>{r.val}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(15,23,42,0.06)', borderRadius: 99, overflow: 'hidden' }}>
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
  const { t } = useNsTranslation('dashboard');

  // Re-build data on every render — t() already handles language reactivity
  const insightData = buildInsightData(t);

  const [view, setView]               = useState<ViewMode>('command');
  const [activeDomain, setActiveDomain] = useState<DomainKey>('events');
  const [refreshing, setRefreshing]   = useState(false);

  const viewBtns: { key: ViewMode; tKey: string; icon: string }[] = [
    { key: 'command',  tKey: 'ai_insight_tab.view_command',  icon: '⊞' },
    { key: 'timeline', tKey: 'ai_insight_tab.view_timeline', icon: '⟳' },
    { key: 'health',   tKey: 'ai_insight_tab.view_health',   icon: '◎' },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{ background: 'var(--bg-card,#0D1320)', border: '1px solid var(--border-default,rgba(15,23,42,0.07))', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card,0 4px 24px rgba(0,0,0,0.4))' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border-default,rgba(15,23,42,0.07))', background: 'var(--bg-surface,#141C2E)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C_EMERALD, display: 'inline-block', animation: 'db-pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading,#fff)' }}>{t('ai_insight_tab.title')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: C_EMERALD, border: '1px solid rgba(52,211,153,0.25)' }}>
              {t('ai_insight_tab.live_badge')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-card-inner,#111827)', border: '1px solid var(--border-default,rgba(15,23,42,0.07))', borderRadius: 10, padding: 3 }}>
              {viewBtns.map(b => (
                <button key={b.key} onClick={() => setView(b.key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === b.key ? 'var(--bg-surface-3,#1F2D47)' : 'transparent', color: view === b.key ? 'var(--text-heading,#fff)' : 'var(--text-muted,#6B7FA3)', transition: 'all 0.15s ease' }}>
                  <span style={{ fontSize: 11 }}>{b.icon}</span>{t(b.tKey)}
                </button>
              ))}
            </div>
            <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border-subtle,rgba(15,23,42,0.12))', background: 'transparent', color: 'var(--text-muted,#6B7FA3)', cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none', fontSize: 13 }}>↻</span>
            </button>
          </div>
        </div>

        {/* Command view */}
        {view === 'command' && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default,rgba(15,23,42,0.07))' }}>
              {(Object.keys(insightData) as DomainKey[]).map(domain => (
                <StripCell key={domain} domain={domain} data={insightData[domain]} active={activeDomain === domain} onClick={() => setActiveDomain(domain)} />
              ))}
            </div>
            <DetailPane domain={activeDomain} data={insightData} t={t} />
          </>
        )}

        {view === 'timeline' && <TimelineView t={t} />}
        {view === 'health'   && <HealthView   t={t} />}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border-default,rgba(15,23,42,0.07))', background: 'var(--bg-surface,#141C2E)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted,#6B7FA3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            🕐 {t('ai_insight_tab.updated')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 99, border: '1px solid var(--border-subtle,rgba(15,23,42,0.12))', background: 'transparent', color: 'var(--text-dimmer,#8899BB)', cursor: 'pointer' }}>
              {t('ai_insight_tab.full_summary_btn')} ↗
            </button>
            <button style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 99, border: `1px solid rgba(6,182,212,0.35)`, background: 'rgba(6,182,212,0.12)', color: C_CYAN, cursor: 'pointer' }}>
              {t('ai_insight_tab.top_actions_btn')} ↗
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AIInsightTab;