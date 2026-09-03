import { useEffect, useState } from "react";
import { SystemCatalogItem } from "../auth-context";

export function RolesTabContent({ systemCatalog }: { systemCatalog: SystemCatalogItem[] }) {
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      if (res.ok && data.success) setRoles(data.roles ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setName("");
        setDescription("");
        await load();
      }
    } catch {}
    setLoading(false);
  };

  const startEdit = (r: { id: string; name: string; description?: string | null }) => {
    setName(r.name);
    setDescription(r.description ?? "");
    setEditingId(r.id);
  };

  const saveEdit = async () => {
    if (!editingId || !name) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setName("");
        setDescription("");
        setEditingId(null);
        await load();
      }
    } catch {}
    setLoading(false);
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Role model</p>
          <p className="mt-2 text-2xl font-semibold text-white">Organization roles</p>
          <p className="mt-2 text-sm text-slate-400">Define custom roles to represent organizational responsibilities.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Permission scope</p>
          <p className="mt-2 text-2xl font-semibold text-white">Managed centrally</p>
          <p className="mt-2 text-sm text-slate-400">Roles are managed here and assigned via access controls.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Custom roles</h3>
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
          <button onClick={create} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">Create</button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {roles.length === 0 ? (
              <p className="text-sm text-slate-400">No custom roles defined.</p>
            ) : (
              roles.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-slate-950/80 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.description}</p>
                  </div>
                  <div>
                    <button onClick={() => remove(r.id)} className="rounded-md bg-rose-600 px-3 py-1 text-sm font-medium text-white">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
