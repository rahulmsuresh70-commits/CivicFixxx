import { useEffect, useMemo, useRef, useState } from 'react';

/*
  Manager 2 Dashboard Analytics (display only).

  - Reads only the `requests` array you pass in. It never writes data and
    makes no API calls of its own.
  - "Live" means: the numbers count up when your data changes, the highlights
    keep moving along every chart, the "updated ... ago" clock ticks, and, if
    you pass your existing refresh function as `onRefresh`, the data is reloaded
    automatically every `refreshMs` (default 30 seconds) while the tab is visible.
  - Styles are in SeniorCitizenManagerDashboard.css (classes start with ma-).

  Props:
    requests   array of requests (status, created_at, assistance_type ...)
    loading    true while the first load is running
    error      error text if the first load failed
    onRefresh  function that reloads `requests` (also used by the Retry button)
    refreshMs  auto refresh interval in milliseconds
*/

const C = {
  blue: '#2e5de6',
  navy: '#0f2270',
  amber: '#f59e0b',
  teal: '#14b8a6',
  violet: '#7c5cff',
  soft: '#afc5f8',
  green: '#22c55e',
};

const GROUPS = [
  { key: 'completed', label: 'Completed', color: C.blue, match: ['resolved', 'completed', 'verified', 'closed'] },
  { key: 'pending', label: 'Pending', color: C.amber, match: ['submitted', 'transferred', 'under_review', 'pending', 'reopened'] },
  { key: 'progress', label: 'In progress', color: C.teal, match: ['approved', 'assigned', 'in_progress', 'progress', 'started'] },
  { key: 'rejected', label: 'Rejected', color: C.violet, match: ['rejected'] },
];

const DONE = GROUPS[0].match;

const RANGES = [
  { key: '7d', label: '7 days', unit: 'day', count: 7 },
  { key: '30d', label: '30 days', unit: 'day', count: 30 },
  { key: '6m', label: '6 months', unit: 'month', count: 6 },
];

const TICK_MS = 2600;

function statusOf(item) {
  return String(item?.status || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
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

const CREATED = ['created_at', 'created'];
const FINISHED = ['completed_at', 'resolved_at', 'updated_at', 'created_at', 'created'];

function pretty(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
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
      label: d.toLocaleDateString('en-IN', unit === 'day' ? { day: 'numeric', month: 'short' } : { month: 'short' }),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      full: d.toLocaleDateString(
        'en-IN',
        unit === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' }
      ),
    });
  }

  return buckets;
}

function niceMax(value) {
  return value <= 4 ? 4 : Math.ceil(value / 4) * 4;
}

function smoothPath(points, lo = -Infinity, hi = Infinity) {
  if (points.length < 2) return '';
  const cy = (v) => Math.min(hi, Math.max(lo, v));
  let d = `M ${points[0][0]},${cy(points[0][1])}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const t = 0.2;

    d += ` C ${p1[0] + (p2[0] - p0[0]) * t},${cy(p1[1] + (p2[1] - p0[1]) * t)} ${p2[0] - (p3[0] - p1[0]) * t},${cy(
      p2[1] - (p3[1] - p1[1]) * t
    )} ${p2[0]},${cy(p2[1])}`;
  }

  return d;
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/* Animates from the number currently shown to the new target (so it moves whenever data changes). */
function useAnimatedNumber(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }

    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (target - from) * (1 - (1 - progress) ** 3));
      fromRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Num({ value, suffix = '' }) {
  const shown = useAnimatedNumber(value);
  return <>{shown}{suffix}</>;
}

/* Grows from 0 to the target shortly after mount / change (drives CSS transitions). */
function useEased(target, delay = 120) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShown(target), delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  return shown;
}

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function LiveBadge({ updatedAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
  const label = seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;

  return (
    <div className="ma-live" aria-live="off">
      <i className="ma-live-dot" />
      LIVE
      <span>Updated {label}</span>
    </div>
  );
}

function CardHead({ title, note, children }) {
  return (
    <div className="ma-head">
      <div>
        <h4>{title}</h4>
        {note ? <p>{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* ---------------- charts ---------------- */

function Ring({ percent, hasData }) {
  const shown = useEased(percent);
  const r = 50;

  return (
    <svg className="ma-svg" viewBox="0 0 140 140" role="img" aria-label={`Completion rate ${percent} percent`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke={hasData ? C.amber : '#ffffff'} strokeWidth="15" />
      <circle
        className="ma-ring-fill"
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={C.blue}
        strokeWidth="15"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${Math.max(shown, 0.01)} 100`}
        opacity={shown > 0 ? 1 : 0}
        transform="rotate(-90 70 70)"
      />
    </svg>
  );
}

