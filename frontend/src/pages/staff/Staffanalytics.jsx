import { useEffect, useMemo, useState } from 'react';

/*
  Staff Dashboard Analytics (display only).
  It only reads the complaints array you pass in. It makes no API calls
  and never changes any data. Styles live in StaffDashboard.css (sa- classes).
*/

const COLORS = {
  assigned: '#6e92f2',
  done: '#22d3ee',
  amber: '#f59e0b',
  violet: '#7c5cff',
  red: '#ef4444',
  gray: '#afc5f8',
};

const GROUPS = [
  { label: 'Assigned', color: COLORS.amber, match: ['assigned', 'submitted', 'pending'] },
  { label: 'In progress', color: COLORS.assigned, match: ['in_progress', 'progress', 'started'] },
  { label: 'Completed', color: COLORS.done, match: ['resolved', 'completed', 'verified', 'closed'] },
  { label: 'Reopened', color: COLORS.red, match: ['reopened'] },
];

const DONE = ['resolved', 'completed', 'verified', 'closed'];

const RANGES = [
  { key: '7d', label: '7 days', unit: 'day', count: 7 },
  { key: '30d', label: '30 days', unit: 'day', count: 30 },
  { key: '6m', label: '6 months', unit: 'month', count: 6 },
];

function statusOf(item) {
  return String(item?.status || '').toLowerCase().trim();
}

