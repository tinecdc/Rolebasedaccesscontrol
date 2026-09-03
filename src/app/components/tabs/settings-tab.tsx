import { Mail } from "lucide-react";
import { SystemCatalogItem } from "../auth-context";

export function SettingsTabContent({ systemCatalog }: { systemCatalog: SystemCatalogItem[] }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Mail delivery</p>
          <p className="mt-2 text-2xl font-semibold text-white">Configured</p>
          <p className="mt-2 text-sm text-slate-400">SMTP setup reflects the current settings workspace.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-400">Security posture</p>
          <p className="mt-2 text-2xl font-semibold text-white">Healthy</p>
          <p className="mt-2 text-sm text-slate-400">Identity and authentication controls remain active.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Connected systems</p>
            <h3 className="mt-1 text-lg font-semibold text-white">System integration list</h3>
          </div>
          <Mail className="h-5 w-5 text-emerald-400" />
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
