// Converts hex to RGB
function hexToRgb(hex) {
	hex = hex.replace("#", "");
	const bigint = parseInt(hex, 16);
	return {
		r: (bigint >> 16) & 255,
		g: (bigint >> 8) & 255,
		b: bigint & 255,
	};
}

// Converts RGB to hex
function rgbToHex(r, g, b) {
	return (
		"#" +
		[r, g, b]
			.map((x) =>
				Math.max(0, Math.min(255, Math.round(x)))
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

// Darken color by percentage
export function darken(hex, percent) {
	const { r, g, b } = hexToRgb(hex);
	const factor = 1 - percent / 100;
	return rgbToHex(r * factor, g * factor, b * factor);
}

// Lighten color by percentage
export function lighten(hex, percent) {
	const { r, g, b } = hexToRgb(hex);
	const factor = percent / 100;
	return rgbToHex(
		r + (255 - r) * factor,
		g + (255 - g) * factor,
		b + (255 - b) * factor
	);
}
