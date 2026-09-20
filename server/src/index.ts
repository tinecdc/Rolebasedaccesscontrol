import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  buildUserResponse,
  consumePasswordResetToken,
  createAuditLog,
  createPasswordResetToken,
  createSystem,
  createUser,
  getAllSystems,
  getAllUsers,
  getAuditLogs,
  getDashboardSummary,
  getPendingRegistrations,
  getUserByEmail,
  getUserById,
  initSchema,
  updateSystem,
  updateUserPassword,
  updateUserSystemAccess,
  approveUser,
  getAllCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  createAnnouncement,
  getRecentAnnouncements,
  recordAnnouncementClick,
  getAnnouncementClicks,
} from "./db.js";
import { seedDatabase } from "./seed.js";
import { runMigrations } from "./migrate.js";

// Run migrations then seed database if empty
void (async () => {
  try {
    await runMigrations();
  } catch (err) {
    // ignore migration errors in dev
  }
  await initSchema();
  await seedDatabase();
})();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  ...configuredOrigins,
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    await createAuditLog({ action: "auth.login.failed", details: "Missing credentials" });
    res.status(400).json({ success: false, error: "Email and password are required." });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    await createAuditLog({ actor: email, action: "auth.login.failed", details: "Account not found" });
    res.status(401).json({ success: false, error: "No account found with that email." });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    await createAuditLog({ actor: email, action: "auth.login.failed", details: "Invalid password" });
    res.status(401).json({ success: false, error: "Incorrect password." });
    return;
  }
  if (user.is_approved !== 1) {
    await createAuditLog({ actor: user.email, action: "auth.login.blocked", details: "Account pending approval" });
    res.status(403).json({ success: false, error: "Account pending approval. An administrator must approve your registration." });
    return;
  }

  await createAuditLog({ actor: user.email, action: "auth.login.success", details: "User signed in" });
  res.json({ success: true, user: await buildUserResponse(user) });
});

app.post("/api/public/register", async (req, res) => {
  const { email, password, name, avatar, department } = req.body as { email?: string; password?: string; name?: string; avatar?: string; department?: string };
  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: "email, password and name are required" });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, error: "A user with that email already exists." });
    return;
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const user = await createUser({
      email,
      password_hash,
      name,
      avatar: avatar ?? (name.split(" ").map((s) => s[0]).join("") || "U"),
      department: department ?? "",
      is_super_admin: 0,
      is_approved: 0,
      systems: [],
    });

    await createAuditLog({ actor: email, action: "user.registration.submitted", details: `Registration submitted for ${name}` });
    res.json({ success: true, user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: "Unable to register user." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: "Email is required." });
    return;
  }

  const user = await getUserByEmail(email);
  const token = randomUUID().replace(/-/g, "").slice(0, 12);
  if (user) {
    await createPasswordResetToken(email, token);
    await createAuditLog({ actor: email, action: "auth.password-reset.requested", details: "Password reset requested" });
  }

  res.json({
    success: true,
    message: "If an account exists, a reset token has been prepared. Use it below to set a new password.",
    resetToken: token,
  });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, token, password } = req.body as { email?: string; token?: string; password?: string };
  if (!email || !token || !password) {
    res.status(400).json({ success: false, error: "Email, token and a new password are required." });
    return;
  }

  const resetRecord = await consumePasswordResetToken(email, token);
  if (!resetRecord) {
    res.status(400).json({ success: false, error: "That reset token is invalid or expired." });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    res.status(404).json({ success: false, error: "Account not found." });
    return;
  }

  await updateUserPassword(user.id, bcrypt.hashSync(password, 10));
  await createAuditLog({ actor: email, action: "auth.password-reset.completed", details: "Password reset complete" });
  res.json({ success: true, message: "Password updated. You can sign in with your new password." });
});

app.get("/api/admin/systems", async (_req, res) => {
  res.json({ success: true, systems: await getAllSystems() });
});

