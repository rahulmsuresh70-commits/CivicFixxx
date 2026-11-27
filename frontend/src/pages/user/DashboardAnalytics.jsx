import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './DashboardAnalytics.css';

/* ------------------------------------------------------------------
   Live analytics for the citizen dashboard.
   Pure SVG / CSS charts: no chart library required.
------------------------------------------------------------------- */

const RESOLVED = ['resolved', 'verified', 'closed'];
const PROGRESS = [
  'approved',
  'transferred',
  'assigned',
  'in_progress',
  'reopened',
];
const AWAITING = ['submitted', 'under_review'];

const COLORS = {
  blue: '#2563eb',
  sky: '#60a5fa',
  cyan: '#06b6d4',
  orange: '#f59e0b',
  green: '#16a34a',
  slate: '#cbd5e1',
};

const RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '6m', label: '6 months' },
];

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  transferred: 'Transferred',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
  verified: 'Verified',
  closed: 'Closed',
};

const statusOf = (report) =>
  String(report?.status || '').toLowerCase();

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const prettyCategory = (value) => {
  const text = String(
    value?.name || value || 'Other'
  )
    .replaceAll('_', ' ')
    .trim();

  return text
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : 'Other';
};

const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/* ---------------- Animated number ---------------- */

export function CountUp({
  value,
  duration = 800,
  suffix = '',
}) {
  const isNumber =
    typeof value === 'number' && Number.isFinite(value);

  const [display, setDisplay] = useState(
    isNumber ? 0 : value
  );

  const previous = useRef(0);

  useEffect(() => {
    if (!isNumber) {
      setDisplay(value);
      return undefined;
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (reduce) {
      setDisplay(value);
      previous.current = value;
      return undefined;
    }

    const from = previous.current;
    const start = performance.now();
    let frame;

    const step = (now) => {
      const progress = Math.min(
        1,
        (now - start) / duration
      );
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(
        Math.round(from + (value - from) * eased)
      );

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        previous.current = value;
      }
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [value, duration, isNumber]);

  return (
    <>
      {display}
      {isNumber ? suffix : ''}
    </>
  );
}

/* ---------------- Measure container width ---------------- */

function useWidth(fallback = 520) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const update = () => {
      const next = Math.round(node.clientWidth);
      if (next > 0) setWidth(next);
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () =>
        window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/* ---------------- Data helpers ---------------- */

function buildBuckets(range, now) {
  const today = startOfDay(now);
  const buckets = [];

  if (range === '7d') {
    for (let i = 6; i >= 0; i -= 1) {
      const start = addDays(today, -i);

      buckets.push({
        label: start.toLocaleDateString('en-IN', {
          weekday: 'short',
        }),
        start,
        end: addDays(start, 1),
      });
    }
  } else if (range === '30d') {
    for (let i = 5; i >= 0; i -= 1) {
      const end = addDays(today, 1 - i * 5);
      const start = addDays(end, -5);

      buckets.push({
        label: start.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        start,
        end,
      });
    }
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1
      );

      buckets.push({
        label: start.toLocaleDateString('en-IN', {
          month: 'short',
        }),
        start,
        end: new Date(
          today.getFullYear(),
          today.getMonth() - i + 1,
          1
        ),
      });
    }
  }

  return buckets;
}

function niceMax(values) {
  const max = Math.max(4, ...values);
  return Math.ceil(max / 4) * 4;
}

function smoothPath(points, top, bottom) {
  if (points.length < 2) return '';

  const clamp = (y) => Math.min(bottom, Math.max(top, y));
  const tension = 0.18;

  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) * tension);
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) * tension);

    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(
      1
    )},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  return d;
}

