import { Navigate } from "@/lib/router-compat";
import { useUserRole } from "@/hooks/useUserRole";
import { roleHomePaths } from "@/components/RoleGuard";

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { role, loading, user } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-xs space-y-3">
          <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
          <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
          <div className="h-10 w-5/6 rounded-xl bg-muted animate-pulse" />
          <p className="text-xs text-muted-foreground text-center pt-2">A preparar o seu espaço...</p>
        </div>
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={roleHomePaths[role]} replace />;
  }

  return <>{children}</>;
};

export default AuthRedirect;
