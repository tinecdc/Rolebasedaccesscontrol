import { useAuth, SYSTEMS, SystemId } from "./auth-context";
import { RoleBadge } from "./role-badge";
import { ArrowRight, Lock, LogOut } from "lucide-react";

const ALL_SYSTEM_IDS: SystemId[] = ["system-a", "system-b", "system-c", "system-d", "system-e"];

interface PortalHomeProps {
  onEnterSystem: (id: SystemId) => void;
}

export function PortalHome({ onEnterSystem }: PortalHomeProps) {
  const { currentUser, logout } = useAuth();
  if (!currentUser) return null;

  const accessible = new Set(currentUser.systems.map((s) => s.systemId));

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-family-base)" }}>
      {/* Top bar */}
      <header className="border-b border-border bg-card px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.8rem", letterSpacing: "0.05em", color: "#0e1117" }}>
            NEXUS PORTAL
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#dbeafe", color: "#1d4ed8", fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", fontWeight: 600 }}
            >
              {currentUser.avatar}
            </div>
            <div>
              <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{currentUser.name}</p>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{currentUser.department}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            style={{ fontSize: "0.8rem" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[900px] mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-foreground mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.95rem" }}>
            You have access to <strong style={{ color: "#0e1117" }}>{currentUser.systems.length}</strong> of {ALL_SYSTEM_IDS.length} systems.
          </p>
        </div>

        {/* Accessible systems */}
        <div className="mb-4">
          <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "#9ca3af", marginBottom: 12 }}>
            YOUR SYSTEMS
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentUser.systems.map(({ systemId, role }) => {
              const sys = SYSTEMS[systemId];
              return (
                <button
                  key={systemId}
                  onClick={() => onEnterSystem(systemId)}
                  className="text-left p-5 bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: sys.accentBg }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ background: sys.color }} />
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                  <p className="text-foreground mb-1" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{sys.label}</p>
                  <p className="text-muted-foreground mb-3" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>{sys.description}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-white"
                      style={{ background: sys.color, fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.06em" }}
                    >
                      {sys.tag.toUpperCase()}
                    </span>
                    <RoleBadge role={role} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Locked systems */}
        {ALL_SYSTEM_IDS.some((id) => !accessible.has(id)) && (
          <div className="mt-8">
            <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "#d1d5db", marginBottom: 12 }}>
              NO ACCESS
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_SYSTEM_IDS.filter((id) => !accessible.has(id)).map((systemId) => {
                const sys = SYSTEMS[systemId];
                return (
                  <div
                    key={systemId}
                    className="p-5 rounded-2xl border border-dashed"
                    style={{ borderColor: "#e5e7eb", background: "#fafafa", opacity: 0.7 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-1" style={{ fontSize: "0.95rem", fontWeight: 500 }}>{sys.label}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>{sys.description}</p>
                    <p className="mt-3" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.62rem", letterSpacing: "0.06em", color: "#d1d5db" }}>
                      ACCESS RESTRICTED
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
