import React from 'react';

const LOGOS = [
  // ── IMAGE LOGOS ────────────────────────────────────────────────
  {
    id: 'espn', type: 'image' as const,
    contexts: [
      { sport: 'NHL', detail: 'national ESPN broadcast' },
      { sport: 'NBA', detail: 'ABC, ESPN, ESPN+ broadcasts' },
      { sport: 'NCAAB', detail: 'ESPN / ESPN+ broadcasts' },
      { sport: 'NCAA Hockey', detail: 'all games' },
      { sport: 'Soccer', detail: 'Bundesliga, La Liga, FA Cup, USL-ESPN+' },
      { sport: 'Rugby', detail: 'MLR' },
      { sport: 'Cricket', detail: 'Disney+ events' },
      { sport: 'NWSL', detail: 'ESPN+ / ESPN2 broadcasts' },
    ],
    footer: '40 × 10 dp', center: '57 × 14 dp',
  },
  {
    id: 'cbssn', type: 'image' as const,
    contexts: [
      { sport: 'Soccer', detail: 'Serie A, USL-Golazo' },
      { sport: 'NWSL', detail: 'Golazo / CBSSN broadcasts' },
    ],
    footer: '48 × 10 dp', center: '67 × 14 dp',
  },
  {
    id: 'cbs', type: 'image' as const,
    contexts: [
      { sport: 'Soccer', detail: 'Champions League, Europa League' },
      { sport: 'Golf', detail: 'CBS broadcast rounds' },
    ],
    footer: '34 × 10 dp', center: '48 × 14 dp',
  },
  {
    id: 'nbcsn', type: 'image' as const,
    contexts: [
      { sport: 'Soccer', detail: 'EPL' },
      { sport: 'Rugby', detail: 'Six Nations' },
      { sport: 'Golf', detail: 'NBC broadcast rounds' },
      { sport: 'NBA', detail: 'NBC / Peacock broadcasts' },
    ],
    footer: '36 × 10 dp', center: '51 × 14 dp',
  },
  {
    id: 'beinsports', type: 'image' as const,
    contexts: [
      { sport: 'Soccer', detail: 'Ligue 1' },
    ],
    footer: '59 × 10 dp', center: '82 × 14 dp',
  },
  {
    id: 'flosports', type: 'image' as const,
    contexts: [
      { sport: 'Rugby', detail: 'URC, Top 14, Premiership, Champs Cup, Japan L1' },
      { sport: 'Hockey', detail: 'AHL, ECHL' },
    ],
    footer: '63 × 7 dp ⚠ width-capped', center: '90 × 10 dp ⚠ width-capped',
  },
  {
    id: 'rugbypasstv', type: 'image' as const,
    contexts: [
      { sport: 'Rugby', detail: 'HSBC SVNS, Super Rugby Pacific' },
    ],
    footer: '10 × 10 dp (square)', center: '14 × 14 dp (square)',
  },
  {
    id: 'tennischannel', type: 'image' as const,
    contexts: [
      { sport: 'Tennis', detail: 'default fallback for all unmatched events' },
    ],
    footer: '36 × 10 dp', center: '50 × 14 dp',
  },
  {
    id: 'fanduelsn', type: 'image' as const,
    contexts: [
      { sport: 'NHL', detail: 'LA Kings RSN games' },
      { sport: 'NBA', detail: 'LA Clippers games (non-national)' },
    ],
    footer: '35 × 10 dp', center: '49 × 14 dp',
  },
  {
    id: 'victoryplus', type: 'image' as const,
    contexts: [
      { sport: 'NWSL', detail: 'Victory+ broadcasts' },
    ],
    footer: '63 × 8 dp ⚠ width-capped', center: '90 × 11 dp ⚠ width-capped',
  },
  {
    id: 'appletv', type: 'image' as const,
    contexts: [
      { sport: 'Soccer', detail: 'MLS (exclusive rights)' },
    ],
    footer: '20 × 10 dp', center: '28 × 14 dp',
  },
  {
    id: 'primevideo', type: 'image' as const,
    contexts: [
      { sport: 'NBA', detail: 'Prime Video broadcast games' },
    ],
    footer: '32 × 10 dp', center: '44 × 14 dp',
  },
  // ── TEXT PILL LOGOS ────────────────────────────────────────────
  {
    id: 'tnt', type: 'text' as const, label: '"TNT"',
    contexts: [
      { sport: 'NBA', detail: 'TNT / TBS broadcasts' },
      { sport: 'NHL', detail: 'TNT national broadcasts' },
      { sport: 'Tennis', detail: 'TNT broadcast events' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'abc', type: 'text' as const, label: '"ABC"',
    contexts: [
      { sport: 'NHL', detail: 'ABC national broadcasts' },
      { sport: 'NWSL', detail: 'ABC broadcasts' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'nbaleaguepass', type: 'text' as const, label: '"NBA LP"',
    contexts: [
      { sport: 'NBA', detail: 'all non-national, non-Clippers games' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'ion', type: 'text' as const, label: '"ION"',
    contexts: [
      { sport: 'NWSL', detail: 'ION broadcasts' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'nwslplus', type: 'text' as const, label: '"NWSL+"',
    contexts: [
      { sport: 'NWSL', detail: 'NWSL+ streaming games' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'willowtv', type: 'text' as const, label: '"Willow TV"',
    contexts: [
      { sport: 'Cricket', detail: 'non-Disney+ events' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
  {
    id: 'nbatv', type: 'text' as const, label: '"NBA TV"',
    contexts: [
      { sport: '—', detail: 'Reserved · no active resolver maps here yet' },
    ],
    footer: 'pill h=14 · 7sp', center: 'pill h=20 · 10sp',
  },
];

export default function LogoReference() {
  const imgLogos = LOGOS.filter(l => l.type === 'image');
  const textLogos = LOGOS.filter(l => l.type === 'text');

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#111', color: '#e2e8f0', fontSize: 13, padding: 20, minHeight: '100vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Provider Logo Reference</h1>
        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>All logos displayed in Pulse event cards · Dimensions in dp</p>
      </div>

      <Table rows={imgLogos} sectionLabel="Image logos" />
      <Table rows={textLogos} sectionLabel="Text pill logos" />

      <div style={{ marginTop: 20, padding: 12, background: '#0f172a', borderRadius: 6, fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
        <strong style={{ color: '#94a3b8' }}>Card variants:</strong><br />
        <strong style={{ color: '#94a3b8' }}>Live / upcoming footer (size 14)</strong> — bottom-left (live) or bottom-right (upcoming/final). logoH = <code style={{ color: '#fbbf24' }}>10 dp</code>, MAX_W = <code style={{ color: '#fbbf24' }}>63 dp</code>.<br />
        <strong style={{ color: '#94a3b8' }}>ESPN-centre upcoming (size 20)</strong> — centre column of ESPN-style layout. logoH = <code style={{ color: '#fbbf24' }}>14 dp</code>, MAX_W = <code style={{ color: '#fbbf24' }}>90 dp</code>.<br />
        <span style={{ color: '#f59e0b' }}>⚠ width-capped</span> — logo's natural aspect ratio exceeds MAX_W, so height is reduced to maintain aspect.
      </div>
    </div>
  );
}

type Row = typeof LOGOS[0];

function Table({ rows, sectionLabel }: { rows: Row[]; sectionLabel: string }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 4 }}>
      <thead>
        <tr>
          <th colSpan={4} style={{ background: '#0f172a', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '5px 10px', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
            {sectionLabel}
          </th>
        </tr>
        <tr>
          <Th width={120}>Logo ID</Th>
          <Th width={66}>Type</Th>
          <Th>Shown on (sport · context)</Th>
          <Th width={200}>Dimensions by card slot</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
              <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 11, color: '#7dd3fc', fontWeight: 600 }}>{row.id}</span>
              {'label' in row && row.label && (
                <span style={{ display: 'block', fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 10, color: '#a78bfa', marginTop: 2 }}>{row.label}</span>
              )}
            </td>
            <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
              <Tag type={row.type} />
            </td>
            <td style={{ padding: '7px 10px', verticalAlign: 'top', lineHeight: 1.6 }}>
              {row.contexts.map((c, i) => (
                <div key={i}>
                  <SportChip label={c.sport} />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}> {c.detail}</span>
                </div>
              ))}
            </td>
            <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
              <DimRow label="Live / upcoming footer:" value={row.footer} isText={row.type === 'text'} />
              <DimRow label="ESPN-centre upcoming:" value={row.center} isText={row.type === 'text'} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th style={{ background: '#1e293b', color: '#94a3b8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, padding: '7px 10px', textAlign: 'left', borderBottom: '1px solid #334155', width }}>
      {children}
    </th>
  );
}

function Tag({ type }: { type: 'image' | 'text' }) {
  return (
    <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: type === 'image' ? '#14532d' : '#312e81', color: type === 'image' ? '#86efac' : '#a5b4fc' }}>
      {type}
    </span>
  );
}

function SportChip({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: 3, fontSize: 10, background: '#1e293b', color: '#94a3b8', marginRight: 4 }}>
      {label}
    </span>
  );
}

function DimRow({ label, value, isText }: { label: string; value: string; isText: boolean }) {
  const capped = value.includes('⚠');
  const cleanValue = value.replace(' ⚠ width-capped', '');
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ display: 'block', fontSize: 10, color: '#475569' }}>{label}</span>
      <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 11, color: isText ? '#a78bfa' : '#fbbf24' }}>
        {cleanValue}
      </span>
      {capped && <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 4 }}>⚠ width-capped</span>}
    </div>
  );
}
