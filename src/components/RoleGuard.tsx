import { Navigate } from "@/lib/router-compat";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

const roleHomePaths: Record<AppRole, string> = {
  admin: "/admin",
  professor: "/professor",
  aluno: "/aluno",
  encarregado: "/encarregado",
  secretario: "/secretaria",
};

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { role, loading, user } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-xs space-y-3">
          <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
          <div className="h-10 w-5/6 rounded-xl bg-muted animate-pulse" />
          <p className="text-xs text-muted-foreground text-center pt-2">A validar o seu acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;

  // O administrador tem acesso a todos os painéis.
  if (role !== "admin" && !allowedRoles.includes(role)) {
    return <Navigate to={roleHomePaths[role]} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
export { roleHomePaths };
