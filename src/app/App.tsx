import { useState } from "react";
import { AuthProvider, useAuth, SystemId } from "./components/auth-context";
import { LoginPage } from "./components/login-page";
import { PortalHome } from "./components/portal-home";
import { SystemShell } from "./components/system-shell";

function AppShell() {
  const { currentUser } = useAuth();
  const [activeSystem, setActiveSystem] = useState<SystemId | null>(null);

  if (!currentUser) return <LoginPage />;

  if (activeSystem) {
    return (
      <SystemShell
        systemId={activeSystem}
        onBack={() => setActiveSystem(null)}
      />
    );
  }

  return <PortalHome onEnterSystem={setActiveSystem} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
