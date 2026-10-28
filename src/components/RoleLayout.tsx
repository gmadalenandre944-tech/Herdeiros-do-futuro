import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import RoleSidebar, { type NavItem } from "./RoleSidebar";
import AppFooter from "./AppFooter";
import HFLogo from "./HFLogo";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAutoVinculo } from "@/hooks/useAutoVinculo";


interface RoleLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  headerLabel: string;
  navItems: NavItem[];
}

const RoleLayout = ({ children, title, subtitle, headerLabel, navItems }: RoleLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useRealtimeNotifications();
  useAutoVinculo();

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <RoleSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={title}
        subtitle={subtitle}
        navItems={navItems}
      />

      <div className="flex-1 flex min-w-0 flex-col min-h-screen">
        <header className="bg-card/90 backdrop-blur-md border-b border-border h-16 flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <button
            data-testid="button-open-sidebar"
            aria-label="Abrir menu"
            className="lg:hidden p-2 -ml-2 mr-2 hover:bg-muted rounded-xl transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <HFLogo size="sm" className="mr-3" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.17em] text-muted-foreground leading-none mb-1">Herdeiros do Futuro</p>
            <h1 className="font-semibold text-sm text-foreground truncate">{headerLabel}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistema operacional
          </div>
        </header>


        <main className="relative flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          {children}
        </main>

        <AppFooter />
      </div>
    </div>
  );
};

export default RoleLayout;
