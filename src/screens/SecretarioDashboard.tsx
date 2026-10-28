import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import { fetchBaseEscolar } from "@/lib/schoolData";
import { toast } from "sonner";
import {
  LayoutDashboard, UserCheck, DollarSign, Megaphone, ClipboardList,
} from "lucide-react";

const secretarioNav = [
  { label: "Dashboard", path: "/secretario", icon: LayoutDashboard },
  { label: "Validação de Matrículas", path: "/secretario/enrollment", icon: UserCheck },
  { label: "Pagamentos/Tesouraria", path: "/secretario/payments", icon: DollarSign },
  { label: "Emissão de Listagens", path: "/secretario/lists", icon: ClipboardList },
  { label: "Comunicados", path: "/secretario/announcements", icon: Megaphone },
];

const SecretarioDashboard = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [alunosRegistados, setAlunosRegistados] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (!cancelled && data) setNome(data.nome);
      } catch (error: any) {
        console.error("[SecretarioDashboard] falha ao carregar o perfil:", error);
        if (!cancelled) toast.error(`Não foi possível carregar o perfil: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      }
    })();
    void (async () => {
      try {
        const base = await fetchBaseEscolar();
        if (!cancelled) setAlunosRegistados(base.alunos.length);
      } catch (error: any) {
        console.error("[SecretarioDashboard] falha ao carregar alunos:", error);
        if (!cancelled) toast.error(`Não foi possível carregar o número de alunos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Painel da Secretaria" navItems={secretarioNav}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Área da secretaria</p>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-foreground">Olá, {nome || "Secretário(a)"}.</h1>
          <p className="text-muted-foreground text-sm mt-1">Painel da Secretaria</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Alunos Registados</CardTitle></CardHeader>
            <CardContent><p className="font-montserrat font-bold text-2xl text-accent">{alunosRegistados}</p></CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pagamentos Hoje</CardTitle></CardHeader>
            <CardContent><p className="font-montserrat font-bold text-2xl text-foreground">0</p></CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Documentos Emitidos</CardTitle></CardHeader>
            <CardContent><p className="font-montserrat font-bold text-2xl text-foreground">0</p></CardContent>
          </Card>
        </div>

        <AnnouncementsFeed role="secretario" />
      </div>
    </RoleLayout>
  );
};

export default SecretarioDashboard;
