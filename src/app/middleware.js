export function applyTheme(tokens) {
	const root = document.documentElement;
	console.log("tokens : ", tokens);
	Object.entries(tokens).forEach(([group, values]) => {
		Object.entries(values).forEach(([key, value]) => {
			root.style.setProperty(`--color-${group}-${key}`, value);
		});
	});
}
