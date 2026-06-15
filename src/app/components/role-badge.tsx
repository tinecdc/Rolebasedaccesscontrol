import { Role } from "./auth-context";

const config: Record<Role, { label: string; bg: string; text: string; dot: string }> = {
  admin:   { label: "ADMIN",   bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  manager: { label: "MANAGER", bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  viewer:  { label: "VIEWER",  bg: "#e0f2fe", text: "#0369a1", dot: "#38bdf8" },
};

export function RoleBadge({ role, size = "sm" }: { role: Role; size?: "sm" | "md" }) {
  const c = config[role];
  const padding = size === "md" ? "4px 10px" : "2px 8px";
  const fontSize = size === "md" ? "0.72rem" : "0.65rem";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{ background: c.bg, color: c.text, padding, fontFamily: "var(--font-family-mono)", fontSize, letterSpacing: "0.08em", fontWeight: 600 }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}
