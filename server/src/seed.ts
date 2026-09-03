import bcrypt from "bcryptjs";
import { db, initSchema } from "./db.js";

const SYSTEMS = [
  { id: "system-a", label: "Asset Management System", description: "Asset lifecycle tracking and maintenance", color: "#2563eb", accent_bg: "#dbeafe", tag: "Assets", url: "https://ndc-ams.transcend-enterprise.com/login" },
  { id: "system-b", label: "Project Management System", description: "Project planning, milestones, and delivery tracking", color: "#7c3aed", accent_bg: "#ede9fe", tag: "Projects", url: "https://ndc-pms.transcend-enterprise.com/" },
  { id: "system-c", label: "Human Resource Information System", description: "HR, attendance, and workforce records", color: "#0891b2", accent_bg: "#cffafe", tag: "Human Resources", url: "https://hris.ndc.gov.ph/" },
  { id: "system-d", label: "Financial Management System", description: "Budgeting, procurement, and financial operations", color: "#059669", accent_bg: "#d1fae5", tag: "Finance", url: "https://fms.ndc.gov.ph/NDC_FMS" },
  { id: "system-e", label: "Compliance Monitoring System", description: "Compliance tracking, monitoring, and reporting", color: "#d97706", accent_bg: "#fef3c7", tag: "Compliance", url: "http://localhost:5177/" },
];

const USERS = [
  {
    id: "u1",
    email: "admin@company.com",
    password: "admin123",
    name: "Alexandra Chen",
    avatar: "AC",
    department: "IT Administration",
    is_super_admin: 1,
    systems: [
      { system_id: "system-a", role: "admin" },
      { system_id: "system-b", role: "admin" },
      { system_id: "system-c", role: "admin" },
      { system_id: "system-d", role: "admin" },
      { system_id: "system-e", role: "admin" },
    ],
  },
  {
    id: "u2",
    email: "manager@company.com",
    password: "manager123",
    name: "Marcus Rivera",
    avatar: "MR",
    department: "Product",
    is_super_admin: 0,
    systems: [
      { system_id: "system-a", role: "manager" },
      { system_id: "system-b", role: "viewer" },
      { system_id: "system-c", role: "manager" },
    ],
  },
  {
    id: "u3",
    email: "user@company.com",
    password: "user123",
    name: "Priya Nair",
    avatar: "PN",
    department: "Design",
    is_super_admin: 0,
    systems: [
      { system_id: "system-a", role: "viewer" },
      { system_id: "system-d", role: "viewer" },
    ],
  },
  {
    id: "u4",
    email: "ops@company.com",
    password: "ops123",
    name: "Jordan Lee",
    avatar: "JL",
    department: "Operations",
    is_super_admin: 0,
    systems: [
      { system_id: "system-a", role: "manager" },
      { system_id: "system-d", role: "manager" },
      { system_id: "system-e", role: "viewer" },
    ],
  },
];

const ROLES = [
  { id: "r_admin", name: "Admin", description: "Full administrative privileges" },
  { id: "r_manager", name: "Manager", description: "Can manage resources and teams" },
  { id: "r_viewer", name: "Viewer", description: "Read-only access" },
];

export function seedDatabase() {
  initSchema();

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

  const insertSystem = db.prepare(`
    INSERT INTO systems (id, label, description, color, accent_bg, tag, url)
    VALUES (@id, @label, @description, @color, @accent_bg, @tag, @url)
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar, department, is_super_admin)
    VALUES (@id, @email, @password_hash, @name, @avatar, @department, @is_super_admin)
  `);

  const insertAccess = db.prepare(`
    INSERT INTO user_system_access (user_id, system_id, role)
    VALUES (@user_id, @system_id, @role)
  `);

  const seed = db.transaction(() => {
    for (const sys of SYSTEMS) {
      insertSystem.run({
        ...sys,
        url: sys.url ?? null,
      });
    }

    const insertRole = db.prepare(`INSERT INTO custom_roles (id, name, description) VALUES (@id, @name, @description)`);
    for (const r of ROLES) {
      insertRole.run({ id: r.id, name: r.name, description: r.description });
    }

    for (const user of USERS) {
      const password_hash = bcrypt.hashSync(user.password, 10);
      insertUser.run({
        id: user.id,
        email: user.email,
        password_hash,
        name: user.name,
        avatar: user.avatar,
        department: user.department,
        is_super_admin: user.is_super_admin,
      });

      for (const access of user.systems) {
        insertAccess.run({
          user_id: user.id,
          system_id: access.system_id,
          role: access.role,
        });
      }
    }
  });

  seed();
  console.log("Database seeded with demo users and systems.");
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase();
}
