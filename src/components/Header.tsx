import { useState } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import HFLogo from "@/components/HFLogo";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface NavItem {
  label: string;
  path: string;
}

const adminNav: NavItem[] = [
  { label: "Matrícula", path: "/matricula" },
  { label: "Mini Pauta", path: "/pauta" },
  { label: "Documentos", path: "/documentos" },
  { label: "Administradores", path: "/administradores" },
];

const professorNav: NavItem[] = [
  { label: "Painel", path: "/professor" },
];

const alunoNav: NavItem[] = [
  { label: "Painel", path: "/aluno" },
];

const encarregadoNav: NavItem[] = [
  { label: "Painel", path: "/encarregado" },
];

const secretarioNav: NavItem[] = [
  { label: "Painel", path: "/secretario" },
];

const navByRole: Record<AppRole, NavItem[]> = {
  admin: adminNav,
  professor: professorNav,
  aluno: alunoNav,
  encarregado: encarregadoNav,
  secretario: secretarioNav,
};

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useUserRole();

  const navItems = role ? navByRole[role] : [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate("/login");
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to={role === "admin" ? "/admin" : `/${role}`} className="flex items-center gap-3">
          <HFLogo size="sm" className="bg-primary-foreground text-primary" />
          <span className="font-montserrat font-bold text-lg hidden sm:block">
            Herdeiros do Futuro
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary-foreground/20"
                  : "hover:bg-primary-foreground/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="ml-2 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>

        <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t border-primary-foreground/20 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`block px-6 py-3 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary-foreground/20"
                  : "hover:bg-primary-foreground/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-left px-6 py-3 text-sm font-medium hover:bg-primary-foreground/10 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
      )}
    </header>
  );
};

export default Header;
