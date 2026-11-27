import { useMemo, useState } from 'react';

const COLORS = {
  blue: '#1a3bb0',
  bright: '#2e5de6',
  teal: '#14b8a6',
  violet: '#7c5cff',
  amber: '#f59e0b',
  red: '#ef4444',
  gray: '#afc5f8',
};

const STATUS_GROUPS = [
  { label: 'Pending review', color: COLORS.amber, match: ['submitted', 'under_review'] },
  { label: 'Approved', color: COLORS.bright, match: ['approved', 'transferred'] },
  { label: 'In progress', color: COLORS.violet, match: ['assigned', 'in_progress'] },
  { label: 'Resolved', color: COLORS.teal, match: ['resolved', 'verified', 'closed'] },
  { label: 'Reopened', color: COLORS.red, match: ['reopened'] },
];

const RESOLVED = ['resolved', 'verified', 'closed'];

function statusOf(item) {
  return String(item?.status || '').toLowerCase().trim();
}

const RANGES = [
  { key: '7d', label: '7 days', unit: 'day', count: 7 },
  { key: '30d', label: '30 days', unit: 'day', count: 30 },
  { key: '6m', label: '6 months', unit: 'month', count: 6 },
];

function bucketKey(date, unit) {
  return unit === 'day'
    ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    : `${date.getFullYear()}-${date.getMonth()}`;
}

function buildBuckets({ unit, count }) {
  const now = new Date();
  const buckets = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const d =
      unit === 'day'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        : new Date(now.getFullYear(), now.getMonth() - i, 1);

    buckets.push({
      key: bucketKey(d, unit),
      label: d.toLocaleDateString(
        'en-IN',
        unit === 'day' ? { day: 'numeric', month: 'short' } : { month: 'short' }
      ),
      full: d.toLocaleDateString(
        'en-IN',
        unit === 'day'
          ? { day: 'numeric', month: 'short', year: 'numeric' }
          : { month: 'long', year: 'numeric' }
      ),
    });
  }

  return buckets;
}

function niceMax(value) {
  return value <= 4 ? 4 : Math.ceil(value / 4) * 4;
}

