export function Modal({ title, children, accent = "primary", className = "" }) {
	const accentCls = accent === "primary" ? "" : `accent-${accent}`;
	return (
		<div className={["modal", accentCls, className].filter(Boolean).join(" ")}>
			<h3>{title}</h3>
			{children}
		</div>
	);
}
