import { useState } from "react";
import { useAuth } from "./auth-context";
import { Eye, EyeOff, Shield, Lock, Mail } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@company.com", password: "admin123", note: "All 5 systems", color: "#ef4444", bg: "#fee2e2" },
  { label: "Manager", email: "manager@company.com", password: "manager123", note: "Systems A, B, C", color: "#7c3aed", bg: "#ede9fe" },
  { label: "Viewer", email: "user@company.com", password: "user123", note: "Systems A, D", color: "#0891b2", bg: "#cffafe" },
  { label: "Ops Lead", email: "ops@company.com", password: "ops123", note: "Systems A, D, E", color: "#059669", bg: "#d1fae5" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fillDemo = (d: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(d.email);
    setPassword(d.password);
    setError("");
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error ?? "Login failed.");
  };

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "var(--font-family-base)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12" style={{ background: "#0f172a" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span style={{ color: "#e2e8f0", fontFamily: "var(--font-family-mono)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
            NEXUS / PORTAL
          </span>
        </div>

        <div>
          <h1 className="text-white mb-4" style={{ fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.15 }}>
            One login.<br />Every system.
          </h1>
          <p className="text-slate-400 mb-10" style={{ fontSize: "1rem", lineHeight: 1.6 }}>
            Unified access control across all platforms. Your role determines which systems you can enter and what you can do inside them.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "System A", tag: "Operations", color: "#2563eb" },
              { label: "System B", tag: "Finance", color: "#7c3aed" },
              { label: "System C", tag: "CRM", color: "#0891b2" },
              { label: "System D", tag: "Inventory", color: "#059669" },
              { label: "System E", tag: "IT", color: "#d97706" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-2 h-2 rounded-full mb-2" style={{ background: s.color }} />
                <p className="text-white" style={{ fontSize: "0.8rem", fontWeight: 500 }}>{s.label}</p>
                <p className="text-slate-500" style={{ fontSize: "0.72rem" }}>{s.tag}</p>
              </div>
            ))}
            <div className="p-3 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <p className="text-slate-600" style={{ fontSize: "0.72rem", fontFamily: "var(--font-family-mono)", letterSpacing: "0.06em" }}>
                ROLE-GATED
              </p>
            </div>
          </div>
        </div>

        <p className="text-slate-600" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem" }}>
          © 2026 Nexus Systems — v4.2.1
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.8rem", letterSpacing: "0.05em", color: "#0e1117" }}>
              NEXUS / PORTAL
            </span>
          </div>

          <h2 className="text-foreground mb-1" style={{ fontSize: "1.6rem", fontWeight: 700 }}>Sign in</h2>
          <p className="text-muted-foreground mb-7" style={{ fontSize: "0.9rem" }}>
            You'll see only the systems you're authorized to access.
          </p>

          {/* Demo accounts */}
          <div className="mb-6 p-4 rounded-xl border border-border" style={{ background: "#f8fafc" }}>
            <p className="text-muted-foreground mb-3" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.68rem", letterSpacing: "0.08em" }}>
              DEMO ACCOUNTS
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d)}
                  className="text-left p-2.5 rounded-lg border border-border bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                >
                  <p style={{ fontSize: "0.78rem", fontWeight: 600, color: d.color }}>{d.label}</p>
                  <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 1 }}>{d.note}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: "0.85rem", fontWeight: 500 }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  style={{ fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: "0.85rem", fontWeight: 500 }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  style={{ fontSize: "0.9rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600" style={{ fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