app.post("/api/admin/systems", async (req, res) => {
  const { label, description, color, accentBg, tag, url, altUrl } = req.body as {
    label?: string;
    description?: string;
    color?: string;
    accentBg?: string;
    tag?: string;
    url?: string;
    altUrl?: string | null;
  };

  if (!label) {
    res.status(400).json({ success: false, error: "A system name is required." });
    return;
  }

  const baseId = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "custom-system";
  const systemId = `system-${baseId}`;

  const created = await createSystem({
    id: systemId,
    label,
    description: description ?? "Newly added system",
    color: color ?? "#0f172a",
    accentBg: accentBg ?? "#e2e8f0",
    tag: tag ?? "Operations",
    url: url ?? null,
    altUrl: altUrl ?? null,
  });

  await createAuditLog({ actor: "admin", action: "system.created", details: `${label} added to the catalog` });
  res.json({ success: true, system: created });
});

app.put("/api/admin/systems/:systemId", async (req, res) => {
  const { systemId } = req.params;
  const { label, description, color, accentBg, tag, url, altUrl } = req.body as {
    label?: string;
    description?: string;
    color?: string;
    accentBg?: string;
    tag?: string;
    url?: string | null;
    altUrl?: string | null;
  };

  try {
    const updated = await updateSystem(systemId, { label, description, color, accentBg, tag, url, altUrl });
    if (!updated) {
      res.status(404).json({ success: false, error: "System not found." });
      return;
    }
    await createAuditLog({ actor: "admin", action: "system.updated", details: `${systemId} updated` });
    res.json({ success: true, system: updated });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: "Unable to update system." });
  }
});

app.post("/api/admin/users", (req, res) => {
  const { email, password, name, avatar, department, isSuperAdmin, systems } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    avatar?: string;
    department?: string;
    isSuperAdmin?: boolean;
    systems?: Array<{ systemId: string; role: "admin" | "manager" | "viewer" }>;
  };

  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: "email, password and name are required" });
    return;
  }

  const existing = getUserByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, error: "A user with that email already exists." });
    return;
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const user = createUser({
      email,
      password_hash,
      name,
      avatar: avatar ?? (name.split(" ").map((s) => s[0]).join("") || "U"),
      department: department ?? "",
      is_super_admin: isSuperAdmin ? 1 : 0,
      systems: systems?.map((s) => ({ systemId: s.systemId, role: s.role })) ?? [],
    });

    createAuditLog({ actor: email, action: "user.created", details: `User ${name} created` });
    res.json({ success: true, user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: "Unable to create user." });
  }
});

app.get("/api/admin/users", (_req, res) => {
  const users = getAllUsers().map((user) => buildUserResponse(user));
  res.json({ success: true, users });
});

app.get("/api/admin/registrations", (_req, res) => {
  const pending = getPendingRegistrations();
  res.json({ success: true, registrations: pending });
});

app.post("/api/admin/registrations/:userId/approve", (req, res) => {
  const { userId } = req.params;
  const approved = approveUser(userId);
  if (!approved) {
    res.status(404).json({ success: false, error: "Registration not found." });
    return;
  }
  createAuditLog({ actor: "admin", action: "user.registration.approved", details: `${approved.email} approved` });
  res.json({ success: true, user: approved });
});

app.get("/api/admin/summary", (_req, res) => {
  res.json({ success: true, summary: getDashboardSummary() });
});

app.put("/api/admin/users/:userId/access", (req, res) => {
  const { userId } = req.params;
  const { systems } = req.body as {
    systems?: Array<{ systemId: string; role: "admin" | "manager" | "viewer" }>;
  };

  if (!Array.isArray(systems)) {
    res.status(400).json({ success: false, error: "A systems array is required." });
    return;
  }

  const normalizedSystems = systems.filter((item) => item && item.systemId && item.role);
  updateUserSystemAccess(userId, normalizedSystems);

  const updatedUser = getUserById(userId);
  if (!updatedUser) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }

  createAuditLog({ actor: updatedUser.email, action: "user.access.updated", details: "System access updated" });
  res.json({ success: true, user: buildUserResponse(updatedUser) });
});

