import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import HFLogo from "./HFLogo";
import { LogOut, X } from "lucide-react";
import type { NavItem } from "@/lib/nav";

export type { NavItem };

interface RoleSidebarProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  navItems: NavItem[];
}

const RoleSidebar = ({ open, onClose, title, subtitle, navItems }: RoleSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState(0);

  const hasApprovalBadge = navItems.some((i) => i.badgeKey === "approvals");

  useEffect(() => {
    if (!hasApprovalBadge) return;
    let active = true;
    const load = async () => {
      // Não consulta enquanto o separador está escondido.
      if (typeof document !== "undefined" && document.hidden) return;
      const { count } = await supabase
        .from("staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (active) setApprovals(count ?? 0);
    };
    load();
    const t = setInterval(load, 120000);
    return () => { active = false; clearInterval(t); };
  }, [hasApprovalBadge]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate("/login");
  };

  const badgeFor = (item: NavItem) => (item.badgeKey === "approvals" ? approvals : 0);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[min(16rem,calc(100vw-1.5rem))] bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:z-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border bg-sidebar/90">
          <div className="flex items-center gap-3">
            <HFLogo size="sm" className="bg-sidebar-primary" />
            <div>
              <h2 className="font-display font-semibold text-base leading-tight tracking-tight">{title}</h2>
              <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">{subtitle}</p>
            </div>
          </div>
          <button data-testid="button-close-sidebar" aria-label="Fechar menu" className="lg:hidden p-1 hover:bg-sidebar-accent rounded-lg" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label={`Navegação de ${title}`} className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            const showSection = item.section && item.section !== navItems[idx - 1]?.section;
            const count = badgeFor(item);
            return (
              <div key={`${item.path}-${idx}`}>
                {showSection && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {item.section}
                  </p>
                )}
                <Link
                  to={item.path}
                  onClick={onClose}
                  data-testid={`link-nav-${item.path.replaceAll("/", "-").replace(/^-/, "") || "inicio"}-${idx}`}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "" : "group-hover:scale-105"}`} />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            data-testid="button-logout"
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

export default RoleSidebar;
