import { useState } from "react";

export function Tabs({ items = [], accent = "primary" }) {
  const [active, setActive] = useState(0);
  return (
    <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--color-" + accent + "-border)" }}>
      {items.map((label, idx) => (
        <button
          key={label}
          onClick={() => setActive(idx)}
          className={["btn", "btn-sm", "btn-outline", `btn-${accent}`].join(" ")}
          style={
            active === idx
              ? { borderBottom: `3px solid var(--color-${accent}-bg)`, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