function TimeSeriesChart({ buckets, received, resolved }) {
  const [hover, setHover] = useState(null);

  const W = 520;
  const H = 230;
  const L = 34;
  const R = 14;
  const T = 14;
  const B = 30;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = buckets.length;
  const max = niceMax(Math.max(...received, ...resolved, 1));
  const step = n > 1 ? innerW / (n - 1) : 0;
  const labelEvery = Math.ceil(n / 7);
  const showDots = n <= 12;

  const x = (i) => L + i * step;
  const y = (v) => T + innerH - (v / max) * innerH;
  const toPoints = (values) => values.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const area =
    `M ${x(0)},${y(received[0])} ` +
    received.map((v, i) => `L ${x(i)},${y(v)}`).join(' ') +
    ` L ${x(n - 1)},${T + innerH} L ${x(0)},${T + innerH} Z`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round((px - L) / (step || 1));
    setHover(Math.min(n - 1, Math.max(0, index)));
  };

  const boxW = 118;
  const boxX = hover === null ? 0 : Math.min(Math.max(x(hover) - boxW / 2, L), W - R - boxW);

  return (
    <svg
      className="dd-chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Time-series line chart of complaints received and resolved"
      onPointerMove={handleMove}
      onPointerDown={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={y(value)} y2={y(value)} stroke="#e3eafc" strokeWidth="1" />
            <text x={L - 8} y={y(value) + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      <path d={area} fill={COLORS.bright} fillOpacity="0.1" />

      <polyline points={toPoints(received)} fill="none" stroke={COLORS.bright} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={toPoints(resolved)} fill="none" stroke={COLORS.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {showDots &&
        received.map((v, i) => (
          <circle key={`r${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={COLORS.bright} strokeWidth="2" />
        ))}
      {showDots &&
        resolved.map((v, i) => (
          <circle key={`s${i}`} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={COLORS.teal} strokeWidth="2" />
        ))}

      {buckets.map((bucket, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={bucket.key} x={x(i)} y={H - 9} textAnchor="middle">{bucket.label}</text>
        ) : null
      )}

      {hover !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + innerH} stroke={COLORS.gray} strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx={x(hover)} cy={y(received[hover])} r="5" fill="#fff" stroke={COLORS.bright} strokeWidth="2.5" />
          <circle cx={x(hover)} cy={y(resolved[hover])} r="5" fill="#fff" stroke={COLORS.teal} strokeWidth="2.5" />

          <rect x={boxX} y={T} width={boxW} height="56" rx="8" fill="#0f2270" />
          <text className="dd-tooltip-text dd-tooltip-title" x={boxX + 10} y={T + 17}>{buckets[hover].full}</text>
          <circle cx={boxX + 14} cy={T + 31} r="3.5" fill={COLORS.bright} />
          <text className="dd-tooltip-text" x={boxX + 24} y={T + 34}>Received: {received[hover]}</text>
          <circle cx={boxX + 14} cy={T + 46} r="3.5" fill={COLORS.teal} />
          <text className="dd-tooltip-text" x={boxX + 24} y={T + 49}>Resolved: {resolved[hover]}</text>
        </g>
      )}
    </svg>
  );
}

function BarChart({ data }) {
  const W = 520;
  const H = 220;
  const L = 34;
  const R = 14;
  const T = 22;
  const B = 32;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const slot = innerW / data.length;
  const barW = Math.min(38, slot * 0.55);
  const top = Math.max(...data.map((d) => d.value));

  return (
    <svg
      className="dd-chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Bar chart of complaints by category"
    >
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        const yy = T + innerH - (value / max) * innerH;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#e3eafc" strokeWidth="1" />
            <text x={L - 8} y={yy + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const bx = L + slot * i + (slot - barW) / 2;
        const label = d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label;

        return (
          <g key={d.label}>
            <rect
              x={bx}
              y={T + innerH - h}
              width={barW}
              height={h}
              rx="4"
              fill={d.value === top ? COLORS.teal : COLORS.bright}
            />
            <text className="dd-bar-value" x={bx + barW / 2} y={T + innerH - h - 6} textAnchor="middle">
              {d.value}
            </text>
            <text x={bx + barW / 2} y={H - 10} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments, total }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg
      className="dd-chart-svg"
      viewBox="0 0 150 150"
      role="img"
      aria-label="Donut chart of complaints by status"
    >
      <circle cx="75" cy="75" r={r} fill="none" stroke="#e6edfd" strokeWidth="18" />

      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = (s.value / total) * circ;
            const circle = (
              <circle
                key={s.label}
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circ - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 75 75)"
              />
            );
            offset += length;
            return circle;
          })}

      <text className="dd-center-value" x="75" y="78" textAnchor="middle">{total}</text>
      <text className="dd-center-label" x="75" y="94" textAnchor="middle">Complaints</text>
    </svg>
  );
}

function GaugeChart({ percent }) {
  const length = Math.PI * 80;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * length;
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';

  return (
    <svg
      className="dd-chart-svg"
      viewBox="0 0 200 120"
      role="img"
      aria-label={`Resolution rate ${percent} percent`}
    >
      <path d={arc} fill="none" stroke="#e6edfd" strokeWidth="18" strokeLinecap="round" />
      <path
        d={arc}
        fill="none"
        stroke={COLORS.teal}
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${length}`}
      />
      <text className="dd-center-value" x="100" y="88" textAnchor="middle">{percent}%</text>
      <text className="dd-center-label" x="100" y="108" textAnchor="middle">Resolution rate</text>
    </svg>
  );
}

export default function DashboardCharts({ complaints = [], loading = false }) {
  const [range, setRange] = useState('6m');

  const series = useMemo(() => {
    const config = RANGES.find((r) => r.key === range) || RANGES[2];
    const buckets = buildBuckets(config);
    const receivedMap = {};
    const resolvedMap = {};

    complaints.forEach((item) => {
      const date = new Date(item.created_at || item.created || 0);
      if (Number.isNaN(date.getTime())) return;

      const key = bucketKey(date, config.unit);
      receivedMap[key] = (receivedMap[key] || 0) + 1;

      if (RESOLVED.includes(statusOf(item))) {
        resolvedMap[key] = (resolvedMap[key] || 0) + 1;
      }
    });

    const received = buckets.map((b) => receivedMap[b.key] || 0);
    const resolved = buckets.map((b) => resolvedMap[b.key] || 0);
    const sum = (list) => list.reduce((a, b) => a + b, 0);

    return {
      buckets,
      received,
      resolved,
      totalReceived: sum(received),
      totalResolved: sum(resolved),
    };
  }, [complaints, range]);

  const analysis = useMemo(() => {
    const total = complaints.length;

    const categoryMap = {};
    complaints.forEach((item) => {
      const name = item.category || 'General';
      categoryMap[name] = (categoryMap[name] || 0) + 1;
    });

    const categories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const segments = STATUS_GROUPS.map((group) => ({
      label: group.label,
      color: group.color,
      value: complaints.filter((item) => group.match.includes(statusOf(item))).length,
    }));

    const counted = segments.reduce((sum, s) => sum + s.value, 0);
    if (total - counted > 0) {
      segments.push({ label: 'Other', color: COLORS.gray, value: total - counted });
    }

    const resolvedCount = segments.find((s) => s.label === 'Resolved')?.value || 0;
    const reopenedCount = segments.find((s) => s.label === 'Reopened')?.value || 0;

    return {
      total,
      categories,
      segments,
      resolvedCount,
      outstanding: total - resolvedCount,
      resolutionRate: total ? Math.round((resolvedCount / total) * 100) : 0,
      reopenRate: total ? Math.round((reopenedCount / total) * 100) : 0,
    };
  }, [complaints]);

  if (loading) {
    return (
      <section className="dd-analysis">
        <div className="dd-chart-card">
          <div className="dd-chart-empty">Loading analysis...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="dd-analysis">
      <div className="dd-analysis-title">
        <h3>Dashboard Analytics</h3>
        <p>Time-series trends, categories and status of your department complaints.</p>
      </div>

      <div className="dd-analysis-kpis">
        <div className="dd-analysis-kpi">
          <strong>{analysis.total}</strong>
          <span>Total complaints</span>
        </div>
        <div className="dd-analysis-kpi">
          <strong>{analysis.outstanding}</strong>
          <span>Outstanding</span>
        </div>
        <div className="dd-analysis-kpi">
          <strong>{analysis.resolutionRate}%</strong>
          <span>Resolution rate</span>
        </div>
        <div className="dd-analysis-kpi">
          <strong>{analysis.reopenRate}%</strong>
          <span>Reopen rate</span>
        </div>
      </div>

      <div className="dd-chart-grid">
        <div className="dd-chart-card dd-chart-wide">
          <div className="dd-chart-head">
            <div>
              <h4>Complaints over time</h4>
              <p>Received and resolved complaints. Hover or tap the chart for details.</p>
            </div>

            <div className="dd-range-toggle" role="group" aria-label="Select time range">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={range === r.key}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dd-chart-legend">
            <span>
              <i className="dd-legend-dot" style={{ background: COLORS.bright }} />
              Received<strong>{series.totalReceived}</strong>
            </span>
            <span>
              <i className="dd-legend-dot" style={{ background: COLORS.teal }} />
              Resolved<strong>{series.totalResolved}</strong>
            </span>
          </div>

          <TimeSeriesChart
            buckets={series.buckets}
            received={series.received}
            resolved={series.resolved}
          />
        </div>

        <div className="dd-chart-card">
          <h4>Status breakdown</h4>
          <p>Share of complaints by status.</p>

          <div className="dd-donut-wrap">
            <DonutChart segments={analysis.segments} total={analysis.total} />

            <div className="dd-donut-legend">
              {analysis.segments.map((s) => (
                <div className="dd-donut-row" key={s.label}>
                  <i className="dd-legend-dot" style={{ background: s.color }} />
                  {s.label}
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dd-chart-card dd-chart-wide">
          <h4>Complaints by category</h4>
          <p>Top categories reported to your department.</p>

          {analysis.categories.length === 0 ? (
            <div className="dd-chart-empty">No category data yet.</div>
          ) : (
            <BarChart data={analysis.categories} />
          )}
        </div>

        <div className="dd-chart-card">
          <h4>Resolution rate</h4>
          <p>Resolved compared with all complaints.</p>

          <GaugeChart percent={analysis.resolutionRate} />

          <div className="dd-gauge-stats">
            <div>
              <strong>{analysis.resolvedCount}</strong>
              <span>Resolved</span>
            </div>
            <div>
              <strong>{analysis.outstanding}</strong>
              <span>Outstanding</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}