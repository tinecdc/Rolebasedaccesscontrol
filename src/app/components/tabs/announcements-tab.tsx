import { Megaphone, Send, Clock, User, CheckCircle, Paperclip, ExternalLink, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AnnouncementsTabContent({
  currentUser,
}: {
  currentUser: { name: string; email: string; isSuperAdmin?: boolean } | null;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [audienceType, setAudienceType] = useState<"all" | "specific">("all");
  const [audienceList, setAudienceList] = useState("");
  const [attachmentData, setAttachmentData] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadRecent = async () => {
    try {
      const res = await fetch(`/api/announcements${currentUser?.email ? `?userEmail=${encodeURIComponent(currentUser.email)}` : ""}`);
      const data = await res.json();
      if (res.ok && data.success) setRecent(data.announcements ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadRecent();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAttachmentData(result);
      setAttachmentName(file.name || "uploaded-file");
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentData("");
    setAttachmentName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const send = async (schedule = false) => {
    if (!title.trim() || !message.trim()) {
      alert("Please add both a title and a message before sending the announcement.");
      return;
    }

    if (audienceType === "specific" && !audienceList.trim()) {
      alert("Add at least one email address for targeted announcements.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        priority: priority.toLowerCase(),
        audienceType: audienceType === "all" ? "all" : "specific",
        audience: audienceType === "specific" ? audienceList.split(/[ ,\n\s]+/).filter(Boolean) : undefined,
        attachmentData: attachmentData || null,
        attachmentName: attachmentName.trim() || null,
      };
      if (schedule && scheduledAt) payload.scheduledAt = scheduledAt;
      const res = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data.success) {
        setTitle("");
        setMessage("");
        setAudienceList("");
        removeAttachment();
        await loadRecent();
      } else {
        alert(data.error ?? "Unable to create announcement.");
      }
    } catch {
      alert("Unable to send the announcement right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markClicked = async (id: string) => {
    try {
      await fetch(`/api/announcements/${id}/click`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userEmail: currentUser?.email }) });
      await loadRecent();
    } catch {
      // ignore
    }
  };

  const viewClicks = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/announcements/${id}/clicks`);
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Clicked by:\n${(data.clicks || []).map((c: any) => `${c.user_email || '(unknown)'} at ${c.clicked_at}`).join('\n')}`);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {currentUser?.isSuperAdmin && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Send Announcement</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">Broadcast announcements to all administrators or targeted users.</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Announcement Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="Enter announcement title" className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter your announcement message" rows={6} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white">
                  <option>Normal</option>
                  <option>Important</option>
                  <option>Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Audience</label>
                <select value={audienceType} onChange={(e) => setAudienceType(e.target.value as any)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white">
                  <option value="all">Everyone</option>
                  <option value="specific">Specific (emails)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Schedule</label>
                <input type="datetime-local" onChange={(e) => setScheduledAt(e.target.value || null)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white" />
              </div>
            </div>

            {audienceType === "specific" && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Target emails (comma or newline separated)</label>
                <textarea value={audienceList} onChange={(e) => setAudienceList(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Upload attachment</label>
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
                {attachmentName && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                    <span className="truncate pr-2">{attachmentName}</span>
                    <button type="button" onClick={removeAttachment} className="rounded-md border border-blue-400/50 bg-slate-950/40 px-2 py-1 text-[10px] font-medium text-blue-100 transition hover:border-red-400 hover:text-red-200">
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Attachment label</label>
                <input value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} type="text" placeholder="Quarterly update.pdf" className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => void send(false)} disabled={loading} className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
                <Send className="h-4 w-4 mr-2 inline-block" />
                Send Announcement
              </button>
              <button onClick={() => void send(true)} disabled={loading} className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                Schedule for later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Announcements</h3>
        <div className="space-y-3">
          {recent.map((a: any) => (
            <div key={a.id} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.message}</p>
                  {(a.attachmentData || a.attachmentUrl) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href={a.attachmentData || a.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{a.attachmentName || "View file"}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={a.attachmentData || a.attachmentUrl}
                        download={a.attachmentName || "attachment"}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700/80 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.isSuperAdmin && (
                    <button onClick={() => void viewClicks(a.id)} className="text-xs text-slate-400 underline">View clicks</button>
                  )}
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {a.createdBy || currentUser?.name || "Admin"}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {a.scheduledAt ? `Scheduled ${a.scheduledAt}` : `Sent ${a.createdAt}`}
                </div>
                <div className="ml-auto">
                  <button onClick={() => void markClicked(a.id)} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white">Mark clicked</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
