import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, GraduationCap, CalendarX, Wallet, ShieldCheck, Megaphone,
} from "lucide-react";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import { adminNav } from "@/lib/nav";
import { ANO_LETIVO_ATUAL, fetchAcademicRosters } from "@/lib/schoolData";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";

const fmtKz = (v: number) =>
  `${v.toLocaleString("pt-AO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kz`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalAlunosAnterior: 0,
    totalAlunosGeral: 0,
    totalTurmas: 0,
    faltasHoje: 0,
    propinasAtraso: 0,
    aprovacoes: 0,
  });
  const [desempenho, setDesempenho] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let active = true;
    const carregarDashboard = async () => {
      const ano = new Date().getFullYear();

      const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn(); } catch { return fallback; }
      };

      const academicRequest = safe(
        () => fetchAcademicRosters(),
        {
          atual: {
            anoLectivo: ANO_LETIVO_ATUAL,
            matriculas: [],
            confirmacoes: [],
            alunos: [],
            totalAlunos: 0,
            totalTurmas: 0,
            totalClasses: 0,
            porClasse: [],
            errors: [],
          },
          anterior: {
            anoLectivo: "2025/2026",
            matriculas: [],
            confirmacoes: [],
            alunos: [],
            totalAlunos: 0,
            totalTurmas: 0,
            totalClasses: 0,
            porClasse: [],
            errors: [],
          },
          totalAlunos: 0,
          totalAlunosAnterior: 0,
          totalAlunosGeral: 0,
        },
      );

      const aprovacoesRequest = safe(async () => {
        const { count } = await supabase.from("staff_profiles").select("id", { count: "exact", head: true }).eq("status", "pending");
        return count ?? 0;
      }, 0);

      const propinasAtrasoRequest = safe(async () => {
        const { data, error } = await dbFrom("pagamentos").select("valor_pago, multa").eq("pago", false);
        if (error) throw error;
        return ((data as any[]) ?? []).reduce((s, p) => s + Number(p.valor_pago || 0) + Number(p.multa || 0), 0);
      }, 0);

      const faltasHojeRequest = safe(async () => {
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await dbFrom("frequencias").select("id", { count: "exact", head: true }).eq("data", today).eq("presente", false);
        return count ?? 0;
      }, 0);

      const notasRequest = safe(async () => {
        const { data, error } = await dbFrom("mini_pautas")
          .select("media_final")
          .eq("ano_letivo", ano)
          .not("media_final", "is", null);
        if (error) throw error;
        return ((data as any[]) ?? []).map((n) => Number(n.media_final)).filter((v) => !isNaN(v));
      }, [] as number[]);
      const [academic, aprovacoes, propinasAtraso, faltasHoje, notas] = await Promise.all([
        academicRequest, aprovacoesRequest, propinasAtrasoRequest, faltasHojeRequest, notasRequest,
      ]);
      if (!active) return;
      setDesempenho([
        { name: "Bom (≥14)", value: notas.filter((v) => v >= 14).length, color: "hsl(142 71% 45%)" },
        { name: "Suficiente (10-13)", value: notas.filter((v) => v >= 10 && v < 14).length, color: "hsl(45 93% 47%)" },
        { name: "Reprovado (<10)", value: notas.filter((v) => v < 10).length, color: "hsl(0 84% 60%)" },
      ]);

      setStats({
        totalAlunos: academic.atual.totalAlunos,
        totalAlunosAnterior: academic.anterior.totalAlunos,
        totalAlunosGeral: academic.totalAlunosGeral,
        totalTurmas: academic.atual.totalTurmas,
        faltasHoje,
        propinasAtraso,
        aprovacoes,
      });
      setLoading(false);
    };

    carregarDashboard();
    const channel = supabase
      .channel("dashboard-academicos-2026-2027")
      .on("postgres_changes", { event: "*", schema: "public", table: "matriculas" }, carregarDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "confirmacoes" }, carregarDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "turmas" }, carregarDashboard)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const widgets = [
    {
      label: `Alunos ${ANO_LETIVO_ATUAL}`, value: loading ? "..." : stats.totalAlunos.toString(),
      icon: Users, tone: "border-l-[hsl(217_91%_60%)]", iconColor: "text-[hsl(217_91%_60%)]",
      onClick: () => navigate("/admin/dados"),
    },
    {
      label: "Alunos 2025/2026", value: loading ? "..." : stats.totalAlunosAnterior.toString(),
      icon: Users, tone: "border-l-[hsl(142_71%_45%)]", iconColor: "text-[hsl(142_71%_45%)]",
      onClick: () => navigate("/admin/reports"),
    },
    {
      label: "Total Geral de Alunos", value: loading ? "..." : stats.totalAlunosGeral.toString(),
      icon: Users, tone: "border-l-[hsl(262_83%_58%)]", iconColor: "text-[hsl(262_83%_58%)]",
      onClick: () => navigate("/admin/reports"),
    },
    {
      label: "Total de Turmas", value: loading ? "..." : stats.totalTurmas.toString(),
      icon: GraduationCap, tone: "border-l-[hsl(25_95%_53%)]", iconColor: "text-[hsl(25_95%_53%)]",
      onClick: () => navigate("/admin/dados"),
    },
    {
      label: "Faltas de Hoje", value: loading ? "..." : stats.faltasHoje.toString(),
      icon: CalendarX, tone: "border-l-[hsl(45_93%_47%)]", iconColor: "text-[hsl(45_93%_47%)]",
      onClick: () => navigate("/admin/reports"),
    },
    {
      label: "Propinas em Atraso", value: loading ? "..." : fmtKz(stats.propinasAtraso),
      icon: Wallet, tone: "border-l-destructive", iconColor: "text-destructive",
      onClick: () => navigate("/admin/reports"),
    },
  ];

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Painel Administrativo" navItems={adminNav}>
      <div className="w-full max-w-none space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-poppins font-bold text-2xl lg:text-3xl text-foreground">Cockpit Administrativo</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral e ações rápidas do sistema escolar</p>
          </div>
          <div className="flex items-center gap-3">

          </div>
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {widgets.map((w) => (
            <Card
              key={w.label}
              onClick={w.onClick}
              className={`border-l-4 ${w.tone} ${typeof w.onClick === "function" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{w.label}</CardTitle>
                <w.icon className={`h-5 w-5 ${w.iconColor}`} />
              </CardHeader>
              <CardContent>
                <p className="font-poppins font-bold text-2xl text-foreground">{w.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Desempenho Académico</CardTitle></CardHeader>
            <CardContent>
              {desempenho.every((d) => d.value === 0) ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem notas registadas ainda</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={desempenho} dataKey="value" nameKey="name" outerRadius={90} label>
                      {desempenho.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <AnnouncementsFeed role="admin" />
      </div>

      {/* Floating Action Button — Announcements */}
      <button
        onClick={() => navigate("/admin/announcements")}
        aria-label="Novo comunicado"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
      >
        <Megaphone className="h-6 w-6" />
      </button>
    </RoleLayout>
  );
};

export default Dashboard;