function WeekLine({ buckets, received, completed, active }) {
  const W = 300;
  const H = 172;
  const L = 16;
  const R = 16;
  const T = 30;
  const B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = buckets.length;
  const max = niceMax(Math.max(...received, ...completed, 1));
  const step = n > 1 ? innerW / (n - 1) : 0;
  const x = (i) => L + i * step;
  const y = (v) => T + innerH - (v / max) * innerH;
  const pr = received.map((v, i) => [x(i), y(v)]);
  const pc = completed.map((v, i) => [x(i), y(v)]);

  return (
    <svg className="ma-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Requests received and completed over the last 7 days">
      {[0, 0.5, 1].map((k) => (
        <line key={k} className="ma-grid-line" x1={L} x2={W - R} y1={T + innerH * k} y2={T + innerH * k} />
      ))}

      <path className="ma-line" pathLength="1" d={smoothPath(pr, T, T + innerH)} fill="none" stroke={C.blue} strokeWidth="2.6" strokeLinecap="round" />
      <path className="ma-line ma-line-2" pathLength="1" d={smoothPath(pc, T, T + innerH)} fill="none" stroke={C.amber} strokeWidth="2.6" strokeLinecap="round" />

      {pr.map(([px, py], i) => (
        <circle key={buckets[i].key} className="ma-dot" cx={px} cy={py} r="3.6" fill="#ffffff" stroke={C.blue} strokeWidth="2" />
      ))}

      {buckets.map((bucket, i) => (
        <text key={bucket.key} x={x(i)} y={H - 8} textAnchor="middle">{bucket.weekday.slice(0, 3)}</text>
      ))}

      <g pointerEvents="none" className="ma-playhead" style={{ transform: `translateX(${x(active)}px)` }}>
        <line x1="0" x2="0" y1={T - 6} y2={T + innerH} className="ma-playhead-line" />
        <circle className="ma-ping" cx="0" cy={pr[active][1]} r="5" fill="none" stroke={C.blue} strokeWidth="2" />
        <circle cx="0" cy={pr[active][1]} r="5.5" fill={C.blue} stroke="#ffffff" strokeWidth="2" />
        <circle cx="0" cy={pc[active][1]} r="4.5" fill={C.amber} stroke="#ffffff" strokeWidth="2" />
        <text className="ma-bar-value" x="0" y={T - 12} textAnchor="middle">{received[active]}</text>
      </g>
    </svg>
  );
}

