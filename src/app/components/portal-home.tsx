import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth, SystemId, Role, SystemCatalogItem } from "./auth-context";
import { RoleBadge } from "./role-badge";
import { DashboardTabContent } from "./tabs/dashboard-tab";
import { UsersTabContent } from "./tabs/users-tab";
import { RolesTabContent } from "./tabs/roles-tab";
import { SystemsTabContent } from "./tabs/systems-tab";
import { ReportsTabContent } from "./tabs/reports-tab";
import { ExportReportsTabContent } from "./tabs/export-reports-tab";
import { SettingsTabContent } from "./tabs/settings-tab";
import { AuditHistoryTabContent } from "./tabs/audit-history-tab";
import { AnnouncementsTabContent } from "./tabs/announcements-tab";
import { ArrowRight, Lock, LogOut, PlusCircle, History, Mail, Activity, ShieldAlert, Users, BarChart3, Zap, RefreshCw, Download, Upload, LockKeyhole, Megaphone, Search, Bell, Settings, Sparkles, ChevronRight, Sun, Moon, Paperclip, ExternalLink } from "lucide-react";
import ndcLogo from "../../../assets/NDC_LOGO.png";

type AccessRole = Role | "none";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  isSuperAdmin: boolean;
  systems: Array<{ systemId: SystemId; role: Role }>;
}

type AccessDraft = Record<SystemId, AccessRole>;

interface PortalHomeProps {
  onEnterSystem: (id: SystemId) => void;
}