function computeAnalytics(reports, notifications, range) {
  const now = new Date();
  const today = startOfDay(now);

  const total = reports.length;

  const counts = {
    resolved: 0,
    progress: 0,
    awaiting: 0,
    rejected: 0,
  };

  const statusCounts = {};
  const categories = {};

  reports.forEach((report) => {
    const status = statusOf(report);

    statusCounts[status] =
      (statusCounts[status] || 0) + 1;

    if (RESOLVED.includes(status)) counts.resolved += 1;
    else if (PROGRESS.includes(status)) counts.progress += 1;
    else if (AWAITING.includes(status)) counts.awaiting += 1;
    else if (status === 'rejected') counts.rejected += 1;

    const category = prettyCategory(report.category);

    if (!categories[category]) {
      categories[category] = { total: 0, resolved: 0 };
    }

    categories[category].total += 1;

    if (RESOLVED.includes(status)) {
      categories[category].resolved += 1;
    }
  });

  const buckets = buildBuckets(range, now);

  const trend = buckets.map((bucket) => ({
    label: bucket.label,
    created: reports.filter((report) => {
      const date = toDate(report.created_at);
      return date && date >= bucket.start && date < bucket.end;
    }).length,
    resolved: reports.filter((report) => {
      if (!RESOLVED.includes(statusOf(report))) return false;

      const date = toDate(
        report.resolved_at ||
          report.updated_at ||
          report.created_at
      );

      return date && date >= bucket.start && date < bucket.end;
    }).length,
  }));

  const createdSince = (days) =>
    reports.filter((report) => {
      const date = toDate(report.created_at);
      return date && date >= addDays(today, -days);
    }).length;

  const progressRows = [
    { label: 'Today', value: createdSince(0) },
    { label: 'Week', value: createdSince(6) },
    { label: 'Month', value: createdSince(29) },
  ];

  const durations = reports
    .filter((report) => RESOLVED.includes(statusOf(report)))
    .map((report) => {
      const start = toDate(report.created_at);
      const end = toDate(
        report.resolved_at || report.updated_at
      );

      return start && end && end >= start
        ? (end - start) / 86400000
        : null;
    })
    .filter((value) => value !== null);

  const avgDays = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) /
      durations.length
    : null;

  const sorted = [...reports].sort(
    (a, b) =>
      (toDate(b.created_at)?.getTime() || 0) -
      (toDate(a.created_at)?.getTime() || 0)
  );

  return {
    now,
    total,
    counts,
    statusCounts,
    trend,
    progressRows,
    avgDays,
    resolutionRate: total
      ? Math.round((counts.resolved / total) * 100)
      : 0,
    handledRate: total
      ? Math.round(
          ((total - counts.awaiting) / total) * 100
        )
      : 0,
    categories: Object.entries(categories)
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    latestReport: sorted[0] || null,
    latestNotification: notifications[0] || null,
  };
}

/* ---------------- Card shell ---------------- */

function Card({ title, subtitle, action, className = '', children }) {
  return (
    <article className={`cfa-card ${className}`}>
      <header className="cfa-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {action}
      </header>

      {children}
    </article>
  );
}

/* ---------------- Donut ---------------- */

