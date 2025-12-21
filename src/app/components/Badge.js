export function Badge({ children, variant = "primary", className = "" }) {
  return <span className={[`badge`, `badge-${variant}`, className].join(" ")}>{children}</span>;
}
