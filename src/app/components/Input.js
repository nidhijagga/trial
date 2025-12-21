export function Input({ label, id, className = "", ...props }) {
  const inputEl = <input id={id} className={["input", className].join(" ")} {...props} />;
  if (!label) return inputEl;
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
      {inputEl}
    </label>
  );
}
