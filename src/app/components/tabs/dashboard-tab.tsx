import { ArrowRight, Sparkles, Activity, History } from "lucide-react";
import { SystemCatalogItem } from "../auth-context";

export function DashboardTabContent({
  currentUser,
  visibleSystems,
  filteredVisibleSystems,
  onEnterSystem,
  systemCatalog,
  dashboardSummary,
  auditLogs,
  setActiveSection,
  systemIds,
}: {
  currentUser: { name: string; avatar: string; isSuperAdmin: boolean; systems: Array<{ systemId: string; role: string }> } | null;
  visibleSystems: Array<{ systemId: string; role: string }>;
  filteredVisibleSystems: Array<{ systemId: string; role: string }>;
  onEnterSystem: (id: string) => void;
  systemCatalog: SystemCatalogItem[];
  dashboardSummary: { totalUsers: number; totalAdmins: number; totalSystems: number; totalAccessEntries: number; auditLogCount: boolean; recentActivity: Array<{ action: string; details: string | null; created_at: string }> };
  auditLogs: Array<{ id: number; actor: string | null; action: string; details: string | null; created_at: string }>;
  setActiveSection: (section: "dashboard" | "users" | "roles" | "systems" | "reports" | "settings" | "audit") => void;
  systemIds: string[];
}) {
  if (!currentUser) return null;

  const formatDateTime = (dateString: string) => {
    try {
      const normalized = dateString.includes("T") ? dateString : dateString.replace(" ", "T");
      const parsed = new Date(normalized.includes("Z") || normalized.includes("+") ? normalized : `${normalized}Z`);
      
      if (Number.isNaN(parsed.getTime())) {
        return dateString;
      }

      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
    } catch {
      return dateString;
    }
  };

  const lastFiveActivities = auditLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <Sparkles className="h-4 w-4" />
              Command center
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-200">
              {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date())}
            </div>
          </div>

          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
            You have access to <span className="font-semibold text-white">{currentUser.systems.length}</span> of {systemIds.length} systems. Keep operations, approvals, and releases moving from a single view.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">System overview</p>
            <span className="text-sm text-emerald-400">Active</span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: "Users enrolled", value: String(dashboardSummary.totalUsers || 0) },
              { label: "Systems available", value: String(visibleSystems.length) },
              { label: "Recent activities", value: String(auditLogs.length || 0) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Users enrolled", value: String(dashboardSummary.totalUsers || 0), detail: "Active user accounts" },
          { label: "Systems", value: String(dashboardSummary.totalSystems || systemIds.length), detail: `${visibleSystems.length} accessible to you` },
          { label: "Recent activities", value: String(auditLogs.length || 0), detail: "Last 5 shown below" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Last 5 activities</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">Recent changes and events in the system</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          {lastFiveActivities.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <p className="text-sm">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lastFiveActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{activity.action}</p>
                    {activity.details && <p className="mt-1 text-xs text-slate-400">{activity.details}</p>}
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(activity.created_at)}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setActiveSection("audit")}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                View all activities
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
