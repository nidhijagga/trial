export function Table({ accent = "primary" }) {
	return (
		<table className={["table", `variant-${accent}`].join(" ")}>
			<thead>
				<tr>
					<th>Name</th>
					<th>Role</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Nidhi</td>
					<td>Developer</td>
				</tr>
			</tbody>
		</table>
	);
}