function LiveAreaChart({ buckets, received, completed, shown, onHover, onLeave }) {
  const W = 520;
  const H = 240;
  const L = 34;
  const R = 14;
  const T = 16;
  const B = 30;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = buckets.length;
  const max = niceMax(Math.max(...received, ...completed, 1));
  const step = n > 1 ? innerW / (n - 1) : 0;
  const labelEvery = Math.ceil(n / 7);

  const x = (i) => L + i * step;
  const y = (v) => T + innerH - (v / max) * innerH;
  const clampY = (value) => Math.min(T + innerH, Math.max(T, value));

  const pr = received.map((v, i) => [x(i), y(v)]);
  const pc = completed.map((v, i) => [x(i), y(v)]);
  const pathR = smoothPath(pr, T, T + innerH);
  const pathC = smoothPath(pc, T, T + innerH);
  const area = `${pathR} L ${x(n - 1)},${T + innerH} L ${x(0)},${T + innerH} Z`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    onHover(Math.min(n - 1, Math.max(0, Math.round((px - L) / (step || 1)))));
  };

  const boxW = 124;
  const boxX = Math.min(Math.max(x(shown) - boxW / 2, L), W - R - boxW);

  return (
    <svg
      className="ma-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Time-series chart of requests received and completed"
      onPointerMove={handleMove}
      onPointerDown={handleMove}
      onPointerLeave={onLeave}
    >
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        return (
          <g key={k}>
            <line className="ma-grid-line" x1={L} x2={W - R} y1={y(value)} y2={y(value)} />
            <text x={L - 8} y={y(value) + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      <path className="ma-area" d={area} fill={C.blue} fillOpacity="0.14" />
      <path className="ma-line" pathLength="1" d={pathR} fill="none" stroke={C.blue} strokeWidth="2.8" strokeLinecap="round" />
      <path className="ma-line ma-line-2" pathLength="1" d={pathC} fill="none" stroke={C.amber} strokeWidth="2.8" strokeLinecap="round" />

      {buckets.map((bucket, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={bucket.key} x={x(i)} y={H - 9} textAnchor="middle">{bucket.label}</text>
        ) : null
      )}

      <g pointerEvents="none" className="ma-playhead" style={{ transform: `translateX(${x(shown)}px)` }}>
        <line x1="0" x2="0" y1={T} y2={T + innerH} className="ma-playhead-line" />
        <circle className="ma-ping" cx="0" cy={clampY(y(received[shown]))} r="5" fill="none" stroke={C.blue} strokeWidth="2" />
        <circle cx="0" cy={clampY(y(received[shown]))} r="5" fill="#ffffff" stroke={C.blue} strokeWidth="2.6" />
        <circle cx="0" cy={clampY(y(completed[shown]))} r="5" fill="#ffffff" stroke={C.amber} strokeWidth="2.6" />
      </g>

      <g pointerEvents="none" className="ma-tip" style={{ transform: `translate(${boxX}px, ${T}px)` }}>
        <rect width={boxW} height="60" rx="8" fill={C.navy} />
        <text className="ma-tip-text ma-tip-title" x="10" y="17">{buckets[shown].full}</text>
        <circle cx="14" cy="33" r="3.5" fill={C.blue} />
        <text className="ma-tip-text" x="24" y="36">Received: {received[shown]}</text>
        <circle cx="14" cy="48" r="3.5" fill={C.amber} />
        <text className="ma-tip-text" x="24" y="51">Completed: {completed[shown]}</text>
      </g>
    </svg>
  );
}

function GroupedBars({ buckets, received, completed, active }) {
  const W = 300;
  const H = 230;
  const L = 28;
  const R = 8;
  const T = 16;
  const B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = buckets.length;
  const max = niceMax(Math.max(...received, ...completed, 1));
  const slot = innerW / n;
  const barW = Math.min(12, slot * 0.3);

  return (
    <svg className="ma-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grouped bars of requests received and completed per day">
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        const yy = T + innerH - (value / max) * innerH;
        return (
          <g key={k}>
            <line className="ma-grid-line" x1={L} x2={W - R} y1={yy} y2={yy} />
            <text x={L - 7} y={yy + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      {buckets.map((bucket, i) => {
        const cx = L + slot * i + slot / 2;
        const h1 = (received[i] / max) * innerH;
        const h2 = (completed[i] / max) * innerH;

        return (
          <g key={bucket.key} className={i === active ? 'ma-col ma-col-on' : 'ma-col'}>
            <rect className="ma-bar" style={{ '--i': i }} x={cx - barW - 1.5} y={T + innerH - h1} width={barW} height={Math.max(h1, 0)} rx="3.5" fill={C.blue} />
            <rect className="ma-bar" style={{ '--i': i + 0.5 }} x={cx + 1.5} y={T + innerH - h2} width={barW} height={Math.max(h2, 0)} rx="3.5" fill={C.amber} />
            <text x={cx} y={H - 9} textAnchor="middle">{bucket.weekday.slice(0, 3)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function VerticalBars({ buckets, received, completed, active }) {
  const W = 300;
  const H = 236;
  const L = 30;
  const R = 6;
  const T = 22;
  const B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = buckets.length;
  const max = niceMax(Math.max(...received, 1));
  const slot = innerW / n;
  const barW = Math.min(15, slot * 0.46);

  return (
    <svg className="ma-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Requests received and completed for each of the last 7 days">
      {[0, 1, 2, 3, 4].map((k) => {
        const value = (max / 4) * k;
        const yy = T + innerH - (value / max) * innerH;
        return (
          <g key={k}>
            <line className="ma-grid-line" x1={L} x2={W - R} y1={yy} y2={yy} />
            <text x={L - 7} y={yy + 3} textAnchor="end">{Math.round(value)}</text>
          </g>
        );
      })}

      {buckets.map((bucket, i) => {
        const cx = L + slot * i + slot / 2;
        const bx = cx - barW / 2;
        const hr = (received[i] / max) * innerH;
        const hc = (completed[i] / max) * innerH;
        const on = i === active;

        return (
          <g key={bucket.key} className={on ? 'ma-col ma-col-on' : 'ma-col'}>
            <rect x={bx} y={T} width={barW} height={innerH} rx={barW / 2} fill="#ffffff" />
            <rect className="ma-bar" style={{ '--i': i }} x={bx} y={T + innerH - Math.max(hr, 0)} width={barW} height={Math.max(hr, 0)} rx={barW / 2} fill={on ? C.amber : C.soft} />
            <rect className="ma-bar" style={{ '--i': i + 0.4 }} x={bx} y={T + innerH - Math.max(hc, 0)} width={barW} height={Math.max(hc, 0)} rx={barW / 2} fill={C.blue} />
            {on ? <text className="ma-bar-value" x={cx} y={T - 7} textAnchor="middle">{received[i]}</text> : null}
            <text x={cx} y={H - 9} textAnchor="middle">{bucket.weekday.slice(0, 3)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ArchBars({ data }) {
  const W = 300;
  const H = 230;
  const T = 28;
  const B = 34;
  const innerH = H - T - B;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = W / data.length;
  const barW = Math.min(34, slot * 0.66);
  const top = Math.max(...data.map((d) => d.value));

  return (
    <svg className="ma-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Requests by assistance type">
      <line className="ma-grid-line" x1="0" x2={W} y1={T + innerH} y2={T + innerH} />
      {data.map((d, i) => {
        const h = Math.max(18, (d.value / max) * innerH);
        const bx = slot * i + (slot - barW) / 2;
        const by = T + innerH - h;
        const r = Math.min(barW / 2, h);
        const first = d.label.split(' ')[0];
        const label = first.length > 8 ? `${first.slice(0, 7)}…` : first;
        const path = `M ${bx},${by + h} L ${bx},${by + r} Q ${bx},${by} ${bx + r},${by} L ${bx + barW - r},${by} Q ${bx + barW},${by} ${bx + barW},${by + r} L ${bx + barW},${by + h} Z`;

        return (
          <g key={d.label}>
            <title>{`${d.label}: ${d.value}`}</title>
            <path className="ma-bar" style={{ '--i': i }} d={path} fill={d.value === top ? C.amber : C.blue} />
            <text className="ma-bar-value" x={bx + barW / 2} y={by - 7} textAnchor="middle">{d.value}</text>
            <text x={bx + barW / 2} y={H - 11} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Gauge({ percent }) {
  const shown = useEased(percent);
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';
  const angle = -90 + (shown / 100) * 180;
  const ticks = [0, 1, 2, 3, 4].map((i) => {
    const a = ((-90 + i * 45) * Math.PI) / 180;
    return {
      x1: 100 + 90 * Math.sin(a),
      y1: 100 - 90 * Math.cos(a),
      x2: 100 + 98 * Math.sin(a),
      y2: 100 - 98 * Math.cos(a),
      key: i,
    };
  });

  return (
    <svg className="ma-svg" viewBox="0 0 200 124" role="img" aria-label={`Completion rate ${percent} percent`}>
      <defs>
        <linearGradient id="ma-gauge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.blue} />
          <stop offset="100%" stopColor={C.green} />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
      <path
        className="ma-gauge-fill"
        d={arc}
        pathLength="100"
        fill="none"
        stroke="url(#ma-gauge-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(shown, 0.01)} 100`}
        opacity={shown > 0 ? 1 : 0}
      />
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#3b4a82" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      <g className="ma-needle" style={{ transform: `rotate(${angle}deg)` }}>
        <g className="ma-sway">
          <line x1="100" y1="100" x2="100" y2="42" stroke={C.navy} strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <circle cx="100" cy="100" r="7" fill={C.navy} />
      <circle cx="100" cy="100" r="3" fill={C.amber} />
      <text x="14" y="118">0</text>
      <text x="186" y="118" textAnchor="end">100%</text>
    </svg>
  );
}

/* Ruler style slider: the thumb glides month to month by itself, drag it to look at a month. */
function MonthSlider({ months, index, onPick }) {
  const n = months.buckets.length;
  const ticks = (n - 1) * 8 + 1;
  const pct = n > 1 ? (index / (n - 1)) * 100 : 0;

  return (
    <div className="ma-slider">
      <div className="ma-ruler" aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => (
          <i key={i} className={i % 8 === 0 ? 'ma-tick ma-tick-major' : 'ma-tick'} />
        ))}
      </div>

      <div className="ma-thumb" style={{ left: `${pct}%` }} aria-hidden="true">
        <b><Num value={months.received[index]} /></b>
      </div>

      <input
        className="ma-range-input"
        type="range"
        min="0"
        max={n - 1}
        step="1"
        value={index}
        onChange={(event) => onPick(Number(event.target.value))}
        aria-label="Choose a month"
        aria-valuetext={`${months.buckets[index].full}: ${months.received[index]} requests received`}
      />

      <div className="ma-month-labels" aria-hidden="true">
        {months.buckets.map((bucket, i) => (
          <span key={bucket.key} className={i === index ? 'ma-month-on' : ''} style={{ left: `${n > 1 ? (i / (n - 1)) * 100 : 0}%` }}>
            {bucket.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- main component ---------------- */

export default function Manager2Analytics({
  requests = [],
  loading = false,
  error = '',
  onRefresh,
  refreshMs = 30000,
}) {
  const [range, setRange] = useState('30d');
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState(null);
  const [picked, setPicked] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  /* reload your existing data on a timer (optional, only if onRefresh is passed) */
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!onRefresh) return undefined;
    const id = setInterval(() => {
      if (!document.hidden && refreshRef.current) refreshRef.current();
    }, refreshMs);
    return () => clearInterval(id);
  }, [onRefresh, refreshMs]);

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [requests]);

  /* one shared "heartbeat": every moving highlight follows it */
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) setTick((value) => value + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  /* after the user drags the slider, let go of it again after a while */
  useEffect(() => {
    if (picked === null) return undefined;
    const id = setTimeout(() => setPicked(null), 9000);
    return () => clearTimeout(id);
  }, [picked]);

  const config = RANGES.find((r) => r.key === range) || RANGES[1];

  /* time series for the selected range */
  const series = useMemo(() => {
    const buckets = buildBuckets(config);
    const receivedMap = {};
    const completedMap = {};

    requests.forEach((item) => {
      const createdAt = dateFrom(item, CREATED);
      if (createdAt) {
        const key = bucketKey(createdAt, config.unit);
        receivedMap[key] = (receivedMap[key] || 0) + 1;
      }

      if (DONE.includes(statusOf(item))) {
        const doneAt = dateFrom(item, FINISHED);
        if (doneAt) {
          const key = bucketKey(doneAt, config.unit);
          completedMap[key] = (completedMap[key] || 0) + 1;
        }
      }
    });

    const received = buckets.map((b) => receivedMap[b.key] || 0);
    const completed = buckets.map((b) => completedMap[b.key] || 0);
    const sum = (list) => list.reduce((a, b) => a + b, 0);

    return { buckets, received, completed, totalReceived: sum(received), totalCompleted: sum(completed) };
  }, [requests, config]);

  /* last 7 days and last 6 months, always */
  const week = useMemo(() => {
    const buckets = buildBuckets({ unit: 'day', count: 7 });
    const receivedMap = {};
    const completedMap = {};

    requests.forEach((item) => {
      const createdAt = dateFrom(item, CREATED);
      if (createdAt) {
        const key = bucketKey(createdAt, 'day');
        receivedMap[key] = (receivedMap[key] || 0) + 1;
      }

      if (DONE.includes(statusOf(item))) {
        const doneAt = dateFrom(item, FINISHED);
        if (doneAt) {
          const key = bucketKey(doneAt, 'day');
          completedMap[key] = (completedMap[key] || 0) + 1;
        }
      }
    });

    return {
      buckets,
      received: buckets.map((b) => receivedMap[b.key] || 0),
      completed: buckets.map((b) => completedMap[b.key] || 0),
    };
  }, [requests]);

  const months = useMemo(() => {
    const buckets = buildBuckets({ unit: 'month', count: 6 });
    const receivedMap = {};
    const completedMap = {};

    requests.forEach((item) => {
      const createdAt = dateFrom(item, CREATED);
      if (createdAt) {
        const key = bucketKey(createdAt, 'month');
        receivedMap[key] = (receivedMap[key] || 0) + 1;
      }

      if (DONE.includes(statusOf(item))) {
        const doneAt = dateFrom(item, FINISHED);
        if (doneAt) {
          const key = bucketKey(doneAt, 'month');
          completedMap[key] = (completedMap[key] || 0) + 1;
        }
      }
    });

    return {
      buckets,
      received: buckets.map((b) => receivedMap[b.key] || 0),
      completed: buckets.map((b) => completedMap[b.key] || 0),
    };
  }, [requests]);

  const analysis = useMemo(() => {
    const total = requests.length;
    const segments = GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      color: g.color,
      value: requests.filter((item) => g.match.includes(statusOf(item))).length,
    }));

    const completedCount = segments[0].value;

    const categoryMap = {};
    requests.forEach((item) => {
      const name = pretty(item.assistance_type || item.category) || 'General';
      categoryMap[name] = (categoryMap[name] || 0) + 1;
    });

    const categories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = startOfDay - 6 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    requests.forEach((item) => {
      const createdAt = dateFrom(item, CREATED);
      if (!createdAt) return;
      const time = createdAt.getTime();
      if (time >= startOfDay) today += 1;
      if (time >= weekAgo) thisWeek += 1;
      if (time >= monthStart) thisMonth += 1;
    });

    const recent = [...requests]
      .map((item) => ({ item, date: dateFrom(item, CREATED) }))
      .filter((entry) => entry.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);

    return {
      total,
      segments,
      categories,
      completedCount,
      openCount: total - completedCount,
      completionRate: total ? Math.round((completedCount / total) * 100) : 0,
      periods: [
        { label: 'Day', letter: 'D', value: today },
        { label: 'Week', letter: 'W', value: thisWeek },
        { label: 'Month', letter: 'M', value: thisMonth },
      ],
      recent,
    };
  }, [requests]);

  /* moving highlights */
  const n = series.buckets.length;
  const areaIndex = Math.min(hover ?? tick % n, n - 1);
  const weekIndex = tick % week.buckets.length;
  const monthIndex = Math.min(picked ?? tick % months.buckets.length, months.buckets.length - 1);

  const periodMax = Math.max(...analysis.periods.map((p) => p.value), 1);
  const today = new Date();
  const pendingCount = analysis.segments[1].value;
  const progressCount = analysis.segments[2].value;

  if (loading) {
    return (
      <section className="ma-section">
        <div className="ma-card"><div className="ma-empty">Loading analytics...</div></div>
      </section>
    );
  }

  if (error && requests.length === 0) {
    return (
      <section className="ma-section">
        <div className="ma-card">
          <div className="ma-empty">
            Unable to load analytics. {error}
            {onRefresh ? (
              <div>
                <button type="button" className="ma-retry" onClick={() => onRefresh()}>Retry</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ma-section">
      <div className="ma-title">
        <div>
          <h3>Dashboard Analytics</h3>
          <p>Live view of your department requests.</p>
        </div>
        <LiveBadge updatedAt={updatedAt} />
      </div>

      <div className="ma-board">
        <div className="ma-main">
          {/* completion ring */}
          <div className="ma-card ma-c-ring">
            <CardHead title="Completion" note="Completed requests" />
            <div className="ma-ring-wrap">
              <Ring percent={analysis.completionRate} hasData={analysis.total > 0} />
              <div className="ma-ring-center"><strong><Num value={analysis.completionRate} suffix="%" /></strong></div>
            </div>
            <div className="ma-keys">
              <span><i style={{ background: C.blue }} />Completed<strong><Num value={analysis.completedCount} /></strong></span>
              <span><i style={{ background: C.amber }} />Open<strong><Num value={analysis.openCount} /></strong></span>
            </div>
          </div>

          {/* last 7 days line */}
          <div className="ma-card ma-c-line">
            <CardHead title="This week" note="Received and completed" />
            <WeekLine buckets={week.buckets} received={week.received} completed={week.completed} active={weekIndex} />
            <div className="ma-keys">
              <span><i style={{ background: C.blue }} />Received</span>
              <span><i style={{ background: C.amber }} />Completed</span>
            </div>
          </div>

          {/* status mix */}
          <div className="ma-card ma-c-mix">
            <CardHead title="Status mix" note="Share of requests by status" />
            <div className="ma-tracked">
              <span>All tracked</span>
              <strong><Num value={analysis.total} /></strong>
            </div>
            <div className="ma-tracked-line"><i style={{ width: `${analysis.completionRate}%` }} /></div>

            <div className="ma-segbar" role="img" aria-label="Requests by status">
              {analysis.total === 0 ? (
                <div className="ma-seg-block ma-seg-empty" style={{ flexGrow: 1 }} />
              ) : (
                analysis.segments.map((s, i) => (
                  <div
                    key={s.key}
                    className="ma-seg-block"
                    style={{ flexGrow: s.value, background: s.color, '--i': i, '--h': `${[100, 78, 90, 64][i]}%` }}
                  />
                ))
              )}
            </div>

            <div className="ma-radios">
              {analysis.segments.map((s) => (
                <span key={s.key}><i style={{ background: s.color }} />{s.label}<strong><Num value={s.value} /></strong></span>
              ))}
            </div>
          </div>

          {/* general stats (area chart) */}
          <div className="ma-card ma-c-stats">
            <CardHead title="General stats" note="Hover or tap the chart to explore.">
              <div className="ma-range" role="group" aria-label="Select time range">
                {RANGES.map((r) => (
                  <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </CardHead>

            <div className="ma-keys">
              <span><i style={{ background: C.blue }} />Received<strong><Num value={series.totalReceived} /></strong></span>
              <span><i style={{ background: C.amber }} />Completed<strong><Num value={series.totalCompleted} /></strong></span>
            </div>

            <LiveAreaChart
              key={range}
              buckets={series.buckets}
              received={series.received}
              completed={series.completed}
              shown={areaIndex}
              onHover={setHover}
              onLeave={() => setHover(null)}
            />
          </div>

          {/* main schedule (grouped bars) */}
          <div className="ma-card ma-c-bars">
            <CardHead title="Last 7 days" note="Received and completed per day" />
            <GroupedBars buckets={week.buckets} received={week.received} completed={week.completed} active={weekIndex} />
            <div className="ma-keys">
              <span><i style={{ background: C.blue }} />Received</span>
              <span><i style={{ background: C.amber }} />Completed</span>
            </div>
          </div>

          {/* categories (arch bars) */}
          <div className="ma-card ma-c-cat">
            <CardHead title="Requests by type" note="Category: assistance type" />
            {analysis.categories.length === 0 ? (
              <div className="ma-empty">No category data yet.</div>
            ) : (
              <ArchBars data={analysis.categories} />
            )}
          </div>

          {/* month slider */}
          <div className="ma-card ma-c-slider">
            <CardHead title="Monthly view" note="Drag the marker to look at a month" />
            <MonthSlider months={months} index={monthIndex} onPick={setPicked} />
            <div className="ma-slider-note">
              <strong>{months.buckets[monthIndex].full}</strong>
              <span><i style={{ background: C.blue }} />Received {months.received[monthIndex]}</span>
              <span><i style={{ background: C.amber }} />Completed {months.completed[monthIndex]}</span>
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="ma-side">
          <div className="ma-card ma-c-overview">
            <CardHead title="Overview" note="New requests" />

            <div className="ma-trio">
              {analysis.periods.map((p) => (
                <div key={p.label}>
                  <strong><Num value={p.value} /></strong>
                  <span>{p.label === 'Day' ? 'Today' : `This ${p.label.toLowerCase()}`}</span>
                </div>
              ))}
            </div>

            <div className="ma-gauge-wrap">
              <Gauge percent={analysis.completionRate} />
              <div className="ma-gauge-value"><Num value={analysis.completionRate} suffix="%" /></div>
              <small>Completion rate</small>
            </div>

            <div className="ma-date">
              <div className="ma-date-day">
                <span>{today.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</span>
                <strong>{today.getDate()}</strong>
              </div>
              <div className="ma-date-events">
                <div className="ma-event ma-event-amber">
                  <b>{pendingCount} pending review</b>
                  <small>Waiting for the manager</small>
                </div>
                <div className="ma-event ma-event-teal">
                  <b>{progressCount} in progress</b>
                  <small>Being handled by staff</small>
                </div>
              </div>
            </div>
          </div>

          <div className="ma-card ma-c-periods">
            <CardHead title="Account" note="New requests per period" />
            <div className="ma-periods">
              {analysis.periods.map((p, i) => (
                <div className="ma-period" key={p.label}>
                  <span className="ma-period-icon">{p.letter}</span>
                  <div className="ma-period-body">
                    <div className="ma-period-top">
                      <span>{p.label}</span>
                      <strong><Num value={p.value} /></strong>
                    </div>
                    <div className="ma-track">
                      <div className="ma-fill" style={{ width: `${(p.value / periodMax) * 100}%`, '--i': i }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ma-card ma-c-vertical">
            <CardHead title="Daily activity" note="Light: received, dark: completed" />
            <VerticalBars buckets={week.buckets} received={week.received} completed={week.completed} active={weekIndex} />
          </div>
        </div>
      </div>

      {/* live feed */}
      <div className="ma-card ma-c-feed">
        <CardHead title="Live activity" note="The newest requests, most recent first." />

        {analysis.recent.length === 0 ? (
          <div className="ma-empty">No requests yet.</div>
        ) : (
          <ul className="ma-feed">
            {analysis.recent.map(({ item, date }, i) => {
              const status = statusOf(item);
              const group = GROUPS.find((g) => g.match.includes(status));
              const name = item.full_name || item.applicant_name || item.title || item.subject || 'Citizen request';

              return (
                <li className="ma-feed-item" style={{ '--i': i }} key={item.id ?? i}>
                  <i className="ma-feed-dot" style={{ background: group?.color || C.soft }} />
                  <div>
                    <strong>{name}</strong>
                    <span>{item.id ? `#${item.id}` : '-'} · {pretty(item.assistance_type || item.category) || 'General'}</span>
                  </div>
                  <em style={{ color: group?.color || C.soft }}>{pretty(status) || 'Unknown'}</em>
                  <time>{timeAgo(date)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}