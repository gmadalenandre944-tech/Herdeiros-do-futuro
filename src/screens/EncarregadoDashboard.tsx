import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import { LayoutDashboard, Users, Wallet, GraduationCap } from "lucide-react";

const encarregadoNav = [
  { label: "Início", path: "/encarregado", icon: LayoutDashboard },
  { label: "Meus Educandos", path: "/encarregado/students", icon: Users },
  { label: "Pagamentos", path: "/encarregado/payments", icon: Wallet },
];

const EncarregadoDashboard = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setNome(data.nome);
    });
  }, [user]);

  return (
    <RoleLayout title="Encarregado" subtitle="Herdeiros do Futuro" headerLabel="Painel do Encarregado" navItems={encarregadoNav}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Área da família</p>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-foreground">Olá, {nome || "Encarregado"}.</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o progresso do seu educando</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Educandos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-montserrat text-foreground">0</p></CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Média do Educando</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-montserrat text-foreground">—</p></CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Propinas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-montserrat text-green-600">Em dia</p></CardContent>
          </Card>
        </div>

        <AnnouncementsFeed role="encarregado" />
      </div>
    </RoleLayout>
  );
};

export default EncarregadoDashboard;
