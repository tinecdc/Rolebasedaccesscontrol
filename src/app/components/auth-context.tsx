import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "admin" | "manager" | "viewer";
export type SystemId = "system-a" | "system-b" | "system-c" | "system-d" | "system-e";

export interface SystemAccess {
  systemId: SystemId;
  role: Role;
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

export const SYSTEMS: Record<SystemId, { label: string; description: string; color: string; accentBg: string; tag: string }> = {
  "system-a": { label: "System A", description: "Core operations & workflow management", color: "#2563eb", accentBg: "#dbeafe", tag: "Operations" },
  "system-b": { label: "System B", description: "Financial reporting & budget tracking", color: "#7c3aed", accentBg: "#ede9fe", tag: "Finance" },
  "system-c": { label: "System C", description: "Customer relationship management", color: "#0891b2", accentBg: "#cffafe", tag: "CRM" },
  "system-d": { label: "System D", description: "Inventory & supply chain control", color: "#059669", accentBg: "#d1fae5", tag: "Inventory" },
  "system-e": { label: "System E", description: "IT infrastructure & support desk", color: "#d97706", accentBg: "#fef3c7", tag: "IT" },
};

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "admin@company.com": {
    password: "admin123",
    user: {
      id: "u1",
      name: "Alexandra Chen",
      email: "admin@company.com",
      avatar: "AC",
      department: "IT Administration",
      isSuperAdmin: true,
      systems: [
        { systemId: "system-a", role: "admin" },
        { systemId: "system-b", role: "admin" },
        { systemId: "system-c", role: "admin" },
        { systemId: "system-d", role: "admin" },
        { systemId: "system-e", role: "admin" },
      ],
    },
  },
  "manager@company.com": {
    password: "manager123",
    user: {
      id: "u2",
      name: "Marcus Rivera",
      email: "manager@company.com",
      avatar: "MR",
      department: "Product",
      isSuperAdmin: false,
      systems: [
        { systemId: "system-a", role: "manager" },
        { systemId: "system-b", role: "viewer" },
        { systemId: "system-c", role: "manager" },
      ],
    },
  },
  "user@company.com": {
    password: "user123",
    user: {
      id: "u3",
      name: "Priya Nair",
      email: "user@company.com",
      avatar: "PN",
      department: "Design",
      isSuperAdmin: false,
      systems: [
        { systemId: "system-a", role: "viewer" },
        { systemId: "system-d", role: "viewer" },
      ],
    },
  },
  "ops@company.com": {
    password: "ops123",
    user: {
      id: "u4",
      name: "Jordan Lee",
      email: "ops@company.com",
      avatar: "JL",
      department: "Operations",
      isSuperAdmin: false,
      systems: [
        { systemId: "system-a", role: "manager" },
        { systemId: "system-d", role: "manager" },
        { systemId: "system-e", role: "viewer" },
      ],
    },
  },
};

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getSystemAccess: (systemId: SystemId) => SystemAccess | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 600));
    const record = MOCK_USERS[email.toLowerCase()];
    if (!record) return { success: false, error: "No account found with that email." };
    if (record.password !== password) return { success: false, error: "Incorrect password." };
    setCurrentUser(record.user);
    return { success: true };
  };

  const logout = () => setCurrentUser(null);

  const getSystemAccess = (systemId: SystemId): SystemAccess | null => {
    if (!currentUser) return null;
    return currentUser.systems.find((s) => s.systemId === systemId) ?? null;
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, getSystemAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
