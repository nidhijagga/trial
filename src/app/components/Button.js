export function Button({ children, variant = "primary", outline = false, size = "md", className = "", ...props }) {
	const base = "btn";
	const v = `btn-${variant}`;
	const s = `btn-${size}`;
	const outlineCls = outline ? "btn-outline" : "";
	return (
		<button className={[base, s, v, outlineCls, className].filter(Boolean).join(" ")} {...props}>
			{children}
		</button>
	);
}
