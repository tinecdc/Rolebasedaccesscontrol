import { useEffect, useState } from "react";
import { SystemCatalogItem } from "../auth-context";
import { Users, LockKeyhole } from "lucide-react";

export function UsersTabContent({
  dashboardSummary,
  adminUsers,
  currentUser,
  systemCatalog,
  refreshUsers,
}: {
  dashboardSummary: { totalUsers: number; totalAdmins: number; totalSystems: number; totalAccessEntries: number; auditLogCount: number; smtpConfigured: boolean; recentActivity: Array<{ action: string; details: string | null; created_at: string }> };
  adminUsers: Array<{ id: string; name: string; email: string; department: string; avatar: string; isSuperAdmin: boolean; systems: Array<{ systemId: string; role: string }> }>;
  currentUser: { isSuperAdmin: boolean } | null;
  systemCatalog: SystemCatalogItem[];
  refreshUsers?: () => Promise<void>;
}) {
  const [pending, setPending] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", department: "" });
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      const res = await fetch("/api/admin/registrations");
      const data = (await res.json()) as { success?: boolean; registrations?: Array<{ id: string; name: string; email: string; }>; };
      if (res.ok && data.success && Array.isArray(data.registrations)) setPending(data.registrations);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!currentUser?.isSuperAdmin) return;
    void loadPending();
  }, [currentUser?.isSuperAdmin]);
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Users enrolled</p>
          <p className="mt-2 text-2xl font-semibold text-white">{dashboardSummary.totalUsers || adminUsers.length + 1}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Pending approvals</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pending.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Admin coverage</p>
          <p className="mt-2 text-2xl font-semibold text-white">{dashboardSummary.totalAdmins || adminUsers.filter((user) => user.isSuperAdmin).length + 1}</p>
        </div>
      </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <LockKeyhole className="h-4 w-4 text-blue-400" />
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Access management</p>
          </div>
          <h3 className="text-lg font-semibold text-white">Manage user access controls</h3>
          <p className="mt-2 text-sm text-slate-400">Configure system access and permissions for all users in the organization.</p>
          
          <div className="mt-6 space-y-4">
            {currentUser?.isSuperAdmin && (
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowAddUser((s) => !s)} className="rounded-md border border-white/10 px-3 py-1 text-sm text-slate-200">
                  {showAddUser ? "Cancel" : "Add user"}
                </button>
              </div>
            )}
            {currentUser?.isSuperAdmin && showAddUser && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 mb-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Password" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input value={newUser.department} onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                </div>
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      setCreatingUser(true);
                      setFeedback(null);
                      try {
                        const res = await fetch("/api/admin/users", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: newUser.email,
                            password: newUser.password,
                            name: newUser.name,
                            department: newUser.department,
                            isSuperAdmin: false,
                            systems: [],
                          }),
                        });

                        const data = await res.json();
                        if (res.ok && data.success) {
                          setFeedback("User created.");
                          setShowAddUser(false);
                          await loadPending();
                          if (refreshUsers) await refreshUsers();
                        } else {
                          setFeedback(data.error ?? "Unable to create user.");
                        }
                      } catch (err) {
                        setFeedback("Unable to reach server.");
                      } finally {
                        setCreatingUser(false);
                      }
                    }}
                    disabled={creatingUser || !newUser.email || !newUser.name || !newUser.password}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {creatingUser ? "Creating..." : "Create user"}
                  </button>
                  {feedback && <div className="mt-2 text-sm text-slate-300">{feedback}</div>}
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-medium text-white">Active users</h4>
              </div>
              <div className="space-y-3">
                {adminUsers.length === 0 ? (
                  <p className="text-sm text-slate-400">No users available. Create users to manage their access controls.</p>
                ) : (
                  adminUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-xs font-medium text-white" style={{ background: user.isSuperAdmin ? "#3b82f6" : "#64748b" }}>
                          {user.isSuperAdmin ? "Super Admin" : "User"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {adminUsers.length > 5 && (
                  <p className="text-xs text-slate-500">+ {adminUsers.length - 5} more users</p>
                )}
              </div>
            </div>
            {currentUser?.isSuperAdmin && pending.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-sm font-medium text-white">Pending registrations</p>
                <div className="mt-3 space-y-2">
                  {pending.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/registrations/${r.id}/approve`, { method: "POST" });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                    await loadPending();
                                    if (refreshUsers) await refreshUsers();
                              }
                            } catch {
                              // ignore
                            }
                          }}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
