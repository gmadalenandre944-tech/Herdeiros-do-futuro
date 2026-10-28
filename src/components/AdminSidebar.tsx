import { Link, useLocation } from "@/lib/router-compat";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import HFLogo from "./HFLogo";
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  DollarSign,
  CalendarCheck,
  FileText,
  ShieldPlus,
  LogOut,
  X,
} from "lucide-react";

const navItems = [
  { label: "Matrícula", path: "/matricula", icon: UserPlus },
  { label: "Mini Pauta", path: "/pauta", icon: ClipboardList },
  { label: "Documentos", path: "/documentos", icon: FileText },
  { label: "Administradores", path: "/administradores", icon: ShieldPlus },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar = ({ open, onClose }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate("/login");
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[min(16rem,calc(100vw-1.5rem))] bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:z-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border bg-sidebar/90">
          <div className="flex items-center gap-3">
            <HFLogo size="sm" className="bg-sidebar-primary" />
            <div>
              <h2 className="font-display font-semibold text-base leading-tight">Herdeiros</h2>
              <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">do Futuro</p>
            </div>
          </div>
          <button data-testid="button-close-admin-sidebar" aria-label="Fechar menu administrativo" className="lg:hidden p-1 hover:bg-sidebar-accent rounded-lg" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Navegação administrativa" className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                data-testid={`link-admin-${item.path.replaceAll("/", "-").replace(/^-/, "")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            data-testid="button-admin-logout"
            aria-label="Terminar sessão"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Terminar Sessão
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