function dateFrom(item, fields) {
  for (const field of fields) {
    const value = item?.[field];
    if (value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

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

/* Counts up from 0 to the target value (skipped when reduced motion is on). */
function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setValue(target);
      return undefined;
    }

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Kpi({ value, suffix = '', label }) {
  const shown = useCountUp(value);

  return (
    <div className="sa-kpi">
      <strong>{shown}{suffix}</strong>
      <span>{label}</span>
    </div>
  );
}

function TimeSeriesChart({ buckets, assigned, completed }) {
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
  const max = niceMax(Math.max(...assigned, ...completed, 1));
  const step = n > 1 ? innerW / (n - 1) : 0;
  const labelEvery = Math.ceil(n / 7);
  const showDots = n <= 12;

  const x = (i) => L + i * step;
  const y = (v) => T + innerH - (v / max) * innerH;
  const toPoints = (values) => values.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const area =
    `M ${x(0)},${y(assigned[0])} ` +
    assigned.map((v, i) => `L ${x(i)},${y(v)}`).join(' ') +
    ` L ${x(n - 1)},${T + innerH} L ${x(0)},${T + innerH} Z`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round((px - L) / (step || 1));
    setHover(Math.min(n - 1, Math.max(0, index)));
  };

  const boxW = 122;
  const boxX = hover === null ? 0 : Math.min(Math.max(x(hover) - boxW / 2, L), W - R - boxW);

  return (
    <svg
      className="sa-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Time-series line chart of assigned and completed complaints"
      onPointerMove={handleMove}
      onPointerDown={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        return (
          <g key={k}>
            <line className="sa-grid-line" x1={L} x2={W - R} y1={y(value)} y2={y(value)} strokeWidth="1" />
            <text x={L - 8} y={y(value) + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      <path className="sa-area" d={area} fill={COLORS.assigned} fillOpacity="0.14" />

      <polyline
        className="sa-line"
        pathLength="1"
        points={toPoints(assigned)}
        fill="none"
        stroke={COLORS.assigned}
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        className="sa-line sa-line-2"
        pathLength="1"
        points={toPoints(completed)}
        fill="none"
        stroke={COLORS.done}
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {showDots &&
        assigned.map((v, i) => (
          <circle key={`a${i}`} className="sa-point" style={{ '--i': i }} cx={x(i)} cy={y(v)} r="3.5" fill="#0f2270" stroke={COLORS.assigned} strokeWidth="2" />
        ))}
      {showDots &&
        completed.map((v, i) => (
          <circle key={`c${i}`} className="sa-point" style={{ '--i': i }} cx={x(i)} cy={y(v)} r="3.5" fill="#0f2270" stroke={COLORS.done} strokeWidth="2" />
        ))}

      {buckets.map((bucket, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={bucket.key} x={x(i)} y={H - 9} textAnchor="middle">{bucket.label}</text>
        ) : null
      )}

      {hover !== null && (
        <g pointerEvents="none" className="sa-hover-line">
          <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + innerH} stroke={COLORS.gray} strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx={x(hover)} cy={y(assigned[hover])} r="5" fill="#0f2270" stroke={COLORS.assigned} strokeWidth="2.5" />
          <circle cx={x(hover)} cy={y(completed[hover])} r="5" fill="#0f2270" stroke={COLORS.done} strokeWidth="2.5" />

          <rect x={boxX} y={T} width={boxW} height="58" rx="8" fill="#071039" stroke="rgba(34,211,238,0.5)" />
          <text className="sa-tip-text sa-tip-title" x={boxX + 10} y={T + 17}>{buckets[hover].full}</text>
          <circle cx={boxX + 14} cy={T + 32} r="3.5" fill={COLORS.assigned} />
          <text className="sa-tip-text" x={boxX + 24} y={T + 35}>Assigned: {assigned[hover]}</text>
          <circle cx={boxX + 14} cy={T + 47} r="3.5" fill={COLORS.done} />
          <text className="sa-tip-text" x={boxX + 24} y={T + 50}>Completed: {completed[hover]}</text>
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
    <svg className="sa-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart of complaints by category">
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        const yy = T + innerH - (value / max) * innerH;
        return (
          <g key={k}>
            <line className="sa-grid-line" x1={L} x2={W - R} y1={yy} y2={yy} strokeWidth="1" />
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
              className="sa-bar"
              style={{ '--i': i }}
              x={bx}
              y={T + innerH - h}
              width={barW}
              height={h}
              rx="4"
              fill={d.value === top ? COLORS.done : COLORS.assigned}
            />
            <text className="sa-bar-label sa-bar-value" style={{ '--i': i }} x={bx + barW / 2} y={T + innerH - h - 6} textAnchor="middle">
              {d.value}
            </text>
            <text className="sa-bar-label" style={{ '--i': i }} x={bx + barW / 2} y={H - 10} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments, total }) {
  const r = 54;
  let offset = 0;

  return (
    <svg className="sa-svg" viewBox="0 0 150 150" role="img" aria-label="Donut chart of complaints by status">
      <circle cx="75" cy="75" r={r} fill="none" stroke="#071039" strokeWidth="18" />

      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const length = (s.value / total) * 100;
            const circle = (
              <circle
                key={s.label}
                className="sa-seg"
                style={{ '--len': length, '--i': i }}
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                pathLength="100"
                strokeDashoffset={-offset}
                transform="rotate(-90 75 75)"
              />
            );
            offset += length;
            return circle;
          })}

      <text className="sa-center-value" x="75" y="78" textAnchor="middle">{total}</text>
      <text x="75" y="94" textAnchor="middle">Complaints</text>
    </svg>
  );
}

function GaugeChart({ percent }) {
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';
  const safe = Math.min(100, Math.max(0, percent));

  return (
    <svg className="sa-svg" viewBox="0 0 200 120" role="img" aria-label={`Completion rate ${safe} percent`}>
      <path d={arc} fill="none" stroke="#071039" strokeWidth="18" strokeLinecap="round" />
      <path
        className="sa-gauge-fill"
        style={{ '--len': safe }}
        d={arc}
        pathLength="100"
        fill="none"
        stroke={COLORS.done}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <text className="sa-center-value" x="100" y="88" textAnchor="middle">{safe}%</text>
      <text x="100" y="108" textAnchor="middle">Completion rate</text>
    </svg>
  );
}

export default function StaffAnalytics({ complaints = [], loading = false }) {
  const [range, setRange] = useState('6m');

  const series = useMemo(() => {
    const config = RANGES.find((r) => r.key === range) || RANGES[2];
    const buckets = buildBuckets(config);
    const assignedMap = {};
    const completedMap = {};

    complaints.forEach((item) => {
      const assignedAt = dateFrom(item, ['assigned_at', 'created_at', 'created']);
      if (assignedAt) {
        const key = bucketKey(assignedAt, config.unit);
        assignedMap[key] = (assignedMap[key] || 0) + 1;
      }

      if (DONE.includes(statusOf(item))) {
        const doneAt = dateFrom(item, ['completed_at', 'resolved_at', 'updated_at', 'created_at', 'created']);
        if (doneAt) {
          const key = bucketKey(doneAt, config.unit);
          completedMap[key] = (completedMap[key] || 0) + 1;
        }
      }
    });

    const assigned = buckets.map((b) => assignedMap[b.key] || 0);
    const completed = buckets.map((b) => completedMap[b.key] || 0);
    const sum = (list) => list.reduce((a, b) => a + b, 0);

    return {
      buckets,
      assigned,
      completed,
      totalAssigned: sum(assigned),
      totalCompleted: sum(completed),
    };
  }, [complaints, range]);

  const analysis = useMemo(() => {
    const total = complaints.length;

    const segments = GROUPS.map((group) => ({
      label: group.label,
      color: group.color,
      value: complaints.filter((item) => group.match.includes(statusOf(item))).length,
    }));

    const counted = segments.reduce((sum, s) => sum + s.value, 0);
    if (total - counted > 0) {
      segments.push({ label: 'Other', color: COLORS.gray, value: total - counted });
    }

    const categoryMap = {};
    complaints.forEach((item) => {
      const name = item.category || 'General';
      categoryMap[name] = (categoryMap[name] || 0) + 1;
    });

    const categories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const completedCount = segments.find((s) => s.label === 'Completed')?.value || 0;
    const progressCount = segments.find((s) => s.label === 'In progress')?.value || 0;

    return {
      total,
      segments,
      categories,
      completedCount,
      progressCount,
      remaining: total - completedCount,
      completionRate: total ? Math.round((completedCount / total) * 100) : 0,
    };
  }, [complaints]);

  if (loading) {
    return (
      <section className="staff-analytics">
        <div className="sa-card">
          <div className="sa-empty">Loading analytics...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="staff-analytics">
      <div className="sa-title">
        <h3>Dashboard Analytics</h3>
        <p>See how your work is moving over time.</p>
      </div>

      <div className="sa-kpis">
        <Kpi value={analysis.total} label="Total assigned" />
        <Kpi value={analysis.progressCount} label="In progress" />
        <Kpi value={analysis.completedCount} label="Completed" />
        <Kpi value={analysis.completionRate} suffix="%" label="Completion rate" />
      </div>

      <div className="sa-grid">
        <div className="sa-card sa-wide">
          <div className="sa-head">
            <div>
              <h4>Work over time</h4>
              <p>Assigned and completed complaints. Hover or tap the chart for details.</p>
            </div>

            <div className="sa-range" role="group" aria-label="Select time range">
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

          <div className="sa-legend">
            <span>
              <i className="sa-dot-key" style={{ background: COLORS.assigned }} />
              Assigned<strong>{series.totalAssigned}</strong>
            </span>
            <span>
              <i className="sa-dot-key" style={{ background: COLORS.done }} />
              Completed<strong>{series.totalCompleted}</strong>
            </span>
          </div>

          {/* key makes the line draw again each time the range changes */}
          <TimeSeriesChart
            key={range}
            buckets={series.buckets}
            assigned={series.assigned}
            completed={series.completed}
          />
        </div>

        <div className="sa-card">
          <h4>Status breakdown</h4>
          <p>Share of your complaints by status.</p>

          <div className="sa-donut-wrap">
            <DonutChart segments={analysis.segments} total={analysis.total} />

            <div className="sa-donut-legend">
              {analysis.segments.map((s, i) => (
                <div className="sa-donut-row" style={{ '--i': i }} key={s.label}>
                  <i className="sa-dot-key" style={{ background: s.color }} />
                  {s.label}
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sa-card sa-wide">
          <h4>Complaints by category</h4>
          <p>The types of work assigned to you.</p>

          {analysis.categories.length === 0 ? (
            <div className="sa-empty">No category data yet.</div>
          ) : (
            <BarChart data={analysis.categories} />
          )}
        </div>

        <div className="sa-card">
          <h4>Completion rate</h4>
          <p>Completed compared with all assigned.</p>

          <GaugeChart percent={analysis.completionRate} />

          <div className="sa-gauge-stats">
            <div>
              <strong>{analysis.completedCount}</strong>
              <span>Completed</span>
            </div>
            <div>
              <strong>{analysis.remaining}</strong>
              <span>Remaining</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}