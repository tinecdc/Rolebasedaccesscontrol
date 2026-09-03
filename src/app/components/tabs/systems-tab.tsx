import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SystemCatalogItem, useAuth } from "../auth-context";

export function SystemsTabContent({
  systemCatalog,
  currentUser,
  saveSystem,
  newSystem,
  setNewSystem,
  creatingSystem,
}: {
  systemCatalog: SystemCatalogItem[];
  currentUser: { isSuperAdmin: boolean } | null;
  saveSystem: () => Promise<void>;
  newSystem: { label: string; description: string; tag: string; color: string; accentBg: string };
  setNewSystem: React.Dispatch<React.SetStateAction<{ label: string; description: string; tag: string; color: string; accentBg: string }>>;
  creatingSystem: boolean;
}) {
  const { refreshSystemCatalog } = useAuth();
  const [editableUrls, setEditableUrls] = useState<Record<string, string>>({});
  const [savingUrls, setSavingUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    systemCatalog.forEach((s) => (next[s.id] = s.url ?? ""));
    setEditableUrls(next);
  }, [systemCatalog]);
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Registered systems</p>
          <p className="mt-2 text-2xl font-semibold text-white">{systemCatalog.length}</p>
          <p className="mt-2 text-sm text-slate-400">Each system can be entered directly from the catalog.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Accessible now</p>
          <p className="mt-2 text-2xl font-semibold text-white">{systemCatalog.length}</p>
          <p className="mt-2 text-sm text-slate-400">The system catalog reflects the current workspace configuration.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">System catalog</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Registered applications</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs text-slate-300">
            {systemCatalog.length} systems
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {systemCatalog.map((system) => (
            <div key={system.id} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: system.accentBg }}>
                  <div className="h-3 w-3 rounded-full" style={{ background: system.color }} />
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: system.color }}>
                  {system.tag}
                </span>
              </div>

              <p className="mt-3 text-base font-semibold text-white">{system.label}</p>
              <p className="mt-1 text-sm text-slate-400">{system.description}</p>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900 p-2 text-xs text-slate-300">
                <p className="mb-1 text-slate-500">URL</p>
                {currentUser?.isSuperAdmin ? (
                  <div className="flex items-center gap-2">
                    <input className="flex-1 rounded-md bg-transparent px-2 py-1 text-xs text-white" value={editableUrls[system.id] ?? ""} onChange={(e) => setEditableUrls((prev) => ({ ...prev, [system.id]: e.target.value }))} />
                    <button
                      onClick={async () => {
                        try {
                          setSavingUrls((s) => ({ ...s, [system.id]: true }));
                          const res = await fetch(`/api/admin/systems/${system.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: editableUrls[system.id] ?? null }),
                          });
                          if (res.ok) {
                            await refreshSystemCatalog();
                          }
                        } catch {
                          // ignore
                        } finally {
                          setSavingUrls((s) => ({ ...s, [system.id]: false }));
                        }
                      }}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                      disabled={!!savingUrls[system.id]}
                    >
                      {savingUrls[system.id] ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <p className="truncate">{system.url ?? "No system URL configured"}</p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => system.url && window.open(system.url, "_blank", "noopener,noreferrer")}
                  disabled={!system.url}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {system.url ? "Open system" : "No link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentUser?.isSuperAdmin && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">System config</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Add a new system</h3>
            </div>
            <PlusCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={newSystem.label} onChange={(e) => setNewSystem((prev) => ({ ...prev, label: e.target.value }))} placeholder="System name" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
            <select value={newSystem.tag} onChange={(e) => setNewSystem((prev) => ({ ...prev, tag: e.target.value }))} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500">
              <option>AMG</option>
              <option>FSG</option>
              <option>SPG</option>
              <option>BDG</option>
              <option>CSG</option>
              <option>CCG</option>
              <option>OGM</option>
            </select>
            <input value={newSystem.description} onChange={(e) => setNewSystem((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 md:col-span-2" />
            <div className="rounded-xl border border-white/10 bg-slate-950 p-2 flex items-center gap-2">
              <input type="color" value={newSystem.color} onChange={(e) => setNewSystem((prev) => ({ ...prev, color: e.target.value }))} className="h-10 w-12 rounded cursor-pointer border-0" />
              <span className="text-sm text-slate-400">{newSystem.color}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950 p-2 flex items-center gap-2">
              <input type="color" value={newSystem.accentBg} onChange={(e) => setNewSystem((prev) => ({ ...prev, accentBg: e.target.value }))} className="h-10 w-12 rounded cursor-pointer border-0" />
              <span className="text-sm text-slate-400">{newSystem.accentBg}</span>
            </div>
          </div>
          <button onClick={saveSystem} disabled={creatingSystem || !newSystem.label} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {creatingSystem ? "Adding..." : "Add system"}
          </button>
        </div>
      )}
    </div>
  );
}