app.get("/api/admin/audit-logs", (_req, res) => {
  const { start, end, action } = _req.query as { start?: string; end?: string; action?: string };
  const logs = getAuditLogs(100, { start: start ?? null, end: end ?? null, action: action ?? null });
  res.json({ success: true, logs });
});

app.get("/api/announcements", (_req, res) => {
  try {
    const userEmail = (_req.query as any).userEmail as string | undefined;
    let anns = getRecentAnnouncements();
    if (userEmail) {
      anns = anns.filter((a) => {
        if (!a.audienceType || a.audienceType === "all") return true;
        if (a.audienceType === "specific" && a.audienceJson) {
          try {
            const list = JSON.parse(a.audienceJson) as string[];
            return Array.isArray(list) ? list.includes(userEmail) : false;
          } catch (err) {
            return false;
          }
        }
        return false;
      });
    }
    res.json({ success: true, announcements: anns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to fetch announcements." });
  }
});

app.post("/api/admin/announcements", async (req, res) => {
  const { title, message, priority, audienceType, audience, attachmentUrl, attachmentData, attachmentName, scheduledAt, createdBy } = req.body as {
    title?: string;
    message?: string;
    priority?: string;
    audienceType?: string;
    audience?: string[];
    attachmentUrl?: string | null;
    attachmentData?: string | null;
    attachmentName?: string | null;
    scheduledAt?: string | null;
    createdBy?: string | null;
  };

  if (!title || !message) {
    res.status(400).json({ success: false, error: "Title and message required." });
    return;
  }

  try {
    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    let scheduledNormalized: string | null = null;
    if (scheduledAt) {
      let s = scheduledAt;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s = s + ":00";
      scheduledNormalized = s.replace("T", " ");
    }
    const created = await createAnnouncement({
      id,
      title,
      message,
      priority: priority ?? "normal",
      audienceType: audienceType ?? "all",
      audienceJson: audience ? JSON.stringify(audience) : null,
      attachmentUrl: attachmentUrl ?? null,
      attachmentData: attachmentData ?? null,
      attachmentName: attachmentName ?? null,
      scheduledAt: scheduledNormalized ?? null,
      createdBy: createdBy ?? "admin",
    });
    await createAuditLog({ actor: createdBy ?? "admin", action: "announcement.created", details: title });
    res.json({ success: true, announcement: created });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: "Unable to create announcement." });
  }
});

app.post("/api/announcements/:id/click", async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.body as { userEmail?: string };
  try {
    await recordAnnouncementClick(id, userEmail ?? null);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to record click." });
  }
});

app.get("/api/admin/announcements/:id/clicks", async (req, res) => {
  const { id } = req.params;
  try {
    const clicks = await getAnnouncementClicks(id);
    res.json({ success: true, clicks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to query clicks." });
  }
});

// Custom roles API
app.get("/api/admin/roles", async (_req, res) => {
  try {
    const roles = await getAllCustomRoles();
    res.json({ success: true, roles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to list roles." });
  }
});

app.post("/api/admin/roles", async (req, res) => {
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name) {
    res.status(400).json({ success: false, error: "Role name is required." });
    return;
  }
  try {
    const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const created = await createCustomRole({ id, name, description });
    await createAuditLog({ actor: "admin", action: "role.created", details: name });
    res.json({ success: true, role: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to create role." });
  }
});

app.put("/api/admin/roles/:roleId", async (req, res) => {
  const { roleId } = req.params;
  const { name, description } = req.body as { name?: string; description?: string };
  try {
    const updated = await updateCustomRole(roleId, { name, description });
    if (!updated) {
      res.status(404).json({ success: false, error: "Role not found." });
      return;
    }
    await createAuditLog({ actor: "admin", action: "role.updated", details: updated.name });
    res.json({ success: true, role: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to update role." });
  }
});

app.delete("/api/admin/roles/:roleId", async (req, res) => {
  const { roleId } = req.params;
  try {
    await deleteCustomRole(roleId);
    await createAuditLog({ actor: "admin", action: "role.deleted", details: roleId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Unable to delete role." });
  }
});

app.listen(PORT, () => {
  console.log(`RBA API running at http://localhost:${PORT}`);
});
