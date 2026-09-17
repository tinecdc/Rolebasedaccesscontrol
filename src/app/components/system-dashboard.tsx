import { useEffect, useState } from "react";
import { SystemId, SYSTEMS, Role } from "./auth-context";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  FileText,
  BarChart3,
  Users,
  Settings,
  Bell,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

type SystemPage = "dashboard" | "reports" | "analytics" | "users" | "settings" | "notifications";
type ActivityItem = { action: string; time: string; status: "ok" | "warn" | "info" };

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
  "system-f": {
    stats: [
      { label: "Open Incidents", value: "31", sub: "6 critical", color: "#ef4444" },
      { label: "Resolved Today", value: "18", sub: "+5 vs target", color: "#059669" },
      { label: "Avg First Response", value: "12min", sub: "86% on time", color: "#2563eb" },
      { label: "Backlog Age", value: "2.7d", sub: "Improving", color: "#7c3aed" },
    ],
    activity: [
      { action: "Printer queue issue escalated to desktop support", time: "Just now", status: "warn" },
      { action: "Ticket TICK-4402 closed after VPN fix", time: "18m ago", status: "ok" },
      { action: "Laptop replacement request approved", time: "49m ago", status: "info" },
      { action: "Emergency patch deployment scheduled", time: "2h ago", status: "warn" },
    ],
  },
};