function DonutChart({ data }) {
  const { total, counts, resolutionRate } = data;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { key: 'resolved', label: 'Resolved', value: counts.resolved, color: COLORS.blue },
    { key: 'progress', label: 'In progress', value: counts.progress, color: COLORS.cyan },
    { key: 'awaiting', label: 'Awaiting', value: counts.awaiting, color: COLORS.orange },
    { key: 'rejected', label: 'Rejected', value: counts.rejected, color: COLORS.slate },
  ];

  let offset = 0;

  return (
    <>
      <div className="cfa-donut">
        <svg
          viewBox="0 0 140 140"
          role="img"
          aria-label={`${resolutionRate}% of complaints resolved`}
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
          />

          {total > 0 &&
            segments.map((segment) => {
              const length =
                (segment.value / total) * circumference;

              const node = (
                <circle
                  key={segment.key}
                  className="cfa-donut-seg"
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                  style={{
                    '--len': length,
                    '--rest': circumference - length,
                    '--full': circumference,
                  }}
                />
              );

              offset += length;

              return segment.value > 0 ? node : null;
            })}
        </svg>

        <div className="cfa-donut-center">
          <strong>
            <CountUp value={resolutionRate} suffix="%" />
          </strong>
          <span>resolved</span>
        </div>
      </div>

      <ul className="cfa-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <i style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <b>{segment.value}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Gauge ---------------- */

function Gauge({ data }) {
  const { handledRate, avgDays } = data;
  const angle = -90 + (handledRate / 100) * 180;

  return (
    <>
      <div className="cfa-gauge">
        <svg
          viewBox="0 0 200 124"
          role="img"
          aria-label={`${handledRate}% of complaints handled`}
        >
          <defs>
            <linearGradient id="cfa-gauge-grad" x1="0" x2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="55%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          <path
            d="M20,100 A80,80 0 0 1 180,100"
            pathLength="100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <path
            className="cfa-gauge-value"
            d="M20,100 A80,80 0 0 1 180,100"
            pathLength="100"
            fill="none"
            stroke="url(#cfa-gauge-grad)"
            strokeWidth="14"
            strokeLinecap="round"
            style={{ '--val': handledRate }}
          />

          <g
            className="cfa-gauge-needle"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="38"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          <circle cx="100" cy="100" r="8" fill="#0f172a" />
          <circle cx="100" cy="100" r="3" fill="#fff" />

          <text x="20" y="120" className="cfa-axis" textAnchor="middle">
            0
          </text>
          <text x="180" y="120" className="cfa-axis" textAnchor="middle">
            100%
          </text>
        </svg>
      </div>

      <div className="cfa-gauge-value-text">
        <strong>
          <CountUp value={handledRate} suffix="%" />
        </strong>
        <span>handled by teams</span>
      </div>

      <div className="cfa-metric-row">
        <span>Avg. time to resolve</span>
        <b>
          {avgDays === null
            ? '—'
            : `${avgDays.toFixed(1)} day${
                avgDays.toFixed(1) === '1.0' ? '' : 's'
              }`}
        </b>
      </div>
    </>
  );
}

/* ---------------- Trend (area + line) ---------------- */

function TrendChart({ trend, range }) {
  const [ref, width] = useWidth(560);
  const [hover, setHover] = useState(null);

  const height = 240;
  const pad = { top: 16, right: 16, bottom: 30, left: 34 };

  const innerW = Math.max(120, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(
    trend.flatMap((item) => [item.created, item.resolved])
  );

  const x = (i) =>
    pad.left + (trend.length === 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
  const y = (value) => pad.top + innerH - (value / max) * innerH;

  const createdPts = trend.map((item, i) => [x(i), y(item.created)]);
  const resolvedPts = trend.map((item, i) => [x(i), y(item.resolved)]);

  const bottom = pad.top + innerH;
  const createdLine = smoothPath(createdPts, pad.top, bottom);
  const resolvedLine = smoothPath(resolvedPts, pad.top, bottom);

  const area = createdLine
    ? `${createdLine} L${x(trend.length - 1).toFixed(1)},${bottom} L${x(0).toFixed(1)},${bottom} Z`
    : '';

  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const empty = trend.every(
    (item) => item.created === 0 && item.resolved === 0
  );

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clientX =
      event.touches?.[0]?.clientX ?? event.clientX;
    const ratio = (clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (trend.length - 1));

    setHover(Math.min(trend.length - 1, Math.max(0, index)));
  };

  const active = hover === null ? null : trend[hover];
  const tipW = 118;
  const tipX =
    hover === null
      ? 0
      : Math.min(
          width - tipW - 6,
          Math.max(6, x(hover) - tipW / 2)
        );

  return (
    <div className="cfa-chart" ref={ref}>
      <svg
        key={range}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Complaints submitted and resolved over time"
      >
        <defs>
          <linearGradient id="cfa-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity=".22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeDasharray={tick === 0 ? '0' : '3 4'}
            />
            <text
              x={pad.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="cfa-axis"
            >
              {tick}
            </text>
          </g>
        ))}

        {trend.map((item, i) => (
          <text
            key={`${item.label}-${i}`}
            x={x(i)}
            y={height - 8}
            textAnchor="middle"
            className="cfa-axis"
          >
            {item.label}
          </text>
        ))}

        {area && <path className="cfa-area" d={area} fill="url(#cfa-area)" />}

        {resolvedLine && (
          <path
            className="cfa-line"
            d={resolvedLine}
            pathLength="1"
            fill="none"
            stroke={COLORS.orange}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {createdLine && (
          <path
            className="cfa-line"
            d={createdLine}
            pathLength="1"
            fill="none"
            stroke={COLORS.blue}
            strokeWidth="2.75"
            strokeLinecap="round"
          />
        )}

        {createdPts.map(([px, py], i) => (
          <circle
            key={`c${i}`}
            className="cfa-dot"
            cx={px}
            cy={py}
            r={hover === i ? 5.5 : 3.5}
            fill="#fff"
            stroke={COLORS.blue}
            strokeWidth="2.25"
          />
        ))}

        {resolvedPts.map(([px, py], i) => (
          <circle
            key={`r${i}`}
            className="cfa-dot"
            cx={px}
            cy={py}
            r={hover === i ? 5.5 : 3.5}
            fill="#fff"
            stroke={COLORS.orange}
            strokeWidth="2.25"
          />
        ))}

        {active && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={bottom}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
            <g transform={`translate(${tipX}, ${pad.top + 2})`}>
              <rect width={tipW} height="58" rx="8" fill="#0f172a" />
              <text x="10" y="18" className="cfa-tip-title">
                {active.label}
              </text>
              <circle cx="14" cy="32" r="3.5" fill={COLORS.blue} />
              <text x="24" y="36" className="cfa-tip-text">
                Submitted {active.created}
              </text>
              <circle cx="14" cy="48" r="3.5" fill={COLORS.orange} />
              <text x="24" y="52" className="cfa-tip-text">
                Resolved {active.resolved}
              </text>
            </g>
          </g>
        )}

        <rect
          x={pad.left}
          y={pad.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onTouchStart={handleMove}
          onTouchMove={handleMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {empty && (
        <div className="cfa-chart-empty">
          No activity in this period yet
        </div>
      )}
    </div>
  );
}

/* ---------------- Status stacked bar ---------------- */

function StatusBreakdown({ data }) {
  const { statusCounts, total } = data;

  const rows = Object.entries(statusCounts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const palette = [
    COLORS.blue,
    COLORS.sky,
    COLORS.orange,
    COLORS.cyan,
    '#6366f1',
    COLORS.green,
    COLORS.slate,
  ];

  if (!total) {
    return <div className="cfa-empty">No complaints to break down yet.</div>;
  }

  return (
    <>
      <div
        className="cfa-stack"
        role="img"
        aria-label="Complaint status distribution"
      >
        {rows.map(([status, value], i) => (
          <span
            key={status}
            style={{
              flexGrow: value,
              background: palette[i % palette.length],
              animationDelay: `${i * 70}ms`,
            }}
            title={`${STATUS_LABELS[status] || status}: ${value}`}
          />
        ))}
      </div>

      <ul className="cfa-status-list">
        {rows.slice(0, 5).map(([status, value], i) => (
          <li key={status}>
            <i style={{ background: palette[i % palette.length] }} />
            <span>
              {STATUS_LABELS[status] ||
                status.replaceAll('_', ' ')}
            </span>
            <em>{Math.round((value / total) * 100)}%</em>
            <b>{value}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Category grouped bars ---------------- */

function CategoryChart({ categories }) {
  const [ref, width] = useWidth(420);

  const height = 220;
  const pad = { top: 14, right: 8, bottom: 30, left: 28 };

  const innerW = Math.max(120, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(categories.map((item) => item.total));
  const group = innerW / Math.max(categories.length, 1);
  const barW = Math.max(8, Math.min(22, group / 3));

  const y = (value) => pad.top + innerH - (value / max) * innerH;

  if (!categories.length) {
    return <div className="cfa-empty">Categories will appear once you submit complaints.</div>;
  }

  return (
    <div className="cfa-chart" ref={ref}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Complaints by category"
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const tick = (max / 4) * i;

          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#e2e8f0"
                strokeDasharray={i === 0 ? '0' : '3 4'}
              />
              <text
                x={pad.left - 6}
                y={y(tick) + 4}
                textAnchor="end"
                className="cfa-axis"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {categories.map((item, i) => {
          const cx = pad.left + group * i + group / 2;

          return (
            <g key={item.name}>
              <rect
                className="cfa-bar"
                x={cx - barW - 2}
                y={y(item.total)}
                width={barW}
                height={pad.top + innerH - y(item.total)}
                rx="4"
                fill={COLORS.blue}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <title>{`${item.name}: ${item.total} total`}</title>
              </rect>

              <rect
                className="cfa-bar"
                x={cx + 2}
                y={y(item.resolved)}
                width={barW}
                height={pad.top + innerH - y(item.resolved)}
                rx="4"
                fill={COLORS.orange}
                style={{ animationDelay: `${i * 70 + 40}ms` }}
              >
                <title>{`${item.name}: ${item.resolved} resolved`}</title>
              </rect>

              <text
                x={cx}
                y={height - 9}
                textAnchor="middle"
                className="cfa-axis"
              >
                {clip(item.name, group < 70 ? 7 : 11)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="cfa-key">
        <span><i style={{ background: COLORS.blue }} />Total</span>
        <span><i style={{ background: COLORS.orange }} />Resolved</span>
      </div>
    </div>
  );
}

/* ---------------- Calendar + activity ---------------- */

function ActivityCard({ data }) {
  const { now, progressRows, latestReport, latestNotification } = data;
  const maxRow = Math.max(1, ...progressRows.map((row) => row.value));

  return (
    <>
      <div className="cfa-calendar">
        <div className="cfa-date">
          <span>
            {now
              .toLocaleDateString('en-IN', { month: 'short' })
              .toUpperCase()}
          </span>
          <strong>{now.getDate()}</strong>
          <small>
            {now.toLocaleDateString('en-IN', { weekday: 'short' })}
          </small>
        </div>

        <div className="cfa-events">
          <div className="cfa-event is-blue">
            <b>
              {latestReport
                ? clip(
                    latestReport.title || `Complaint #${latestReport.id}`,
                    30
                  )
                : 'No complaints yet'}
            </b>
            <small>
              {latestReport
                ? STATUS_LABELS[statusOf(latestReport)] ||
                  'Latest complaint'
                : 'Submit your first report'}
            </small>
          </div>

          <div className="cfa-event is-orange">
            <b>
              {latestNotification
                ? clip(latestNotification.message || 'New update', 34)
                : 'You’re all caught up'}
            </b>
            <small>Latest update</small>
          </div>
        </div>
      </div>

      <ul className="cfa-progress">
        {progressRows.map((row, i) => (
          <li key={row.label}>
            <span className="cfa-progress-label">{row.label}</span>

            <span className="cfa-progress-track">
              <span
                className="cfa-progress-fill"
                style={{
                  width: `${(row.value / maxRow) * 100}%`,
                  animationDelay: `${i * 90}ms`,
                }}
              />
            </span>

            <b>
              <CountUp value={row.value} />
            </b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Main component ---------------- */

export default function DashboardAnalytics({
  reports,
  notifications,
  loading,
  error,
  live,
  onToggleLive,
  onRefresh,
  refreshing,
  lastUpdated,
}) {
  const [range, setRange] = useState('30d');

  const data = useMemo(
    () => computeAnalytics(reports, notifications, range),
    [reports, notifications, range]
  );

  const time = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  return (
    <section className="cfa" aria-label="Live analytics">
      <div className="cfa-head">
        <div>
          <h2>Live analytics</h2>
          <p>
            A real-time view of your complaints. Refreshes
            automatically every 30 seconds.
          </p>
        </div>

        <div className="cfa-tools">
          <span className={`cfa-live ${live ? 'is-live' : ''}`}>
            <i />
            {live ? 'Live' : 'Paused'}
            <small>Updated {time}</small>
          </span>

          <button
            type="button"
            className="cfa-chip"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <span
              className={refreshing ? 'cfa-spin' : ''}
              aria-hidden="true"
            >
              ↻
            </span>
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>

          <button
            type="button"
            className="cfa-chip"
            onClick={onToggleLive}
            aria-pressed={live}
          >
            {live ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="cfa-grid" aria-busy="true">
          {[3, 6, 3, 4, 4, 4].map((span, i) => (
            <div
              key={i}
              className={`cfa-card cfa-skeleton cfa-span-${span}`}
            />
          ))}
        </div>
      ) : error ? (
        <div className="cfa-card cfa-error">
          <strong>Analytics unavailable</strong>
          <p>We couldn’t load your complaints to build the charts.</p>
          <button
            type="button"
            className="cfa-chip"
            onClick={onRefresh}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="cfa-grid">
          <Card
            className="cfa-span-3 cfa-order-1"
            title="Resolution rate"
            subtitle={`${data.total} complaint${
              data.total === 1 ? '' : 's'
            } in total`}
          >
            <DonutChart data={data} />
          </Card>

          <Card
            className="cfa-span-6 cfa-order-3"
            title="Complaint activity"
            subtitle="Submitted vs resolved"
            action={
              <div className="cfa-segment" role="tablist">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={range === item.key}
                    className={range === item.key ? 'is-active' : ''}
                    onClick={() => setRange(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <TrendChart trend={data.trend} range={range} />

            <div className="cfa-key">
              <span><i style={{ background: COLORS.blue }} />Submitted</span>
              <span><i style={{ background: COLORS.orange }} />Resolved</span>
            </div>
          </Card>

          <Card
            className="cfa-span-3 cfa-order-2"
            title="Handled rate"
            subtitle="Moved past “awaiting”"
          >
            <Gauge data={data} />
          </Card>

          <Card
            className="cfa-span-4 cfa-order-4"
            title="Status breakdown"
            subtitle="Where your complaints stand"
          >
            <StatusBreakdown data={data} />
          </Card>

          <Card
            className="cfa-span-4 cfa-order-5"
            title="By category"
            subtitle="Top categories"
          >
            <CategoryChart categories={data.categories} />
          </Card>

          <Card
            className="cfa-span-4 cfa-order-6"
            title="Today & recent"
            subtitle="New complaints submitted"
          >
            <ActivityCard data={data} />
          </Card>
        </div>
      )}
    </section>
  );
}
