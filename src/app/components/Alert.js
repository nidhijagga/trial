export function Alert({ title, children, variant = "primary", className = "" }) {
  return (
    <div className={["alert", `alert-${variant}`, className].join(" ")}>
      {title ? <h4>{title}</h4> : null}
      <div>{children}</div>
    </div>
  );
}
