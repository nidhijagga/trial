import { darken, lighten } from "./utils/colorUtils";

export function generateThemeTokens(palette) {
	const build = (hex) => ({
		bg: hex,
		hover: darken(hex, 8),
		active: darken(hex, 14),
		text: "#ffffff",
		border: darken(hex, 18),
		subtle: lighten(hex, 42),
		subtleText: "#111111",
		ring: lighten(hex, 28),
		ghost: lighten(hex, 48),
	});

	return {
		primary: build(palette.primary),
		secondary: build(palette.secondary),
		tertiary: build(palette.tertiary ?? lighten(palette.secondary, 10)),
	};
}
