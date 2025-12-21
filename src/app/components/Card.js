export function Card({ children, accent = "primary", className = "" }) {
	const accentCls = `accent-${accent}`;
	return <div className={["card", accentCls, className].join(" ")}>{children}</div>;
}
