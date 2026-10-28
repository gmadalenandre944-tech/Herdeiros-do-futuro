import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import HFLogo from "./HFLogo";
import { useUserRole } from "@/hooks/useUserRole";


const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role } = useUserRole();

  // Only show sidebar for admin role
  const showSidebar = role === "admin";

  if (!showSidebar) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <header className="bg-primary text-primary-foreground h-16 flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-30 shadow-md">
          <HFLogo size="sm" />
          <span className="font-display font-semibold text-lg">Herdeiros do Futuro</span>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex min-w-0 flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-card/90 backdrop-blur-md border-b border-border h-16 flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <button
            data-testid="button-open-admin-sidebar"
            aria-label="Abrir menu administrativo"
            className="lg:hidden p-2 -ml-2 mr-2 hover:bg-muted rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <HFLogo size="sm" className="mr-3" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.17em] text-muted-foreground leading-none mb-1">Herdeiros do Futuro</p>
            <h1 className="font-semibold text-sm text-foreground">Painel Administrativo</h1>
          </div>
        </header>


        {/* Content */}
        <main className="relative flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
