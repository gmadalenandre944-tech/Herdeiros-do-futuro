import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, CalendarCheck, AlertTriangle, BookOpen as BookIcon, FileType2, Printer } from "lucide-react";
import {
  Megaphone, BookOpen, ClipboardList, BarChart3, FileText, ShieldPlus, Settings, UserPlus, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { baixarWord, cabecalhoHtml, assinaturaHtml } from "@/lib/wordDocs";
import { ANO_LETIVO_ATUAL, fetchAcademicRosters } from "@/lib/schoolData";
import { normalizarMesPagamento } from "@/lib/paymentData";

const adminNav = [
  { label: "Matrícula", path: "/matricula", icon: UserPlus },
  { label: "Confirmação", path: "/confirmacao", icon: RotateCcw },
  { label: "Comunicados", path: "/admin/announcements", icon: Megaphone },
  { label: "Cursos e Disciplinas", path: "/admin/courses", icon: BookOpen },
  { label: "Pauta Geral", path: "/admin/pauta-geral", icon: ClipboardList },
  { label: "Mini Pauta", path: "/pauta", icon: ClipboardList },
  { label: "Relatórios", path: "/admin/reports", icon: BarChart3 },
  { label: "Documentos", path: "/documentos", icon: FileText },
  { label: "Administradores", path: "/administradores", icon: ShieldPlus },
  { label: "Configurações", path: "/admin/settings", icon: Settings },
];

const fmtKz = (v: number) => `${v.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [escola, setEscola] = useState("Colégio Herdeiros do Futuro");
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalAlunosAnterior: 0,
    totalAlunosGeral: 0,
    totalTurmas: 0,
    porClasse: [] as { classe: string; count: number }[],
    receitaTotal: 0,
    receitaMes: 0,
    multasTotal: 0,
    pagamentosPendentes: 0,
    presencas: 0,
    faltas: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: setting, error: settingError } = await dbFrom("system_settings").select("nome_instituicao").maybeSingle();
        if (settingError) throw settingError;
        if (!cancelled && setting?.nome_instituicao) setEscola(setting.nome_instituicao);
      const now = new Date();
      const mes = now.getMonth() + 1;
      const ano = now.getFullYear();

      const [academicRosters, pagosRes, propinasRes, pendentesRes, freqRes] = await Promise.all([
        fetchAcademicRosters(),
        dbFrom("pagamentos").select("valor_pago, multa, mes, ano_referencia, data_pagamento").eq("pago", true),
        dbFrom("pagamentos_propinas").select("*"),
        dbFrom("pagamentos").select("id", { count: "exact", head: true }).eq("pago", false),
        supabase.from("frequencia").select("presente"),
      ]);

      if (pagosRes.error) throw pagosRes.error;
      if (propinasRes.error) throw propinasRes.error;
      if (pendentesRes.error) throw pendentesRes.error;
      if (freqRes.error) throw freqRes.error;
      const pagamentosOnline = pagosRes.data ?? [];
      const recibosSecretaria = ((propinasRes.data as any[]) ?? []).filter((payment) =>
        ["pago", "paid", "confirmado", "liquidado"].includes(
          String(payment?.estado ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
        ),
      );
      const pagamentos = [
        ...pagamentosOnline.map((payment: any) => ({ ...payment, multa: Number(payment.multa ?? 0) })),
        ...recibosSecretaria.map((payment: any) => ({ ...payment, multa: 0 })),
      ];
      const yearOf = (payment: any) => {
        const reference = Number(payment.ano_referencia);
        if (Number.isInteger(reference) && reference >= 2000) return reference;
        const dateYear = String(payment.data_pagamento ?? "").slice(0, 4);
        return /^\d{4}$/.test(dateYear) ? Number(dateYear) : null;
      };
      const receitaTotal = pagamentos.reduce((sum: number, payment: any) =>
        sum + Number(payment.valor_pago || 0) + Number(payment.multa || 0), 0);
      const receitaMes = pagamentos
        .filter((payment: any) => normalizarMesPagamento(payment.mes) === mes && yearOf(payment) === ano)
        .reduce((sum: number, payment: any) => sum + Number(payment.valor_pago || 0) + Number(payment.multa || 0), 0);
      const multasTotal = pagamentosOnline.reduce((sum: number, payment: any) => sum + Number(payment.multa || 0), 0);

      const freq = freqRes.data ?? [];
      const presencas = freq.filter((f: any) => f.presente).length;
      const faltas = freq.filter((f: any) => !f.presente).length;

      if (!cancelled) setStats({
        totalAlunos: academicRosters.atual.totalAlunos,
        totalAlunosAnterior: academicRosters.anterior.totalAlunos,
        totalAlunosGeral: academicRosters.totalAlunosGeral,
        totalTurmas: academicRosters.atual.totalTurmas,
        porClasse: academicRosters.atual.porClasse,
        receitaTotal,
        receitaMes,
        multasTotal,
        pagamentosPendentes: pendentesRes.count ?? 0,
        presencas,
        faltas,
      });
      } catch (error: any) {
        console.error("[AdminReports] falha ao carregar indicadores:", error);
        if (!cancelled) toast.error(`Não foi possível carregar o relatório: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Máximo para cálculo proporcional das barras dinâmicas
  const maxAlunosClasse = Math.max(...stats.porClasse.map(c => c.count), 1);

  const exportarRelatorioWord = () => {
    const dataAtual = new Date().toLocaleDateString("pt-AO");
    const linhasClasses = stats.porClasse.length 
      ? stats.porClasse.map(c => `<tr><td style="border: 1px solid #ccc; padding: 8px;"><b>${c.classe}</b></td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${c.count} aluno(s)</td></tr>`).join("")
      : `<tr><td colspan="2" style="border: 1px solid #ccc; padding: 8px; text-align: center;">Sem registos.</td></tr>`;

    const corpo = 
      cabecalhoHtml(escola, "RELATÓRIO GERAL DE GESTÃO ACADÉMICA") +
      `<p style="font-size: 11pt; color: #555; text-align: right; margin-bottom: 20px;">Data de Emissão: ${dataAtual}</p>` +
      `<h3 style="color: #1e3a8a; border-bottom: 1px solid #1e3a8a; padding-bottom: 5px;">1. Resumo Geral de Estatísticas</h3>` +
      `<table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 10px; margin-bottom: 20px;">
         <tr style="background-color: #f2f2f2;"><th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Indicador</th><th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Valor Registado</th></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px;">Alunos ${ANO_LETIVO_ATUAL}</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.totalAlunos}</b></td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px;">Alunos 2025/2026</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.totalAlunosAnterior}</b></td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px;">Total Geral de Alunos</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.totalAlunosGeral}</b></td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px;">Total de Turmas</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.totalTurmas}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Receita do Mês Corrente</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${fmtKz(stats.receitaMes)}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Receita Acumulada Total</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${fmtKz(stats.receitaTotal)}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Multas Acumuladas</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${fmtKz(stats.multasTotal)}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Pagamentos Pendentes</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.pagamentosPendentes}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Presenças Registadas</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.presencas}</b></td></tr>
         <tr><td style="border: 1px solid #ccc; padding: 8px;">Faltas Registadas</td><td style="border: 1px solid #ccc; padding: 8px; text-align: right;"><b>${stats.faltas}</b></td></tr>
       </table>` +
      `<h3 style="color: #1e3a8a; border-bottom: 1px solid #1e3a8a; padding-bottom: 5px;">2. Distribuição de Alunos por Classe</h3>` +
      `<table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 10px;">
         <tr style="background-color: #f2f2f2;"><th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Classe / Ano</th><th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Nº de Alunos</th></tr>
         ${linhasClasses}
       </table>` +
      assinaturaHtml();

    baixarWord("relatorio-geral-academico", "Relatório Académico Geral", corpo);
    toast.success("Relatório descarregado em formato Word com sucesso!");
  };

  const cards = [
    { label: `Alunos ${ANO_LETIVO_ATUAL}`, value: stats.totalAlunos.toString(), icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Alunos 2025/2026", value: stats.totalAlunosAnterior.toString(), icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Total Geral de Alunos", value: stats.totalAlunosGeral.toString(), icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Total de Turmas", value: stats.totalTurmas.toString(), icon: BookIcon, color: "text-orange-600 bg-orange-50" },
    { label: "Receita do Mês", value: fmtKz(stats.receitaMes), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Receita Total", value: fmtKz(stats.receitaTotal), icon: DollarSign, color: "text-indigo-600 bg-indigo-50" },
    { label: "Multas Acumuladas", value: fmtKz(stats.multasTotal), icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { label: "Pagamentos Pendentes", value: stats.pagamentosPendentes.toString(), icon: AlertTriangle, color: "text-rose-600 bg-rose-50" },
    { label: "Presenças Registadas", value: stats.presencas.toString(), icon: CalendarCheck, color: "text-cyan-600 bg-cyan-50" },
    { label: "Faltas Registadas", value: stats.faltas.toString(), icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Relatórios Académicos" navItems={adminNav}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Relatórios Académicos e Estatísticas</h1>
            <p className="text-muted-foreground mt-1">Análise geral da instituição, desempenho financeiro e distribuição de alunos.</p>
          </div>
          <Button onClick={exportarRelatorioWord} className="gap-2 self-start sm:self-auto">
            <FileType2 className="h-4 w-4" /> Baixar Relatório em Word (.docx)
          </Button>
        </div>

        {/* Cartões de Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</CardTitle>
                <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="h-5 w-5" /></div>
              </CardHeader>
              <CardContent><p className="font-montserrat font-bold text-xl text-foreground">{loading ? "..." : c.value}</p></CardContent>
            </Card>
          ))}
        </div>

        {/* Gráfico Dinâmico de Barras por Classe */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookIcon className="h-5 w-5 text-primary" /> Distribuição Visual por Classe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm py-4">A carregar dados estatísticos...</p>
            ) : stats.porClasse.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">Nenhum aluno registado na base de dados.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {stats.porClasse.map((c) => {
                  const percentual = Math.round((c.count / maxAlunosClasse) * 100);
                  return (
                    <div key={c.classe} className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-foreground">{c.classe}</span>
                        <span className="font-mono text-muted-foreground">{c.count} aluno(s)</span>
                      </div>
                      <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(percentual, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default AdminReports;