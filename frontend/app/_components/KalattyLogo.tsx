/** Render the complete original artwork, without its large white canvas margins. */
export default function KalattyLogo({
  className,
  label = "Kalatty",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      className={className}
      role="img"
      aria-label={label}
      viewBox="660 555 710 620"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <image href="/kalatty-logo.png" width="2000" height="2000" />
    </svg>
  );
}
