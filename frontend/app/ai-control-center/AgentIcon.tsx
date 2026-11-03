const paths: Record<string, string[]> = {
  overview: ["M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"],
  agents: ["M9 4h6l2 4h4v12H3V8h4z", "M3 12h18 M10 12v3h4v-3"],
  analysis: ["m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z"],
  approvals: ["m5 12 4 4L19 6"],
  reports: ["M6 3h9l4 4v14H6z", "M14 3v5h5 M9 12h7 M9 16h7"],
  settings: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    "m10 3-1 3-3 1-3 1v3l3 1 1 3 1 3h3l1-3 3-1 3-1v-3l-3-1-1-3-1-3z",
  ],
  security: ["m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z", "m8 12 3 3 5-6"],
  qa: ["M9 3h6v4H9z", "M9 5H5v16h14V5h-4 M8 13l3 3 5-6"],
  developer: ["m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18"],
  ux: ["m4 16 12-12 4 4-12 12H4z M13 7l4 4"],
  product: ["m12 3 9 5-9 5-9-5z M3 8v9l9 5 9-5V8 M12 13v9"],
  marketing: ["M4 10v6h4l11 4V6L8 10z M8 16l2 5 M19 10l3-1 M19 16l3 1"],
  sales: ["m4 16 6-6 4 4 7-9 M15 5h6v6"],
  support: [
    "M4 14v-3a8 8 0 0 1 16 0v3 M4 12H2v6h4v-6z M20 12h2v6h-4v-6z M20 18c0 3-4 3-8 3",
  ],
  finance: ["M3 6h18v14H3z M3 10h18 M16 15h2"],
  analytics: ["M4 3v18h18 M8 16v-4 M13 16V8 M18 16V5"],
  crm: [
    "M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M2 21v-5a5 5 0 0 1 10 0v5 M17 8a3 3 0 0 1 0 6 M17 17a4 4 0 0 1 4 4",
  ],
  menu: ["M4 6h16 M4 12h16 M4 18h16"],
  close: ["m6 6 12 12 M18 6 6 18"],
};
export default function AgentIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {(paths[name] ?? paths.agents).map((d, i) => (
        <path d={d} key={i} />
      ))}
    </svg>
  );
}
