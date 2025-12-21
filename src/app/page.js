"use client"
import { useEffect, useMemo, useState } from "react";
import { generateThemeTokens } from "./themeGenerator";
import { applyTheme } from "./middleware";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { Table } from "./components/Table";
import { Modal } from "./components/Modal";
import { Badge } from "./components/Badge";
import { Alert } from "./components/Alert";
import { Input } from "./components/Input";
import { Switch } from "./components/Switch";
import { Tabs } from "./components/Tabs";

export default function Home() {
	const presetA = useMemo(() => ({ primary: "#4F46E5", secondary: "#22C55E", tertiary: "#F59E0B" }), []); // indigo, green, amber
	const presetB = useMemo(() => ({ primary: "#2563EB", secondary: "#EC4899", tertiary: "#14B8A6" }), []); // blue, pink, teal
	const [palette, setPalette] = useState(presetA);

	useEffect(() => {
		const tokens = generateThemeTokens(palette);
		applyTheme(tokens);
	}, [palette]);

	return (
		<div style={{ display: "grid", gap: 20, padding: 24, maxWidth: 1000 }}>
			<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
				<span style={{ fontWeight: 600 }}>Theme presets:</span>
				<Button size="sm" variant="primary" onClick={() => setPalette(presetA)}>Indigo/Green/Amber</Button>
				<Button size="sm" variant="secondary" onClick={() => setPalette(presetB)}>Blue/Pink/Teal</Button>
				<Button size="sm" outline variant="tertiary" onClick={() => setPalette(prev => ({...prev}))}>Re-apply</Button>
				<div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
					<Badge variant="primary">primary {palette.primary}</Badge>
					<Badge variant="secondary">secondary {palette.secondary}</Badge>
					<Badge variant="tertiary">tertiary {palette.tertiary}</Badge>
				</div>
			</div>

			<Card accent="primary">
				<h3 style={{ marginTop: 0 }}>Buttons</h3>
				<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="tertiary">Tertiary</Button>
					<Button outline variant="primary">Outline Primary</Button>
					<Button outline variant="secondary">Outline Secondary</Button>
					<Button outline variant="tertiary">Outline Tertiary</Button>
					<Button size="sm" variant="primary">Small</Button>
					<Button size="lg" variant="primary">Large</Button>
				</div>
			</Card>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
				<Card accent="secondary">
					<h3 style={{ marginTop: 0 }}>Inputs & Switch</h3>
					<div style={{ display: "grid", gap: 12 }}>
						<Input id="name" label="Your name" placeholder="Jane Doe" />
						<Input id="email" label="Email" placeholder="jane@example.com" />
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<Switch />
							<span>Enable notifications</span>
						</div>
					</div>
				</Card>

				<Card accent="tertiary">
					<h3 style={{ marginTop: 0 }}>Alerts</h3>
					<div style={{ display: "grid", gap: 12 }}>
						<Alert variant="primary" title="Primary alert">This uses the primary palette.</Alert>
						<Alert variant="secondary" title="Secondary alert">Notice the secondary tones.</Alert>
						<Alert variant="tertiary" title="Tertiary alert">Subtle background and colored border.</Alert>
					</div>
				</Card>
			</div>

			<Modal title="Demo Modal" accent="secondary">Modal content themed with secondary border.</Modal>

			<Card accent="primary">
				<h3 style={{ marginTop: 0 }}>Tabs</h3>
				<div style={{ display: "grid", gap: 12 }}>
					<Tabs accent="primary" items={["Overview", "Details", "Settings"]} />
					<Tabs accent="secondary" items={["Today", "This Week", "This Month"]} />
					<Tabs accent="tertiary" items={["Alpha", "Beta", "Stable"]} />
				</div>
			</Card>

			<Card accent="primary">
				<h3 style={{ marginTop: 0 }}>Tables</h3>
				<div style={{ display: "grid", gap: 12 }}>
					<Table accent="primary" />
					<Table accent="secondary" />
					<Table accent="tertiary" />
				</div>
			</Card>
		</div>
	);
}