const statusIcon = (s: "ok" | "warn" | "info") => {
  if (s === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (s === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Clock className="w-4 h-4 text-blue-400 shrink-0" />;
};

interface Props {
  systemId: SystemId;
  page: SystemPage;
  role: Role;
}

export function SystemDashboard({ systemId, page, role }: Props) {
  const sys = SYSTEMS[systemId] ?? { label: systemId, description: "Managed system", color: "#64748b", accentBg: "#f1f5f9", tag: "System" };
  const data = SYSTEM_DATA[systemId] ?? { stats: [{ label: "Status", value: "Live", sub: "Available now", color: "#2563eb" }], activity: [{ action: `${sys.label} is ready for use.`, time: "Just now", status: "info" }] };
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const canEdit = role === "admin" || role === "manager";

  useEffect(() => {
    setActivityFeed(data.activity);
  }, [systemId]);

  const addActivityEntry = () => {
    setActivityFeed((prev) => [
      { action: `${sys.label} received a new manual entry.`, time: "Just now", status: "info" },
      ...prev.slice(0, 3),
    ]);
  };
  const pageMeta = {
    dashboard: { title: "Overview", kicker: "OPERATIONS", description: `${sys.label} live summary and latest activity.`, icon: Sparkles },
    reports: { title: "Reports", kicker: "REPORTS", description: `${sys.tag} reports queued for review and export.`, icon: FileText },
    analytics: { title: "Analytics", kicker: "INSIGHTS", description: `Trend analysis and performance indicators for ${sys.label}.`, icon: BarChart3 },
    users: { title: "Users", kicker: "PEOPLE", description: `Active team members and their access coverage.`, icon: Users },
    settings: { title: "Settings", kicker: "CONFIG", description: `Operational controls and policy settings for ${sys.label}.`, icon: Settings },
    notifications: { title: "Notifications", kicker: "ALERTS", description: `Recent alerts and follow-up actions.`, icon: Bell },
  };

  const reports = [
    { title: `${sys.label} monthly summary`, owner: `${sys.tag} Ops`, status: "Ready", progress: "Delivered 08:30" },
    { title: `Exception log review`, owner: "Compliance", status: "Pending", progress: "Awaiting sign-off" },
    { title: `Audit trail export`, owner: "Security", status: "Queued", progress: "Scheduled for 15:00" },
  ];

  const analyticsItems = [
    { label: "Completion rate", value: "94%", trend: "+6% vs last week" },
    { label: "Average turnaround", value: "2.4h", trend: "-18 min" },
    { label: "Escalations", value: "11", trend: "3 high priority" },
  ];

  const usersList = [
    { name: "Alicia Cruz", role: "Manager", state: "Assigned" },
    { name: "Noah Patel", role: "Reviewer", state: "Awaiting approval" },
    { name: "Mina Singh", role: "Admin", state: "Active" },
  ];

  const settingsItems = [
    { label: "Approval workflow", value: "Enabled" },
    { label: "Auto-escalation", value: "On" },
    { label: "Audit retention", value: "180 days" },
  ];

  const notifications = [
    { title: "Budget threshold crossed", detail: `${sys.label} reached 85% of planned spend.`, tone: "warn" },
    { title: "New reviewer request", detail: "One document is waiting for sign-off.", tone: "info" },
    { title: "System health stable", detail: "No critical incidents detected in the last 24 hours.", tone: "ok" },
  ];

  if (page !== "dashboard") {
    const restricted = role === "viewer" && (page === "analytics" || page === "settings");
    const meta = pageMeta[page];

    return (
      <div className="p-8 space-y-6 max-w-[1100px]" style={{ fontFamily: "var(--font-family-base)" }}>
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: sys.accentBg }}>
                <meta.icon className="h-5 w-5" style={{ color: sys.color }} />
              </div>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {meta.kicker}
              </span>
            </div>
            <h2 className="text-foreground" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{restricted ? "Restricted view" : "Live data"}</p>
            <p>{restricted ? "Manager/Admin access required" : "Updated 2 minutes ago"}</p>
          </div>
        </div>

        {restricted ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: sys.accentBg }}>
              <Lock className="h-6 w-6" style={{ color: sys.color }} />
            </div>
            <h3 className="text-foreground" style={{ fontSize: "1rem", fontWeight: 600 }}>Access is limited for this view</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              This section is available to managers and admins so they can review performance and configuration details.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-card p-6">
              {page === "reports" && (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.title} className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{report.title}</p>
                        <p className="text-xs text-muted-foreground">{report.owner}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{report.status}</p>
                        <p className="text-xs text-muted-foreground">{report.progress}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {page === "analytics" && (
                <div className="space-y-3">
                  {analyticsItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.trend}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {page === "users" && (
                <div className="space-y-3">
                  {usersList.map((person) => (
                    <div key={person.name} className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{person.role}</p>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{person.state}</span>
                    </div>
                  ))}
                </div>
              )}

              {page === "settings" && (
                <div className="space-y-3">
                  {settingsItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">Managed from {sys.tag.toLowerCase()} policy center</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {page === "notifications" && (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-border bg-background/50 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2">
                        {item.tone === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : item.tone === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Bell className="h-4 w-4 text-blue-500" />}
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" style={{ color: sys.color }} />
                  <h3 className="text-sm font-semibold text-foreground">Current status</h3>
                </div>
                <p className="text-sm text-muted-foreground">{sys.label} is operating normally and the latest workflow queue is healthy.</p>
                <div className="mt-4 rounded-2xl bg-background/70 p-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Open actions</span>
                    <span className="font-semibold text-foreground">12</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Escalations</span>
                    <span className="font-semibold text-foreground">3</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" style={{ color: sys.color }} />
                  <h3 className="text-sm font-semibold text-foreground">Next best action</h3>
                </div>
                <p className="text-sm text-muted-foreground">Review the latest report bundle and route any approvals before the close of business.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-[960px]" style={{ fontFamily: "var(--font-family-base)" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-white"
              style={{ background: sys.color, fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.08em" }}
            >
              {sys.tag.toUpperCase()}
            </span>
            {!canEdit && (
              <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-slate-500" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                READ ONLY
              </span>
            )}
          </div>
          <h1 className="text-foreground" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{sys.label} — Overview</h1>
          <p className="mt-0.5 text-muted-foreground" style={{ fontSize: "0.875rem" }}>{sys.description}</p>
        </div>
        {canEdit && (
          <button
            className="rounded-xl px-4 py-2 text-white transition-colors"
            style={{ background: sys.color, fontSize: "0.85rem", fontWeight: 500 }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            onClick={addActivityEntry}
          >
            + New Entry
          </button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {data.stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
            <p className="mt-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>{s.label}</p>
            <p style={{ fontSize: "0.68rem", color: s.color, marginTop: 4, fontFamily: "var(--font-family-mono)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-foreground" style={{ fontSize: "1rem", fontWeight: 600 }}>Recent Activity</h2>
        <p className="mb-5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>Latest events in {sys.label}.</p>
        <div className="space-y-3">
          {activityFeed.map((item, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-2.5 last:border-0">
              {statusIcon(item.status)}
              <p className="flex-1 text-foreground" style={{ fontSize: "0.85rem" }}>{item.action}</p>
              <span className="shrink-0 text-muted-foreground" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem" }}>
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
