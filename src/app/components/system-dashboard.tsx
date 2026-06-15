import { SystemId, SYSTEMS, Role } from "./auth-context";
import { CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Lock } from "lucide-react";

type SystemPage = "dashboard" | "reports" | "analytics" | "users" | "settings" | "notifications";

const SYSTEM_DATA: Record<SystemId, {
  stats: { label: string; value: string; sub: string; color: string }[];
  activity: { action: string; time: string; status: "ok" | "warn" | "info" }[];
}> = {
  "system-a": {
    stats: [
      { label: "Active Workflows", value: "142", sub: "+8 today", color: "#2563eb" },
      { label: "Tasks Completed", value: "1,084", sub: "This month", color: "#059669" },
      { label: "Pending Review", value: "23", sub: "Awaiting approval", color: "#d97706" },
      { label: "Uptime", value: "99.8%", sub: "Last 30 days", color: "#7c3aed" },
    ],
    activity: [
      { action: "Workflow WF-204 completed successfully", time: "2m ago", status: "ok" },
      { action: "Task #1092 escalated to manager", time: "18m ago", status: "warn" },
      { action: "Batch process started — 340 records", time: "45m ago", status: "info" },
      { action: "Auto-approval triggered for PO #8812", time: "1h ago", status: "ok" },
    ],
  },
  "system-b": {
    stats: [
      { label: "Total Budget", value: "$4.2M", sub: "FY 2026", color: "#7c3aed" },
      { label: "Spent YTD", value: "$1.9M", sub: "45% utilized", color: "#059669" },
      { label: "Open Invoices", value: "37", sub: "$284K outstanding", color: "#d97706" },
      { label: "Forecasted Variance", value: "-2.1%", sub: "Below target", color: "#0891b2" },
    ],
    activity: [
      { action: "Invoice INV-2291 approved — $42,000", time: "5m ago", status: "ok" },
      { action: "Budget overage warning: Dept. 04", time: "1h ago", status: "warn" },
      { action: "Q2 reconciliation report generated", time: "3h ago", status: "info" },
      { action: "Payment batch processed — 12 vendors", time: "5h ago", status: "ok" },
    ],
  },
  "system-c": {
    stats: [
      { label: "Active Accounts", value: "3,412", sub: "+22 this week", color: "#0891b2" },
      { label: "Open Tickets", value: "89", sub: "14 high priority", color: "#d97706" },
      { label: "Avg Resolution", value: "4.2h", sub: "Last 7 days", color: "#059669" },
      { label: "NPS Score", value: "72", sub: "↑ 4 pts vs last month", color: "#7c3aed" },
    ],
    activity: [
      { action: "Account ACC-8801 upgraded to Enterprise", time: "10m ago", status: "ok" },
      { action: "SLA breach risk: Ticket #4421", time: "30m ago", status: "warn" },
      { action: "New account onboarding started", time: "2h ago", status: "info" },
      { action: "Renewal processed for 14 accounts", time: "4h ago", status: "ok" },
    ],
  },
  "system-d": {
    stats: [
      { label: "SKUs Tracked", value: "8,204", sub: "Across 6 warehouses", color: "#059669" },
      { label: "Low Stock Alerts", value: "17", sub: "Requires reorder", color: "#d97706" },
      { label: "Orders In Transit", value: "234", sub: "Est. delivery on time", color: "#2563eb" },
      { label: "Inventory Value", value: "$12.4M", sub: "Current stock", color: "#7c3aed" },
    ],
    activity: [
      { action: "Reorder triggered: SKU-0421 (Paper A4)", time: "8m ago", status: "info" },
      { action: "Shipment SHP-9910 delivered", time: "40m ago", status: "ok" },
      { action: "Stock discrepancy found: WH-3", time: "2h ago", status: "warn" },
      { action: "Purchase order PO-3302 approved", time: "3h ago", status: "ok" },
    ],
  },
  "system-e": {
    stats: [
      { label: "Open Tickets", value: "52", sub: "8 critical", color: "#d97706" },
      { label: "Systems Monitored", value: "148", sub: "All online", color: "#059669" },
      { label: "Incidents This Week", value: "3", sub: "2 resolved", color: "#ef4444" },
      { label: "Avg Response Time", value: "18min", sub: "SLA: 30min", color: "#2563eb" },
    ],
    activity: [
      { action: "Critical: DB server CPU > 90%", time: "Just now", status: "warn" },
      { action: "Ticket TKT-2201 resolved", time: "22m ago", status: "ok" },
      { action: "SSL cert renewal: 14 days left", time: "1h ago", status: "warn" },
      { action: "Patch deployment completed: 48 hosts", time: "4h ago", status: "ok" },
    ],
  },
};

const statusIcon = (s: "ok" | "warn" | "info") => {
  if (s === "ok")   return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (s === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Clock className="w-4 h-4 text-blue-400 shrink-0" />;
};

interface Props {
  systemId: SystemId;
  page: SystemPage;
  role: Role;
}

export function SystemDashboard({ systemId, page, role }: Props) {
  const sys = SYSTEMS[systemId];
  const data = SYSTEM_DATA[systemId];

  const canEdit = role === "admin" || role === "manager";

  if (page !== "dashboard") {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]" style={{ fontFamily: "var(--font-family-base)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: sys.accentBg }}>
          {role === "viewer" && page === "analytics" ? (
            <Lock className="w-6 h-6" style={{ color: sys.color }} />
          ) : (
            <div className="w-4 h-4 rounded-full" style={{ background: sys.color }} />
          )}
        </div>
        <h2 className="text-foreground mb-2" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {page.charAt(0).toUpperCase() + page.slice(1)}
        </h2>
        <p className="text-muted-foreground text-center max-w-xs" style={{ fontSize: "0.875rem" }}>
          {role === "viewer" && (page === "analytics" || page === "settings")
            ? "You need Manager or Admin access to view this section."
            : `${sys.label} ${page} module. Content from ${sys.tag} team.`}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-[960px]" style={{ fontFamily: "var(--font-family-base)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2.5 py-0.5 rounded-full text-white"
              style={{ background: sys.color, fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.08em" }}
            >
              {sys.tag.toUpperCase()}
            </span>
            {!canEdit && (
              <span className="px-2.5 py-0.5 rounded-full text-slate-500 border border-dashed border-slate-300" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                READ ONLY
              </span>
            )}
          </div>
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{sys.label} — Overview</h1>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.875rem" }}>{sys.description}</p>
        </div>
        {canEdit && (
          <button
            className="px-4 py-2 rounded-xl text-white transition-colors"
            style={{ background: sys.color, fontSize: "0.85rem", fontWeight: 500 }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            + New Entry
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {data.stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border border-border hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.75rem" }}>{s.label}</p>
            <p style={{ fontSize: "0.68rem", color: s.color, marginTop: 4, fontFamily: "var(--font-family-mono)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-foreground mb-1" style={{ fontSize: "1rem", fontWeight: 600 }}>Recent Activity</h2>
        <p className="text-muted-foreground mb-5" style={{ fontSize: "0.8rem" }}>Latest events in {sys.label}.</p>
        <div className="space-y-3">
          {data.activity.map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border last:border-0">
              {statusIcon(item.status)}
              <p className="flex-1 text-foreground" style={{ fontSize: "0.85rem" }}>{item.action}</p>
              <span className="text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem" }}>
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
