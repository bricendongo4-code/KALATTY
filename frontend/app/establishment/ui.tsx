import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./establishment.module.css";

/* ---------- Icônes (SVG en trait, sans dépendance) ---------- */
const ICONS: Record<string, string> = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar:
    "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  clipboard:
    "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  users:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 3 6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  userPlus:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M19 8v6M16 11h6",
  file: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  sliders:
    "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01",
  folder:
    "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  building: "M4 21V5l8-2 8 2v16M9 8h1M14 8h1M9 12h1M14 12h1M10 21v-4h4v4",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  check: "M5 12l5 5L20 7",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  plus: "M12 5v14M5 12h14",
  send: "M3 11l18-8-8 18-2-8z",
  play: "M7 4l13 8-13 8z",
  megaphone:
    "M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6",
  euro: "M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9",
  video: "M3 7h12v10H3zM15 11l6-3v8l-6-3",
  chevron: "M9 6l6 6-6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14L7 21l5-3 5 3-1.5-7",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  reply: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 6 6v3",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  logout: "M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10",
  refresh: "M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.7-2.1L20 9M4 15l2.2 3.1A7 7 0 0 0 18 16",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M3 3l18 18M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.7M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3-.4",
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name] ?? ICONS.file} />
    </svg>
  );
}

/* ---------- Avatars (initiales : pas de photos fictives) ---------- */
const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#ef4444",
  "#14b8a6",
];

export function Avatar({ name, size = 36, src }: { name: string; size?: number; src?: string }) {
  const initials = name
    .replace(/^(Mme|M\.|Prof\.|Professeur)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: src ? `${AVATAR_COLORS[hash % AVATAR_COLORS.length]} url(${src}) center/cover no-repeat` : AVATAR_COLORS[hash % AVATAR_COLORS.length],
      }}
      aria-hidden="true"
    >
      {src ? "" : initials}
    </span>
  );
}

/* ---------- Petites briques ---------- */
export type Tone = "blue" | "orange" | "violet" | "green" | "red" | "teal";

export function Card({
  title,
  link,
  children,
}: {
  title?: string;
  link?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      {title ? (
        <header className={styles.cardHead}>
          <h3>{title}</h3>
          {link ? (
            <Link href={link.href} className={styles.cardLink}>
              {link.label}
            </Link>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Kpi({
  icon,
  tone,
  value,
  label,
  trend,
  link,
}: {
  icon: string;
  tone: Tone;
  value: string;
  label: string;
  trend?: string;
  link?: { label: string; href: string };
}) {
  return (
    <article className={styles.kpi}>
      <span className={`${styles.kpiIcon} ${styles[`tone_${tone}`]}`}>
        <Icon name={icon} />
      </span>
      <span>
        <span className={styles.kpiNum}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
        {trend ? <span className={styles.kpiTrend}>{trend}</span> : null}
        {link ? (
          <Link href={link.href} className={styles.kpiLink}>
            {link.label}
          </Link>
        ) : null}
      </span>
    </article>
  );
}

export type BadgeKind =
  "live" | "ok" | "soon" | "info" | "urgent" | "bad" | "warn" | "pending";

export function Badge({
  kind,
  children,
}: {
  kind: BadgeKind;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.badge} ${styles[`b_${kind}`]}`}>{children}</span>
  );
}

export function Progress({
  value,
  color = "blue",
}: {
  value: number;
  color?: "blue" | "orange" | "green" | "red";
}) {
  return (
    <div
      className={styles.bar}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${styles.barFill} ${styles[`fill_${color}`]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function colorForValue(
  value: number,
): "green" | "blue" | "orange" | "red" {
  if (value >= 75) return "green";
  if (value >= 60) return "blue";
  if (value >= 45) return "orange";
  return "red";
}

/* ---------- Donut SVG ---------- */
export type Segment = { label: string; value: number; color: string };

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 150,
  showValues = true,
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  showValues?: boolean;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  const arcs = segments.map((s, i) => ({
    ...s,
    len: (s.value / total) * c,
    start:
      (segments.slice(0, i).reduce((sum, x) => sum + x.value, 0) / total) * c,
  }));
  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut} style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 140 140"
          width={size}
          height={size}
          role="img"
          aria-label={`${centerValue} ${centerLabel}`}
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#edf1f9"
            strokeWidth="16"
          />
          {arcs.map((s) => (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(s.len - 2, 0)} ${c}`}
              strokeDashoffset={-s.start}
              transform="rotate(-90 70 70)"
            />
          ))}
        </svg>
        <div className={styles.donutCenter}>
          <span>
            <strong>{centerValue}</strong>
            <br />
            <small>{centerLabel}</small>
          </span>
        </div>
      </div>
      <div className={styles.legend}>
        {segments.map((s) => (
          <div key={s.label} className={styles.legendRow}>
            <span
              className={styles.legendDot}
              style={{ background: s.color }}
            />
            <span>{s.label}</span>
            {showValues ? (
              <span className={styles.legendVal}>{s.value}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Courbe SVG ---------- */
export function LineChart({
  labels,
  values,
  color = "#4f46e5",
}: {
  labels: string[];
  values: number[];
  color?: string;
}) {
  const w = 420;
  const h = 170;
  const padL = 34;
  const padB = 24;
  const padT = 10;
  const max = Math.ceil(Math.max(...values) / 50) * 50;
  const min = Math.floor(Math.min(...values) / 50) * 50;
  const x = (i: number) => padL + (i * (w - padL - 8)) / (values.length - 1);
  const y = (v: number) =>
    padT + (1 - (v - min) / (max - min || 1)) * (h - padT - padB);
  const pts = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${padL},${h - padB} ${pts} ${x(values.length - 1).toFixed(1)},${h - padB}`;
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Évolution des connexions sur 7 jours"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} stroke="#e8edf7" />
          <text
            x={padL - 6}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#8a95b5"
          >
            {t}
          </text>
        </g>
      ))}
      <polygon points={area} fill={color} opacity="0.1" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r="3.2"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
        />
      ))}
      {labels.map((l, i) => (
        <text
          key={l}
          x={x(i)}
          y={h - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#8a95b5"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

/* ---------- Ligne de liste générique ---------- */
export function Row({
  lead,
  title,
  sub,
  side,
  chevron,
}: {
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  side?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <li className={styles.row}>
      {lead}
      <span className={styles.rowMain}>
        <strong>{title}</strong>
        {sub ? <small>{sub}</small> : null}
      </span>
      {side ? <span className={styles.rowSide}>{side}</span> : null}
      {chevron ? <Icon name="chevron" className={styles.chev} /> : null}
    </li>
  );
}

export function RowIcon({ icon, tone }: { icon: string; tone: Tone }) {
  return (
    <span className={`${styles.rowIcon} ${styles[`tone_${tone}`]}`}>
      <Icon name={icon} />
    </span>
  );
}

export function Todo({
  icon,
  tone,
  children,
  action,
}: {
  icon: string;
  tone: Tone;
  children: ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className={styles.todo}>
      <span className={`${styles.todoIcon} ${styles[`tone_${tone}`]}`}>
        <Icon name={icon} />
      </span>
      <span className={styles.todoText}>{children}</span>
      {action ? (
        <Link href={action.href} className={styles.todoAction}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