function formatPhilippineDateTime(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized.includes("Z") || normalized.includes("+") ? normalized : `${normalized}Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatPhilippineTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

interface DashboardSummaryState {
  totalUsers: number;
  totalAdmins: number;
  totalSystems: number;
  totalAccessEntries: number;
  auditLogCount: number;
  recentActivity: Array<{ action: string; details: string | null; created_at: string }>;
}

function createDraft(user: AdminUser, systemIds: SystemId[]): AccessDraft {
  return systemIds.reduce((draft, systemId) => {
    const existing = user.systems.find((item) => item.systemId === systemId);
    draft[systemId] = existing?.role ?? "none";
    return draft;
  }, {} as AccessDraft);
}


export function PortalHome({ onEnterSystem }: PortalHomeProps) {
  const { currentUser, logout, systemCatalog, refreshSystemCatalog } = useAuth();

  const openLinkedSystem = (system: SystemCatalogItem) => {
    const urlCandidates = [system.url, system.altUrl].filter((value): value is string => Boolean(value));
    const primaryUrl = urlCandidates[0] ?? "";
    const backupUrl = urlCandidates[1] ?? "";

    if (!primaryUrl && !backupUrl) {
      onEnterSystem(system.id);
      return;
    }

    const localSsoTargets: Record<SystemId, string> = {
      "system-e": "http://localhost:5174/",
      "system-f": "http://localhost:5175/",
    };

    const resolvedLocalSsoUrl = (value?: string, fallback = "http://localhost:5175/") => {
      if (value && /^https?:\/\/localhost:\d+\//.test(value)) {
        return value;
      }
      return fallback;
    };

    const normalizedUrl = localSsoTargets[system.id]
      ? resolvedLocalSsoUrl(primaryUrl || backupUrl, localSsoTargets[system.id])
      : primaryUrl || backupUrl || "http://localhost:5175/";

    const isLocalSsoSystem = Boolean(localSsoTargets[system.id]) || /^https?:\/\/localhost:\d+\//.test(primaryUrl || backupUrl || "");

    if (isLocalSsoSystem) {
      const storageKey = `rba_session_token_${system.id}`;
      const token = (() => {
        const existing = window.localStorage.getItem(storageKey);
        if (existing) return existing;
        const next = window.btoa(`${currentUser?.email ?? "unknown"}:${currentUser?.id ?? "anon"}:${system.id}:${Date.now()}:${Math.random().toString(16).slice(2)}`);
        window.localStorage.setItem(storageKey, next);
        return next;
      })();

      const payload = {
        type: "rba-sso",
        source: "rba",
        sentAt: Date.now(),
        token,
        systemId: system.id,
        user: {
          id: currentUser?.id ?? "",
          name: currentUser?.name ?? "",
          email: currentUser?.email ?? "",
          username: currentUser?.email ?? "",
          avatar: currentUser?.avatar ?? "",
          department: currentUser?.department ?? "",
          role: currentUser?.isSuperAdmin ? "Super Admin" : "Admin",
          is_active: 1,
          is_staff: 1,
          is_superuser: currentUser?.isSuperAdmin ? 1 : 0,
          permissions: ["read", "write", "manage"],
          systems: currentUser?.systems ?? [],
          token,
        },
      };

      const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
      const targetUrl = new URL(normalizedUrl);
      targetUrl.searchParams.set("rbaSso", encoded);

      const targetStr = targetUrl.toString();
      const targetWindow = window.open(targetStr, "_blank");

      if (!targetWindow) {
        if (backupUrl) {
          window.location.assign(new URL(backupUrl).toString());
          return;
        }
        window.location.assign(targetStr);
        return;
      }

      let acknowledged = false;

      const tryPost = () => {
        try {
          targetWindow.postMessage(payload, "*");
        } catch {
          // ignore cross-origin/post errors
        }
      };

      tryPost();
      const interval = window.setInterval(() => {
        if (targetWindow.closed) {
          window.clearInterval(interval);
          return;
        }
        if (!acknowledged) tryPost();
      }, 300);

      const messageHandler = (event: MessageEvent) => {
        if (event.source !== targetWindow) return;
        const d = event.data as any;
        if (d && d.type === "rba-sso-ack") {
          acknowledged = true;
          window.clearInterval(interval);
          window.removeEventListener("message", messageHandler);
        }
      };

      window.addEventListener("message", messageHandler);

      window.setTimeout(() => {
        if (!acknowledged) {
          window.clearInterval(interval);
          window.removeEventListener("message", messageHandler);
        }
      }, 6000);

      return;
    }

    window.location.assign(normalizedUrl);
  };

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [draftAccess, setDraftAccess] = useState<Record<string, AccessDraft>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const accessible = useMemo(() => new Set<SystemId>((currentUser?.systems ?? []).map((s) => s.systemId)), [currentUser?.systems]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", department: "", avatar: "" });
  const [newDraft, setNewDraft] = useState<AccessDraft>({});
  const [newSystem, setNewSystem] = useState({ label: "", description: "", tag: "Operations", color: "#2563eb", accentBg: "#dbeafe" });
  const [creatingSystem, setCreatingSystem] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: number; actor: string | null; action: string; details: string | null; created_at: string }>>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryState>({
    totalUsers: 0,
    totalAdmins: 0,
    totalSystems: 0,
    totalAccessEntries: 0,
    auditLogCount: 0,
    recentActivity: [],
  });
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [announcements, setAnnouncements] = useState<Array<any>>([]);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [activeSection, setActiveSection] = useState<"dashboard" | "users" | "roles" | "systems" | "reports" | "settings" | "audit" | "announcements">("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string>("just now");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme === "dark";
  const systemIds = useMemo(() => systemCatalog.map((s) => s.id), [systemCatalog]);
  const visibleSystems = useMemo(() => {
    if (currentUser?.isSuperAdmin) {
      // Super admins can access all systems
      return systemCatalog.map((s) => ({ systemId: s.id, role: "admin" as Role }));
    }
    // Regular users can only access their assigned systems
    return (currentUser?.systems ?? []).filter(({ systemId }) => systemIds.includes(systemId));
  }, [currentUser?.systems, currentUser?.isSuperAdmin, systemCatalog, systemIds]);
  const shellBorder = isDark ? "border-white/10" : "border-slate-200";
  const shellSurface = isDark ? "bg-slate-900/80" : "bg-white shadow-sm";
  const shellSurfaceAlt = isDark ? "bg-slate-950/80" : "bg-slate-50";
  const shellText = isDark ? "text-white" : "text-slate-900";
  const shellTextMuted = isDark ? "text-slate-400" : "text-slate-600";
  const shellInput = isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900";
  const shellButton = isDark ? "border-white/10 bg-slate-950/80 text-slate-300" : "border-slate-200 bg-white text-slate-700";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredVisibleSystems = useMemo(() => {
    if (!normalizedSearchQuery) return visibleSystems;
    return visibleSystems.filter(({ systemId }) => {
      const system = systemCatalog.find((item) => item.id === systemId);
      const haystack = [system?.label, system?.description, system?.tag, systemId].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, visibleSystems, systemCatalog]);
  const filteredAdminUsers = useMemo(() => {
    if (!normalizedSearchQuery) return adminUsers;
    return adminUsers.filter((user) => {
      const haystack = [user.name, user.email, user.department].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [adminUsers, normalizedSearchQuery]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { success?: boolean; users?: AdminUser[] };

      if (data.success && Array.isArray(data.users)) {
        const nextUsers = data.users;
        setAdminUsers(nextUsers);
        setDraftAccess(
          Object.fromEntries(
            nextUsers.map((user) => [user.id, createDraft(user, systemIds)])
          )
        );
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!currentUser?.isSuperAdmin) return;
    try {
      const res = await fetch("/api/admin/audit-logs");
      const data = (await res.json()) as { success?: boolean; logs?: Array<{ id: number; actor: string | null; action: string; details: string | null; created_at: string }> };
      if (res.ok && data.success && Array.isArray(data.logs)) setAuditLogs(data.logs);
    } catch {
      // ignore
    }
  };

  const loadDashboardSummary = async () => {
    try {
      const res = await fetch("/api/admin/summary");
      const data = (await res.json()) as { success?: boolean; summary?: DashboardSummaryState };
      if (res.ok && data.success && data.summary) {
        setDashboardSummary(data.summary);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadAuditLogs();
    void loadDashboardSummary();

    // fetch custom roles for access selects
    (async () => {
      try {
        const r = await fetch("/api/admin/roles");
        const d = await r.json();
        if (r.ok && d.success && Array.isArray(d.roles)) setCustomRoles(d.roles);
      } catch {
        // ignore
      }
    })();
  }, [systemIds]);

  const loadAnnouncements = async () => {
    try {
      const endpoint = currentUser?.email ? `/api/announcements?userEmail=${encodeURIComponent(currentUser.email)}` : "/api/announcements";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.announcements)) setAnnouncements(data.announcements);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.isSuperAdmin) return;
    const interval = window.setInterval(() => {
      void loadUsers();
      void loadAuditLogs();
      void loadDashboardSummary();
      setLiveUpdatedAt(formatPhilippineTime(new Date()));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [currentUser?.isSuperAdmin, systemIds]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("portal-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("portal-theme", theme);
  }, [theme]);

  useEffect(() => {
    void refreshSystemCatalog();
  }, []);

  useEffect(() => {
    if (systemCatalog.length > 0) {
      setNewDraft(
        systemCatalog.reduce((draft, system) => {
          draft[system.id] = "none";
          return draft;
        }, {} as AccessDraft)
      );
    }
  }, [systemCatalog]);


  const updateDraft = (userId: string, systemId: SystemId, role: AccessRole) => {
    setDraftAccess((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? createDraft(adminUsers.find((user) => user.id === userId) ?? { id: userId, name: "", email: "", avatar: "", department: "", isSuperAdmin: false, systems: [] }, systemIds)),
        [systemId]: role,
      },
    }));
  };

  const saveUserAccess = async (user: AdminUser) => {
    const draft = draftAccess[user.id] ?? createDraft(user, systemIds);
    const systems = systemIds
      .filter((systemId) => draft[systemId] !== "none")
      .map((systemId) => ({ systemId, role: draft[systemId] as Role }));

    setSavingUserId(user.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systems }),
      });
      const data = (await res.json()) as { success?: boolean; user?: AdminUser; error?: string };

      if (res.ok && data.success && data.user) {
        setAdminUsers((prev) => prev.map((item) => (item.id === user.id ? data.user! : item)));
        setDraftAccess((prev) => ({ ...prev, [user.id]: createDraft(data.user!, systemIds) }));
        setFeedback(`${user.name} access updated.`);
      } else {
        setFeedback(data.error ?? "Unable to update access right now.");
      }
    } finally {
      setSavingUserId(null);
    }
  };

  const createUser = async () => {
    setCreating(true);
    setFeedback(null);

    const systems = systemIds.filter((id) => newDraft[id] !== "none").map((systemId) => ({ systemId, role: newDraft[systemId] as Role }));

    try {
      const res = await fetch(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          avatar: newUser.avatar,
          department: newUser.department,
          isSuperAdmin: false,
          systems,
        }),
      });

      const data = (await res.json()) as { success?: boolean; user?: AdminUser; error?: string };
      if (res.ok && data.success && data.user) {
        setAdminUsers((prev) => [data.user!, ...prev]);
        setDraftAccess((prev) => ({ ...prev, [data.user!.id]: createDraft(data.user!, systemIds) }));
        setFeedback(`${data.user!.name} created.`);
        setShowAddForm(false);
        setNewUser({ name: "", email: "", password: "", department: "", avatar: "" });
        setNewDraft(systemCatalog.reduce((draft, system) => {
          draft[system.id] = "none";
          return draft;
        }, {} as AccessDraft));
      } else {
        setFeedback(data.error ?? "Unable to create user.");
      }
    } catch (err) {
      setFeedback("Unable to reach server.");
    } finally {
      setCreating(false);
    }
  };

  const saveSystem = async () => {
    setCreatingSystem(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newSystem.label,
          description: newSystem.description,
          color: newSystem.color,
          accentBg: newSystem.accentBg,
          tag: newSystem.tag,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; system?: SystemCatalogItem };
      if (res.ok && data.success && data.system) {
        await refreshSystemCatalog();
        setFeedback(`${data.system.label} added successfully.`);
        setNewSystem({ label: "", description: "", tag: "Operations", color: "#2563eb", accentBg: "#dbeafe" });
      } else {
        setFeedback(data.error ?? "Unable to add system.");
      }
    } catch {
      setFeedback("Unable to reach server.");
    } finally {
      setCreatingSystem(false);
    }
  };

  const handleExportReports = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: dashboardSummary,
      auditLogs: auditLogs.slice(0, 5),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "portal-report-export.json";
    link.click();
    window.URL.revokeObjectURL(url);
    setFeedback("Report export started and downloaded to your browser.");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Add User":
        setShowAddForm(true);
        setActiveSection("users");
        break;
      case "Register System":
        setActiveSection("systems");
        break;
      case "Export Reports":
        handleExportReports();
        break;
      case "Send Announcement":
        setFeedback("Announcement queued for broadcast to active administrators.");
        break;
      case "Create Role":
        setActiveSection("roles");
        setFeedback("Role workspace opened.");
        break;
      case "Synchronize Users":
        void loadUsers();
        setFeedback("User directory synchronization requested.");
        break;
      case "Import Users":
        fileInputRef.current?.click();
        break;
      case "Lock User":
        setActiveSection("users");
        setFeedback("Lock user workflow opened. Select a user to continue.");
        break;
      default:
        break;
    }
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback(`Imported ${file.name}. The import flow is ready for your backend connector.`);
    event.target.value = "";
  };

  if (!currentUser) return null;

  if (!currentUser.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-family-base)" }}>
        <header className="border-b border-border bg-card px-4 py-4 sm:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10">
              <img src={ndcLogo} alt="NDC Logo" className="h-8 w-8 object-contain" />
            </div>
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.8rem", letterSpacing: "0.05em", color: "#0e1117" }}>
              National Development Company / PORTAL
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 text-sm font-semibold text-blue-600">
                {currentUser.avatar}
              </div>
              <div>
                <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{currentUser.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{currentUser.department}</p>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-8 sm:py-12">
          <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
          <div className="mb-10">
            <h1 className="mb-2 text-foreground" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Welcome back, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.95rem" }}>
              You have access to <strong style={{ color: "#0e1117" }}>{visibleSystems.length}</strong> of {systemIds.length} systems.
            </p>
          </div>

          {announcements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-slate-500 mb-2">Announcements</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {announcements.filter((a:any) => a.audienceType === 'all' || (a.audienceType === 'specific' && Array.isArray(a.audienceJson) && a.audienceJson.includes(currentUser.email))).map((a:any) => (
                  <div key={a.id} className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{a.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{a.message}</p>
                        {(a.attachmentData || a.attachmentUrl) && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <a
                              href={a.attachmentData || a.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[11px] font-medium text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>{a.attachmentName || "View file"}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={a.attachmentData || a.attachmentUrl}
                              download={a.attachmentName || "attachment"}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80 hover:text-white"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{a.priority}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "#9ca3af", marginBottom: 12 }}>
              YOUR SYSTEMS
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredVisibleSystems.map(({ systemId, role }) => {
                const sys = systemCatalog.find((item) => item.id === systemId) ?? { id: systemId, label: systemId, description: "Managed system", color: "#64748b", accentBg: "#f1f5f9", tag: "System" };
                return (
                  <button
                    key={systemId}
                    onClick={() => {
                      if (sys.url) {
                        openLinkedSystem(sys);
                        return;
                      }
                      onEnterSystem(systemId);
                    }}
                    className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: sys.accentBg }}>
                        <div className="h-3 w-3 rounded-full" style={{ background: sys.color }} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                    <p className="mb-1 text-foreground" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{sys.label}</p>
                    <p className="mb-3 text-muted-foreground" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>{sys.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-white" style={{ background: sys.color, fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
                        {sys.tag.toUpperCase()}
                      </span>
                      <RoleBadge role={role} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {systemIds.some((id) => !accessible.has(id)) && (
            <div className="mt-8">
              <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "#d1d5db", marginBottom: 12 }}>
                NO ACCESS
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {systemIds.filter((id) => !accessible.has(id)).map((systemId) => {
                  const sys = systemCatalog.find((item) => item.id === systemId) ?? { id: systemId, label: systemId, description: "Managed system", color: "#64748b", accentBg: "#f1f5f9", tag: "System" };
                  return (
                    <div key={systemId} className="rounded-2xl border border-dashed p-5" style={{ borderColor: "#e5e7eb", background: "#fafafa", opacity: 0.7 }}>
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="mb-1 text-muted-foreground" style={{ fontSize: "0.95rem", fontWeight: 500 }}>{sys.label}</p>
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

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`} style={{ fontFamily: "var(--font-family-base)" }}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className={`w-full border-b ${shellBorder} ${isDark ? "bg-slate-950/95" : "bg-white"} p-4 lg:w-72 lg:border-b-0 lg:border-r lg:p-6`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? "bg-blue-600/20" : "bg-blue-600/10"}`}>
              <img src={ndcLogo} alt="NDC Logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${shellText}`}>NDC Portal</p>
              <p className={`text-xs ${shellTextMuted}`}>Super admin workspace</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              { label: "Dashboard", icon: Activity, key: "dashboard" },
              { label: "Users", icon: Users, key: "users" },
              { label: "Roles", icon: ShieldAlert, key: "roles" },
              { label: "Systems", icon: PlusCircle, key: "systems" },
              { label: "Reports", icon: BarChart3, key: "reports" },
              { label: "Announcements", icon: Megaphone, key: "announcements" },
              { label: "Audit History", icon: History, key: "audit" },
              { label: "Settings", icon: Mail, key: "settings" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveSection(item.key as typeof activeSection)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activeSection === item.key ? (isDark ? "bg-white/10 text-white" : "bg-blue-600/10 text-blue-700") : (isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

        </aside>

        <div className={`flex-1 ${isDark ? "bg-slate-900/80" : "bg-white"}`}>
          <header className={`border-b ${shellBorder} ${isDark ? "bg-slate-900/80" : "bg-white"} px-4 py-4 sm:px-6 lg:px-8`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className={`flex flex-1 items-center gap-3 rounded-2xl border ${shellBorder} ${shellSurfaceAlt} px-3 py-2`}>
                <Search className={`h-4 w-4 ${shellTextMuted}`} />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users, systems, reports" className={`w-full bg-transparent text-sm outline-none ${isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`} />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveSection("reports"); setFeedback("Notifications center opened."); }} className={`rounded-xl border ${shellBorder} ${shellButton} p-2`}>
                  <Bell className="h-4 w-4" />
                </button>
                <button onClick={() => { setActiveSection("settings"); setFeedback("Settings workspace opened."); }} className={`rounded-xl border ${shellBorder} ${shellButton} p-2`}>
                  <Settings className="h-4 w-4" />
                </button>
                <button onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} className={`rounded-xl border ${shellBorder} ${shellButton} p-2`}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className={`flex items-center gap-2 rounded-2xl border ${shellBorder} ${shellSurfaceAlt} px-3 py-2`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isDark ? "bg-blue-600/20 text-blue-300" : "bg-blue-600/10 text-blue-700"} text-sm font-semibold`}>
                    {currentUser.avatar}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${shellText}`}>{currentUser.name}</p>
                    <p className={`text-xs ${shellTextMuted}`}>{currentUser.department}</p>
                  </div>
                </div>
                <button onClick={logout} className={`rounded-xl border ${shellBorder} ${shellButton} px-3 py-2 text-sm`}>
                  <span className="sr-only">Sign out</span>
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
            {activeSection === "dashboard" ? (
              <>
            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className={`rounded-3xl border ${shellBorder} ${isDark ? "bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900" : "bg-gradient-to-br from-blue-50 via-white to-slate-50"} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className={`flex items-center gap-2 text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                    <Sparkles className="h-4 w-4" />
                    Command center
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-medium ${isDark ? "border-white/10 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-white/80 text-slate-700"}`}>
                    {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date())}
                  </div>
                </div>
                <h1 className={`mt-3 text-2xl font-semibold ${shellText} sm:text-3xl`}>
                  Welcome back, {currentUser.name.split(" ")[0]}
                </h1>
                <p className={`mt-2 max-w-2xl text-sm ${isDark ? "text-slate-300" : "text-slate-700"} sm:text-base`}>
                  You have access to <span className={`font-semibold ${shellText}`}>{currentUser.systems.length}</span> of {systemIds.length} systems. Keep operations, approvals, and releases moving from a single view.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => setShowAddForm(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
                    Add user
                  </button>
                  <button onClick={() => setShowAuditLogs(true)} className={`rounded-xl border ${shellBorder} ${isDark ? "bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20" : "bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"}`}>
                    Review activity
                  </button>
                </div>
              </div>

          
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Users", value: String(dashboardSummary.totalUsers || adminUsers.length + 1), detail: `${dashboardSummary.totalAdmins || adminUsers.filter((user) => user.isSuperAdmin).length} admins` },
                { label: "Systems", value: String(dashboardSummary.totalSystems || systemIds.length), detail: `${visibleSystems.length} accessible` },
                { label: "Alerts", value: String(Math.max(3, dashboardSummary.auditLogCount || auditLogs.length + 2)), detail: `${dashboardSummary.auditLogCount || auditLogs.length} recent events` },
                { label: "Storage", value: `${Math.max(1, Math.round(((dashboardSummary.auditLogCount || auditLogs.length) + visibleSystems.length) / 6))}.0 GB`, detail: "Live sync" },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl border ${shellBorder} ${shellSurface} p-4`}>
                  <p className={`text-sm ${shellTextMuted}`}>{item.label}</p>
                  <p className={`mt-2 text-2xl font-semibold ${shellText}`}>{item.value}</p>
                  <p className={`mt-1 text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>{item.detail}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Your systems</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">Accessible platforms</h2>
                    </div>
                    <button onClick={() => setActiveSection("systems")} className={`flex items-center gap-2 rounded-xl border ${shellBorder} ${shellButton} px-3 py-2 text-sm`}>
                      View all <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredVisibleSystems.map(({ systemId, role }) => {
                      const sys = systemCatalog.find((item) => item.id === systemId) ?? { id: systemId, label: systemId, description: "Managed system", color: "#64748b", accentBg: "#f1f5f9", tag: "System" };
                      return (
                        <button
                          key={systemId}
                          onClick={() => {
                            if (sys.url) {
                              openLinkedSystem(sys);
                              return;
                            }
                            onEnterSystem(systemId);
                          }}
                          className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-left transition hover:border-blue-500/40 hover:bg-slate-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: sys.accentBg }}>
                              <div className="h-3 w-3 rounded-full" style={{ background: sys.color }} />
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-white">{sys.label}</p>
                          <p className="mt-1 text-sm text-slate-400">{sys.description}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: sys.color }}>
                              {sys.tag.toUpperCase()}
                            </span>
                            <RoleBadge role={role} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {currentUser.isSuperAdmin && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                    <div className="mb-5 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <h2 className="text-lg font-semibold text-white">Operational overview</h2>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Activity className="h-4 w-4 text-blue-400" />
                          Enrolled systems
                        </div>
                        <div className="mt-3 space-y-3">
                          {systemCatalog.slice(0, 3).map((system) => (
                            <div key={system.id} className="rounded-xl border border-white/10 p-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-200">{system.label}</span>
                                <span className="font-semibold text-white">Active</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-800">
                                <div className="h-2 rounded-full" style={{ background: system.color, width: "100%" }} />
                              </div>
                              <p className="mt-2 text-xs text-slate-400">{system.tag}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Users className="h-4 w-4 text-emerald-400" />
                          User statistics
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {[
                            { label: "Total users", value: String(dashboardSummary.totalUsers || 0) },
                            { label: "Admins", value: String(dashboardSummary.totalAdmins || 0) },
                            { label: "Systems", value: String(dashboardSummary.totalSystems || systemCatalog.length) },
                            { label: "Access entries", value: String(dashboardSummary.totalAccessEntries || 0) },
                          ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-white/10 p-3">
                              <p className="text-xs text-slate-400">{item.label}</p>
                              <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <BarChart3 className="h-4 w-4 text-violet-400" />
                          Activity metrics
                        </div>
                        <div className="mt-3 space-y-3">
                          {[
                            { label: "Audit logs", value: String(auditLogs.length), width: `${Math.min(100, (auditLogs.length / 10) * 100)}%` },
                            { label: "Active users", value: String(adminUsers.length), width: `${Math.min(100, (adminUsers.length / 20) * 100)}%` },
                            { label: "Registered systems", value: String(systemCatalog.length), width: `${Math.min(100, (systemCatalog.length / 10) * 100)}%` },
                          ].map((item) => (
                            <div key={item.label}>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-slate-200">{item.label}</span>
                                <span className="text-slate-400">{item.value}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-800">
                                <div className="h-2 rounded-full bg-violet-500" style={{ width: item.width }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Zap className="h-4 w-4 text-cyan-400" />
                        Quick actions
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Add User", icon: PlusCircle, action: "users" },
                          { label: "Register System", icon: Activity, action: "systems" },
                          { label: "Export Reports", icon: Download, action: "reports" },
                          { label: "Send Announcement", icon: Megaphone, action: "announcements" },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button key={item.label} onClick={() => setActiveSection(item.action as any)} className={`flex items-center gap-2 rounded-xl border ${shellBorder} ${isDark ? "bg-slate-950/80 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800" : "bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"}`}>
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {currentUser.isSuperAdmin && (
                  <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Access customization</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Manage user access</h2>
                      </div>
                      <button onClick={() => setShowAddForm((s) => !s)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                        {showAddForm ? "Cancel" : "Add user"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      {showAddForm && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                          <div className="grid gap-2 md:grid-cols-2">
                            <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                            <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                            <input value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Password" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                            <input value={newUser.department} onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {systemIds.map((systemId) => {
                              const sys = systemCatalog.find((item) => item.id === systemId);
                              return (
                                <label key={systemId} className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-200">
                                  <div className="mb-2 font-medium text-white">{sys?.label ?? systemId}</div>
                                  <select value={newDraft[systemId] ?? "none"} onChange={(e) => setNewDraft((prev) => ({ ...prev, [systemId]: e.target.value as AccessRole }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white">
                                    <option value="none">No access</option>
                                    {customRoles.length === 0 ? (
                                      <>
                                        <option value="viewer">Viewer</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                      </>
                                    ) : (
                                      customRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)
                                    )}
                                  </select>
                                </label>
                              );
                            })}
                          </div>
                          <button onClick={createUser} disabled={creating || !newUser.email || !newUser.name || !newUser.password} className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {creating ? "Creating..." : "Create user"}
                          </button>
                        </div>
                      )}

                      {feedback && (
                        <div className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                          {feedback}
                        </div>
                      )}

                      {loadingUsers ? (
                        <p className="text-sm text-slate-400">Loading user access...</p>
                      ) : (
                        <div className="space-y-3">
                          {filteredAdminUsers.map((user) => {
                            const draft = draftAccess[user.id] ?? createDraft(user, systemIds);
                            return (
                              <div key={user.id} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">{user.name}</p>
                                    <p className="text-sm text-slate-400">{user.email} • {user.department}</p>
                                  </div>
                                  <button onClick={() => saveUserAccess(user)} disabled={savingUserId === user.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-60">
                                    {savingUserId === user.id ? "Saving..." : "Save access"}
                                  </button>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {systemIds.map((systemId) => {
                                    const sys = systemCatalog.find((item) => item.id === systemId);
                                    return (
                                      <label key={systemId} className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-200">
                                        <div className="mb-2 font-medium text-white">{sys?.label ?? systemId}</div>
                                        <select value={draft[systemId] ?? "none"} onChange={(event) => updateDraft(user.id, systemId, event.target.value as AccessRole)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white">
                                          <option value="none">No access</option>
                                          {customRoles.length === 0 ? (
                                            <>
                                              <option value="viewer">Viewer</option>
                                              <option value="manager">Manager</option>
                                              <option value="admin">Admin</option>
                                            </>
                                          ) : (
                                            customRoles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)
                                          )}
                                        </select>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <span className="text-sm text-slate-400">3</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { title: "Access review due", detail: "4 users need role confirmation" },
    
                      { title: "Audit export ready", detail: "Latest compliance export available" },
                    ].map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                

                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">System health</p>
                    <span className="text-sm text-emerald-400">All nominal</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "API response", value: "99.8%" },
                      { label: "Database", value: "Stable" },
                      { label: "System sync", value: "Ready" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="font-medium text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {currentUser.isSuperAdmin && (
              <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Audit history</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Recent admin activity</h2>
                  </div>
                  <button onClick={() => setShowAuditLogs((prev) => !prev)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
                    {showAuditLogs ? "Hide" : "View"}
                  </button>
                </div>
                {showAuditLogs && (
                  <div className="mt-4 space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-white">{log.action}</span>
                          <span className="text-slate-400">{formatPhilippineDateTime(log.created_at)}</span>
                        </div>
                        <p className="mt-1 text-slate-400">{log.details ?? "No details"}</p>
                        <p className="mt-1 text-xs text-slate-500">Actor: {log.actor ?? "system"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {currentUser.isSuperAdmin && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">System catalog</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Add a new system</h3>
                    </div>
                    <PlusCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={newSystem.label} onChange={(e) => setNewSystem((prev) => ({ ...prev, label: e.target.value }))} placeholder="System name" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                    <input value={newSystem.tag} onChange={(e) => setNewSystem((prev) => ({ ...prev, tag: e.target.value }))} placeholder="Tag" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                    <input value={newSystem.description} onChange={(e) => setNewSystem((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white md:col-span-2" />
                    <input type="color" value={newSystem.color} onChange={(e) => setNewSystem((prev) => ({ ...prev, color: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-slate-950" />
                    <input type="color" value={newSystem.accentBg} onChange={(e) => setNewSystem((prev) => ({ ...prev, accentBg: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-slate-950" />
                  </div>
                  <button onClick={saveSystem} disabled={creatingSystem || !newSystem.label} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                    {creatingSystem ? "Adding..." : "Add system"}
                  </button>
                </section>

              </div>
            )}
              </>
            ) : (
              <section className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace view</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">
                        {activeSection === "users" && "User management"}
                        {activeSection === "roles" && "Role and permission governance"}
                        {activeSection === "systems" && "System administration"}
                        {activeSection === "reports" && "Insights and reporting"}
                        {activeSection === "audit" && "Audit history"}
                        {activeSection === "settings" && "Platform settings"}
                      </h2>
                    </div>
                    <div className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-300">
                      {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                    </div>
                  </div>

                  {activeSection === "users" && (
                    <UsersTabContent
                      dashboardSummary={dashboardSummary}
                      adminUsers={adminUsers}
                      currentUser={currentUser}
                      systemCatalog={systemCatalog}
                      refreshUsers={loadUsers}
                    />
                  )}

                  {activeSection === "roles" && <RolesTabContent systemCatalog={systemCatalog} />}

                  {activeSection === "systems" && (
                    <SystemsTabContent
                      systemCatalog={systemCatalog}
                      currentUser={currentUser}
                      saveSystem={saveSystem}
                      newSystem={newSystem}
                      setNewSystem={setNewSystem}
                      creatingSystem={creatingSystem}
                    />
                  )}

                  {activeSection === "reports" && (
                    <>
                      <ReportsTabContent systemCatalog={systemCatalog} />
                      <ExportReportsTabContent auditLogs={auditLogs} dashboardSummary={dashboardSummary} />
                    </>
                  )}

                  {activeSection === "announcements" && <AnnouncementsTabContent currentUser={currentUser} />}


                  {activeSection === "audit" && <AuditHistoryTabContent auditLogs={auditLogs} currentUser={currentUser} />}

                  {activeSection === "settings" && <SettingsTabContent systemCatalog={systemCatalog} />}
                </div>

                {/* Removed 'Current focus' and 'Quick next step' cards per requirements */}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
