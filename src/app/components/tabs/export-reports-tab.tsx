import { Download, Calendar, Filter, BarChart3 } from "lucide-react";

export function ExportReportsTabContent({
  auditLogs,
  dashboardSummary,
}: {
  auditLogs: Array<{ id: number; actor: string | null; action: string; details: string | null; created_at: string }>;
  dashboardSummary: { totalUsers: number; totalAdmins: number; totalSystems: number; totalAccessEntries: number; auditLogCount: number; recentActivity: Array<{ action: string; details: string | null; created_at: string }> };
}) {
  const handleExportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: dashboardSummary,
      auditLogs: auditLogs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portal-report-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Action", "Actor", "Details", "Timestamp"];
    const rows = auditLogs.map(log => [
      log.id,
      log.action,
      log.actor || "System",
      log.details || "",
      log.created_at
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portal-audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Total users</p>
          <p className="mt-2 text-2xl font-semibold text-white">{dashboardSummary.totalUsers}</p>
          <p className="mt-2 text-xs text-slate-500">Enrolled in system</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Total systems</p>
          <p className="mt-2 text-2xl font-semibold text-white">{dashboardSummary.totalSystems}</p>
          <p className="mt-2 text-xs text-slate-500">Active systems</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Audit logs</p>
          <p className="mt-2 text-2xl font-semibold text-white">{auditLogs.length}</p>
          <p className="mt-2 text-xs text-slate-500">Total activities recorded</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Export Reports</h3>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">Complete Audit Log</p>
                <p className="text-xs text-slate-400 mt-1">Export all system activities and changes</p>
              </div>
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportJSON} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
                <Download className="h-4 w-4" />
                JSON
              </button>
              <button onClick={handleExportCSV} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">Summary Report</p>
                <p className="text-xs text-slate-400 mt-1">Users, systems, and access statistics</p>
              </div>
              <Calendar className="h-5 w-5 text-emerald-400" />
            </div>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
              <Download className="h-4 w-4" />
              Download Summary
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">Filtered Report</p>
                <p className="text-xs text-slate-400 mt-1">Create a custom report with filters</p>
              </div>
              <Filter className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="space-y-3 mb-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Date Range</label>
                <select className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Custom range</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Action Type</label>
                <select className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option>All actions</option>
                  <option>User management</option>
                  <option>Access changes</option>
                  <option>System changes</option>
                </select>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
              <Download className="h-4 w-4" />
              Generate Custom Report
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Scheduled Reports</h3>
        <div className="text-center py-8">
          <Calendar className="h-8 w-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No scheduled reports yet</p>
          <button className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900/50">
            Schedule a report
          </button>
        </div>
      </div>
    </div>
  );
}
