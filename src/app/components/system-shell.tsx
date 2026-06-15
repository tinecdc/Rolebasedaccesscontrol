import { useState } from "react";
import { useAuth, SYSTEMS, SystemId, Role } from "./auth-context";
import { RoleBadge } from "./role-badge";
import {
  LayoutDashboard, FileText, BarChart3, Settings, Users,
  ChevronLeft, ChevronRight, Shield, Bell,
} from "lucide-react";
import { SystemDashboard } from "./system-dashboard";

type SystemPage = "dashboard" | "reports" | "analytics" | "users" | "settings" | "notifications";

const NAV_ITEMS: { id: SystemPage; label: string; icon: React.ElementType; minRole: Role | null }[] = [
  { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard, minRole: null },
  { id: "analytics",     label: "Analytics",    icon: BarChart3,       minRole: "manager" },
  { id: "reports",       label: "Reports",      icon: FileText,        minRole: null },
  { id: "users",         label: "Users",        icon: Users,           minRole: "admin" },
  { id: "notifications", label: "Alerts",       icon: Bell,            minRole: null },
  { id: "settings",      label: "Settings",     icon: Settings,        minRole: "manager" },
];

const ROLE_RANK: Record<Role, number> = { viewer: 0, manager: 1, admin: 2 };
function hasAccess(userRole: Role, minRole: Role | null) {
  if (!minRole) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

interface SystemShellProps {
  systemId: SystemId;
  onBack: () => void;
}

export function SystemShell({ systemId, onBack }: SystemShellProps) {
  const { currentUser, getSystemAccess } = useAuth();
  const [activePage, setActivePage] = useState<SystemPage>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const sys = SYSTEMS[systemId];
  const access = getSystemAccess(systemId);
  if (!currentUser || !access) return null;

  const visibleNav = NAV_ITEMS.filter((n) => hasAccess(access.role, n.minRole));

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "var(--font-family-base)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col h-full shrink-0 transition-all duration-200"
        style={{ width: collapsed ? 60 : 220, background: "#0f172a" }}
      >
        {/* Back + system identity */}
        <div className="px-3 py-4 border-b border-white/5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-4 text-slate-400 hover:text-white transition-colors"
            style={{ fontSize: "0.78rem" }}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            {!collapsed && <span>All Systems</span>}
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: sys.color }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white truncate" style={{ fontSize: "0.82rem", fontWeight: 600 }}>{sys.label}</p>
                <p className="text-slate-500 truncate" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
                  {sys.tag.toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                title={collapsed ? item.label : undefined}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all"
                style={{
                  background: active ? `${sys.color}30` : "transparent",
                  color: active ? "#f1f5f9" : "#64748b",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? sys.color : undefined }} />
                {!collapsed && <span style={{ fontSize: "0.85rem", fontWeight: active ? 500 : 400 }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div className="px-2 py-3 border-t border-white/5 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#1e40af", color: "#bfdbfe", fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", fontWeight: 600 }}
              >
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white truncate" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{currentUser.name.split(" ")[0]}</p>
                <RoleBadge role={access.role} />
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-lg transition-colors text-slate-500 hover:text-white hover:bg-white/5"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-background">
        <SystemDashboard systemId={systemId} page={activePage} role={access.role} />
      </main>
    </div>
  );
}
