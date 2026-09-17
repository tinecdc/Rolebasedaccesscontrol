import { createContext, useContext, useState, ReactNode, useMemo } from "react";

// Allow arbitrary role strings (custom roles supported)
export type Role = string;
export type SystemId = string;

const DEFAULT_SYSTEM_CATALOG: SystemCatalogItem[] = [
  { id: "system-a", label: "Asset Management System", description: "Asset lifecycle tracking and maintenance", color: "#2563eb", accentBg: "#dbeafe", tag: "Assets", url: "https://ndc-ams.transcend-enterprise.com/login" },
  { id: "system-b", label: "Project Management System", description: "Project planning, milestones, and delivery tracking", color: "#7c3aed", accentBg: "#ede9fe", tag: "Projects", url: "https://ndc-pms.transcend-enterprise.com/" },
  { id: "system-c", label: "Human Resource Information System", description: "HR, attendance, and workforce records", color: "#0891b2", accentBg: "#cffafe", tag: "Human Resources", url: "https://hris.ndc.gov.ph/" },
  { id: "system-d", label: "Financial Management System", description: "Budgeting, procurement, and financial operations", color: "#059669", accentBg: "#d1fae5", tag: "Finance", url: "https://fms.ndc.gov.ph/NDC_FMS" },
  { id: "system-e", label: "Compliance Monitoring System", description: "Compliance tracking, monitoring, and reporting", color: "#d97706", accentBg: "#fef3c7", tag: "Compliance", url: "http://localhost:5174/" },
  { id: "system-f", label: "IT Ticketing System", description: "IT requests, incidents, and service tracking", color: "#ef4444", accentBg: "#fee2e2", tag: "IT Services", url: "http://localhost:5175/" },
];

export interface SystemAccess {
  systemId: SystemId;
  role: Role;
}

export interface SystemCatalogItem {
  id: SystemId;
  label: string;
  description: string;
  color: string;
  accentBg: string;
  tag: string;
  url?: string;
  altUrl?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  isSuperAdmin: boolean;
  systems: SystemAccess[];
}

export const SYSTEMS: Record<SystemId, { label: string; description: string; color: string; accentBg: string; tag: string }> = {};

function syncSystemCatalog(catalog: SystemCatalogItem[]) {
  Object.keys(SYSTEMS).forEach((key) => delete SYSTEMS[key]);
  catalog.forEach((item) => {
    SYSTEMS[item.id] = {
      label: item.label,
      description: item.description,
      color: item.color,
      accentBg: item.accentBg,
      tag: item.tag,
    };
  });
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getSystemAccess: (systemId: SystemId) => SystemAccess | null;
  systemCatalog: SystemCatalogItem[];
  refreshSystemCatalog: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemCatalog, setSystemCatalog] = useState<SystemCatalogItem[]>(DEFAULT_SYSTEM_CATALOG);

  const refreshSystemCatalog = async () => {
    try {
      const res = await fetch("/api/admin/systems");
      const data = (await res.json()) as { success?: boolean; systems?: SystemCatalogItem[] };
      if (res.ok && data.success && Array.isArray(data.systems)) {
        setSystemCatalog(data.systems);
        syncSystemCatalog(data.systems);
      }
    } catch {
      // keep existing catalog if the server is unavailable
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { success: boolean; error?: string; user?: User };

      if (!res.ok || !data.success || !data.user) {
        return { success: false, error: data.error ?? "Login failed." };
      }

      setCurrentUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the server. Start the API with: pnpm dev:server" };
    }
  };

  const logout = () => setCurrentUser(null);

  const getSystemAccess = (systemId: SystemId): SystemAccess | null => {
    if (!currentUser) return null;
    return currentUser.systems.find((s) => s.systemId === systemId) ?? null;
  };

  const value = useMemo(() => ({ currentUser, login, logout, getSystemAccess, systemCatalog, refreshSystemCatalog }), [currentUser, systemCatalog]);

  useMemo(() => {
    syncSystemCatalog(systemCatalog);
  }, [systemCatalog]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
