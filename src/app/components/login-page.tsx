import { useEffect, useState } from "react";
import { SystemCatalogItem, useAuth } from "./auth-context";
import { Eye, EyeOff, Shield, Lock, Mail } from "lucide-react";
import ndcLogo from "../../../assets/NDC_LOGO.png";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@company.com", password: "admin123", note: "All 5 systems", color: "#ef4444", bg: "#fee2e2" },
  { label: "Manager", email: "manager@company.com", password: "manager123", note: "Systems A, B, C", color: "#7c3aed", bg: "#ede9fe" },
  { label: "Viewer", email: "user@company.com", password: "user123", note: "Systems A, D", color: "#0891b2", bg: "#cffafe" },
  { label: "Ops Lead", email: "ops@company.com", password: "ops123", note: "Systems A, D, E", color: "#059669", bg: "#d1fae5" },
];

export function LoginPage() {
  const { login, refreshSystemCatalog, systemCatalog } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [notice, setNotice] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    void refreshSystemCatalog();
  }, [refreshSystemCatalog]);

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

  const handleForgotPassword = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (!email || !newPassword) {
        setError("Provide your email and a new password.");
        return;
      }

      if (!resetToken) {
        const tokenRes = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const tokenData = (await tokenRes.json()) as { success?: boolean; message?: string; resetToken?: string; error?: string };

        if (!tokenRes.ok || !tokenData.success || !tokenData.resetToken) {
          setError(tokenData.error ?? "Unable to request a reset token.");
          return;
        }

        setResetToken(tokenData.resetToken);
        setNotice(tokenData.message ?? "Reset token created. Completing the password update...");
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: resetToken, password: newPassword }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success) {
        setNotice(data.message ?? "Password updated successfully.");
        setMode("signin");
        setPassword("");
        setResetToken("");
        setNewPassword("");
      } else {
        setError(data.error ?? "Unable to process your request.");
      }
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ fontFamily: "var(--font-family-base)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12" style={{ background: "#0f172a" }}>
        <div className="flex items-center gap-3">
          <span style={{ color: "#e2e8f0", fontFamily: "var(--font-family-mono)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
            {/* PORTAL */}
          </span>
          <img
            src={ndcLogo}
            alt="NDC Logo"
            className="w-full h-full object-contain flex items-center justify-center"
          />
        </div>

        <div>
          <h1 className="text-white mb-4" style={{ fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.15 }}>
            One login.<br />Every system.
          </h1>
          <p className="text-slate-400 mb-10" style={{ fontSize: "1rem", lineHeight: 1.6 }}>
            Unified access control across all platforms. Your role determines which systems you can enter and what you can do inside them.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {systemCatalog.map((s: SystemCatalogItem) => (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
          © 2026 National Development Company — v1.0.0
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-background">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.8rem", letterSpacing: "0.05em", color: "#0e1117" }}>
              National Development Company / PORTAL
            </span>
          </div>

          <h2 className="text-foreground mb-1" style={{ fontSize: "1.6rem", fontWeight: 700 }}>{mode === "signin" ? "Sign in" : "Reset password"}</h2>
          <p className="text-muted-foreground mb-7" style={{ fontSize: "0.9rem" }}>
            {mode === "signin"
              ? "You'll see only the systems you're authorized to access."
              : "Enter your email to generate a reset token for the demo backend."}
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

          <form onSubmit={mode === "signin" ? handleSubmit : (ev) => { ev.preventDefault(); void handleForgotPassword(); }} className="space-y-4">
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

            {mode === "signin" ? (
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
            ) : (
              <>
                <div>
                  <label className="block text-foreground mb-1.5" style={{ fontSize: "0.85rem", fontWeight: 500 }}>Reset token</label>
                  <input
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    placeholder="Paste the token from the backend"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label className="block text-foreground mb-1.5" style={{ fontSize: "0.85rem", fontWeight: 500 }}>New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Choose a new password"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600" style={{ fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            {notice && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700" style={{ fontSize: "0.85rem" }}>
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              style={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              {loading ? (mode === "signin" ? "Signing in…" : "Sending…") : mode === "signin" ? "Sign in" : "Send reset token"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "forgot" : "signin"); setError(""); setNotice(""); }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            {mode === "signin" ? "Forgot password?" : "Back to sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
