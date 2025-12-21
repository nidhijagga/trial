import { useState } from "react";

export function Switch({ defaultOn = false, onChange, className = "" }) {
  const [on, setOn] = useState(defaultOn);
  const toggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };
  return (
    <button type="button" onClick={toggle} className={["switch", on ? "on" : "", className].join(" ")} aria-pressed={on} />
  );
}
