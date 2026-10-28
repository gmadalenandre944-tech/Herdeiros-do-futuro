import { useCallback, useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { secretarioNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { PiggyBank, FileDown, FileText, Send, TrendingUp, TrendingDown, DollarSign, Plus, Printer, X, RefreshCw, Search, Check, LoaderCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cabecalhoOficial, hojeExtenso } from "@/lib/officialDocs";
import { fetchBaseEscolar, normalizeClasseOficial } from "@/lib/schoolData";

type FinanceRow = {
  id: string;
  aluno_id?: string | null;
  matricula_id?: number | string | null;
  aluno_nome_manual?: string | null;
  tipo_movimento?: string | null;
  valor_pago?: number | string | null;
  valor?: number | string | null;
  multa?: number | string | null;
  tipo?: string | null;
  pago?: boolean | null;
  comprovativo_status?: string | null;
  data_pagamento?: string | null;
};
type StudentOption = { id: string; nome: string; processo: string; classe: string; turma: string };

const fmtKz = (v: number) => `${Number(v || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
const dataLocalHoje = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const periodoRange = (p: string) => {
  const now = new Date();
  const fim = new Date(now);
  const ini = new Date(now);
  if (p === "semanal") ini.setDate(now.getDate() - 6);
  else if (p === "mensal") ini.setMonth(now.getMonth() - 1);
  else if (p === "anual") ini.setFullYear(now.getFullYear() - 1);
  const localISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { ini: localISO(ini), fim: localISO(fim) };
};

const SecretarioFinancas = () => {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState("mensal");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "liquidado" | "pendente">("todos");
  const [pagamentos, setPagamentos] = useState<FinanceRow[]>([]);
  const [alunos, setAlunos] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [descricaoManual, setDescricaoManual] = useState("");
  const [tipoMovimento, setTipoMovimento] = useState<"receita" | "despesa">("receita");
  const [valorManual, setValorManual] = useState("");
  const [multaManual, setMultaManual] = useState("0");
  const [categoria, setCategoria] = useState("propina");
  const [registando, setRegistando] = useState(false);
  const [associarAluno, setAssociarAluno] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [alunoBuscaAberta, setAlunoBuscaAberta] = useState(false);
  const { ini, fim } = useMemo(() => periodoRange(periodo), [periodo]);

  const fetchDados = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [rowsResult, base] = await Promise.all([
        dbFrom("pagamentos").select("*").order("data_pagamento", { ascending: false }).limit(5000),
        fetchBaseEscolar(),
      ]);
      if (rowsResult.error) throw rowsResult.error;
      const turmaById = new Map(base.turmas.map((turma) => [turma.id, turma]));
      setAlunos(base.alunos.map((aluno) => {
        const turma = aluno.turma_id ? turmaById.get(aluno.turma_id) : undefined;
        return {
          id: aluno.id,
          nome: aluno.nome,
          processo: aluno.numero_processo ?? "",
          classe: normalizeClasseOficial(aluno.classe ?? turma?.classe),
          turma: turma?.nome ?? "Sem turma",
        };
      }));
      setPagamentos((rowsResult.data ?? []) as FinanceRow[]);
    } catch (error: any) {
      console.error("[SecretarioFinancas] falha ao carregar relatório:", error);
      setLoadError(error?.message ?? "Verifique a ligação à base de dados e as permissões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDados(); }, [fetchDados]);

  const alunoPorId = useMemo(() => new Map(alunos.map((student) => [student.id, student])), [alunos]);
  const filtrados = useMemo(() => pagamentos.filter((row) => {
    const data = row.data_pagamento?.slice(0, 10) ?? "";
    const withinRange = data >= ini && data <= fim;
    const withinStatus = statusFiltro === "todos" || (statusFiltro === "liquidado" ? row.pago !== false : row.pago === false);
    return withinRange && withinStatus;
  }), [pagamentos, ini, fim, statusFiltro]);

  const isDespesa = (row: FinanceRow) => row.tipo_movimento === "despesa";
  const valorLinha = (row: FinanceRow) => Number(row.valor_pago ?? row.valor ?? 0);
  const totais = useMemo(() => {
    const receitas = filtrados.filter((row) => !isDespesa(row) && row.pago !== false).reduce((sum, row) => sum + valorLinha(row), 0);
    const despesas = filtrados.filter(isDespesa).reduce((sum, row) => sum + valorLinha(row), 0);
    const multas = filtrados.reduce((sum, row) => sum + Number(row.multa ?? 0), 0);
    const pendente = filtrados.filter((row) => !row.pago && !isDespesa(row)).reduce((sum, row) => sum + valorLinha(row), 0);
    return { recebido: receitas, despesas, saldoLiquido: receitas - despesas, multas, pendente };
  }, [filtrados]);

  const descricaoLinha = (row: FinanceRow) =>
    row.aluno_nome_manual || (row.aluno_id ? "Movimento associado a aluno" : "Pagamento de propina");
  const alunoRelacionado = (row: FinanceRow) => {
    const studentId = row.matricula_id ?? row.aluno_id;
    return studentId != null ? alunoPorId.get(String(studentId))?.nome ?? "Aluno associado" : "";
  };

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; receitas: number; despesas: number; sort: string }>();
    filtrados.forEach((row) => {
      const date = row.data_pagamento?.slice(0, 10);
      if (!date) return;
      const key = periodo === "anual" ? date.slice(0, 7) : date;
      const dateObj = new Date(`${date}T12:00:00`);
      const label = periodo === "anual"
        ? dateObj.toLocaleDateString("pt-AO", { month: "short", year: "2-digit" })
        : dateObj.toLocaleDateString("pt-AO", { day: "2-digit", month: "short" });
      const bucket = buckets.get(key) ?? { label, receitas: 0, despesas: 0, sort: key };
      if (isDespesa(row)) bucket.despesas += valorLinha(row);
      else if (row.pago !== false) bucket.receitas += valorLinha(row);
      buckets.set(key, bucket);
    });
    return [...buckets.values()].sort((a, b) => a.sort.localeCompare(b.sort));
  }, [filtrados, periodo]);

  const linhas = filtrados.map((row) => [
    row.data_pagamento?.slice(0, 10) ?? "—",
    alunoRelacionado(row) ? `${descricaoLinha(row)} · Aluno: ${alunoRelacionado(row)}` : descricaoLinha(row),
    isDespesa(row) ? "Despesa" : "Receita",
    row.pago !== false ? "Liquidado" : "Pendente",
    fmtKz(valorLinha(row)),
    fmtKz(Number(row.multa ?? 0)),
  ]);

  const handleRegistarManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!descricaoManual.trim()) return toast.error("Indique a descrição do movimento.");
    const valor = Number(valorManual);
    if (!Number.isFinite(valor) || valor <= 0) return toast.error("O valor deve ser superior a zero.");
    if (associarAluno && !alunoId) return toast.error("Selecione o aluno a associar ou desative essa opção.");
    const multa = Number(multaManual);
    if (!Number.isFinite(multa) || multa < 0) return toast.error("A multa não pode ser negativa.");
    setRegistando(true);
    try {
      const row: Record<string, unknown> = {
        aluno_nome_manual: descricaoManual.trim(),
        tipo_movimento: tipoMovimento,
        valor_pago: valor,
        multa,
        tipo: categoria,
        pago: true,
        comprovativo_status: "aprovado",
        data_pagamento: dataLocalHoje(),
      };
      if (associarAluno && alunoId) row.matricula_id = Number(alunoId);
      const { error } = await dbFrom("pagamentos").insert(row);
      if (error) throw error;
      toast.success("Movimento financeiro registado.");
      setModalAberto(false);
      setDescricaoManual("");
      setValorManual("");
      setMultaManual("0");
      setAlunoId("");
      setAssociarAluno(false);
      setAlunoBuscaAberta(false);
      void fetchDados();
    } catch (error: any) {
      console.error("[SecretarioFinancas] erro ao registar movimento:", error);
      toast.error(`Erro ao registar: ${error?.message ?? "verifique a ligação à base de dados."}`);
    } finally {
      setRegistando(false);
    }
  };

  const buildPdf = () => {
    const doc = new jsPDF();
    const y = cabecalhoOficial(doc);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("RELATÓRIO FINANCEIRO E ORÇAMENTAL", doc.internal.pageSize.getWidth() / 2, y + 8, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Período: ${periodo.toUpperCase()} (${ini} a ${fim})`, 20, y + 18);
    doc.text(`Total Recebido: ${fmtKz(totais.recebido)}`, 20, y + 26);
    doc.text(`Total Despesas: ${fmtKz(totais.despesas)}`, 20, y + 34);
    doc.text(`Saldo Líquido: ${fmtKz(totais.saldoLiquido)}`, 20, y + 42);
    doc.text(`Total Pendente: ${fmtKz(totais.pendente)}`, 20, y + 50);
    autoTable(doc, { startY: y + 58, head: [["Data", "Descrição", "Movimento", "Estado", "Valor", "Multa"]], body: linhas.length ? linhas : [["—", "—", "—", "—", "—", "—"]], theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: [150, 60, 45] }, margin: { left: 16, right: 16 } });
    const finalY = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(10); doc.text(hojeExtenso(), 16, finalY); doc.text("_____________________________", 16, finalY + 18); doc.text("A Secretaria", 16, finalY + 24);
    return doc;
  };
  const baixarPdf = () => { buildPdf().save(`relatorio-financeiro-${periodo}.pdf`); toast.success("PDF gerado com sucesso."); };
  const imprimirPagina = () => window.print();
  const baixarDocx = () => {
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2 style="text-align:center">COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO</h2><h3 style="text-align:center">RELATÓRIO FINANCEIRO — ${periodo.toUpperCase()}</h3><p><b>Período:</b> ${ini} a ${fim}</p><p><b>Total Recebido:</b> ${fmtKz(totais.recebido)}<br/><b>Total Despesas:</b> ${fmtKz(totais.despesas)}<br/><b>Saldo Líquido:</b> ${fmtKz(totais.saldoLiquido)}<br/><b>Pendente:</b> ${fmtKz(totais.pendente)}</p><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:12px;"><tr><th>Data</th><th>Descrição</th><th>Movimento</th><th>Estado</th><th>Valor</th><th>Multa</th></tr>${linhas.map((line) => `<tr>${line.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table><p style="margin-top:30px">${hojeExtenso()}</p><p>_____________________<br/>A Secretaria</p></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `relatorio-financeiro-${periodo}.doc`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Documento gerado com sucesso.");
  };
  const enviarAdmin = async () => {
    setEnviando(true);
    try {
      const { error } = await dbFrom("relatorios_financeiros").insert({
        autor_id: user?.id ?? null, autor_nome: user?.email ?? "Secretaria", periodo, data_inicio: ini, data_fim: fim,
        total_recebido: totais.recebido, total_despesas: totais.despesas, saldo_liquido: totais.saldoLiquido,
        total_multas: totais.multas, total_pendente: totais.pendente, detalhes: linhas, enviado_admin: true,
      });
      if (error) throw error;
      toast.success("Relatório financeiro enviado ao Administrador.");
    } catch (error: any) {
      toast.error(`Erro ao enviar: ${error?.message ?? "verifique a ligação à base de dados."}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Finanças e Orçamento" navItems={secretarioNav}>
      <div className="space-y-6 print:m-0 print:p-0">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><PiggyBank className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Secretaria · Tesouraria</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Finanças e orçamento</h1>
              <p className="mt-1 text-sm text-muted-foreground">Uma leitura clara do que entrou, saiu e está por liquidar.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setModalAberto(true)} className="gap-2" data-testid="button-add-finance-movement"><Plus className="h-4 w-4" /> Registar movimento</Button>
            <Button variant="outline" onClick={imprimirPagina} className="gap-2"><Printer className="h-4 w-4" /> Imprimir</Button>
          </div>
        </header>

        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Complexo Escolar Privado Herdeiros do Futuro</h1>
          <p className="text-sm">Relatório Financeiro e Orçamental — Secretaria</p>
          <p className="mt-1 text-xs">Período: {ini} a {fim} | Emitido em: {new Date().toLocaleDateString("pt-AO")}</p>
        </div>

        <Card className="print:hidden border-border/80">
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="min-w-44 space-y-1.5"><Label>Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}><SelectTrigger data-testid="select-finance-period"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="diario">Hoje</SelectItem><SelectItem value="semanal">Últimos 7 dias</SelectItem><SelectItem value="mensal">Último mês</SelectItem><SelectItem value="anual">Último ano</SelectItem>
                </SelectContent></Select>
              </div>
              <div className="min-w-40 space-y-1.5"><Label>Estado</Label>
                <Select value={statusFiltro} onValueChange={(value) => setStatusFiltro(value as typeof statusFiltro)}><SelectTrigger data-testid="select-finance-status"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="todos">Todos os estados</SelectItem><SelectItem value="liquidado">Liquidados</SelectItem><SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent></Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={baixarPdf}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
              <Button variant="outline" onClick={baixarDocx}><FileText className="mr-2 h-4 w-4" /> DOCX</Button>
              <Button onClick={enviarAdmin} disabled={enviando} data-testid="button-send-finance-report"><Send className="mr-2 h-4 w-4" />{enviando ? "A enviar..." : "Enviar ao Administrador"}</Button>
            </div>
          </CardContent>
        </Card>

        {loadError ? (
          <Card className="border-destructive/30 bg-destructive/[0.035]">
            <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">Não foi possível carregar o relatório</p><p className="mt-1 text-sm text-muted-foreground">{loadError}</p></div>
              <Button variant="outline" onClick={() => void fetchDados()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="section-finance-summary">
              {[
                { title: "Receita recebida", amount: totais.recebido, icon: TrendingUp, tone: "text-emerald-800 bg-emerald-700/10", foot: "Movimentos liquidados" },
                { title: "Despesas registadas", amount: totais.despesas, icon: TrendingDown, tone: "text-rose-800 bg-rose-700/10", foot: "Saídas no período" },
                { title: "Saldo líquido", amount: totais.saldoLiquido, icon: DollarSign, tone: totais.saldoLiquido >= 0 ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10", foot: "Receitas menos despesas" },
                { title: "Por receber", amount: totais.pendente, icon: PiggyBank, tone: "text-amber-800 bg-amber-700/10", foot: "Pagamentos pendentes" },
              ].map((item) => (
                  <Card key={item.title} className="animate-rise-in overflow-hidden border-border/80" data-testid={`card-finance-${item.title.toLocaleLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="flex items-start justify-between p-5">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.title}</p>
                      {loading ? <div className="mt-3 h-7 w-36 animate-pulse rounded-md bg-muted" /> : <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{fmtKz(item.amount)}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">{item.foot}</p>
                    </div><div className={`rounded-xl p-2.5 ${item.tone}`}><item.icon className="h-5 w-5" /></div>
                  </CardContent>
                </Card>
              ))}
            </section>

            <Card className="overflow-hidden border-border/80" data-testid="card-finance-cashflow">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
                <div><CardTitle className="text-base">Receitas e despesas</CardTitle><p className="mt-1 text-xs text-muted-foreground">{ini} — {fim} · Valores derivados dos registos de pagamento</p></div>
                <div className="hidden items-center gap-4 text-xs sm:flex"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />Receitas</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-rose-700" />Despesas</span></div>
              </CardHeader>
              <CardContent className="p-4 pt-5">
                {loading ? <div className="h-72 animate-pulse rounded-xl bg-muted/60" /> : chartData.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                    <div className="rounded-full bg-secondary p-3 text-muted-foreground"><TrendingUp className="h-5 w-5" /></div>
                    <p className="mt-3 font-medium">Sem movimentos neste período</p><p className="mt-1 text-sm text-muted-foreground">Altere o período ou o estado para consultar outros registos.</p>
                  </div>
                ) : (
                  <div className="h-72 w-full" role="img" aria-label="Gráfico de receitas e despesas por data">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={4}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} minTickGap={20} />
                        <YAxis axisLine={false} tickLine={false} width={72} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(value) => `${(Number(value) / 1000).toLocaleString("pt-AO")} mil`} />
                        <Tooltip formatter={(value: number) => fmtKz(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                        <Bar dataKey="receitas" name="Receitas" fill="#28745C" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive />
                        <Bar dataKey="despesas" name="Despesas" fill="#B7554B" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {!loading && chartData.length > 0 && <div className="mt-2 flex gap-5 text-xs text-muted-foreground sm:hidden"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />Receitas</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-rose-700" />Despesas</span></div>}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-3"><div className="flex items-end justify-between gap-3"><div><CardTitle className="text-base">Movimentos registados</CardTitle><p className="mt-1 text-sm text-muted-foreground">{loading ? "A carregar..." : `${filtrados.length} registo${filtrados.length === 1 ? "" : "s"} no período`}</p></div><span className="text-xs text-muted-foreground">{ini} — {fim}</span></div></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-3 pr-4">Data</th><th className="pr-4">Descrição</th><th className="pr-4">Movimento</th><th className="pr-4">Estado</th><th className="text-right">Valor</th><th className="text-right">Multa</th></tr></thead>
                  <tbody>
                    {loading ? Array.from({ length: 4 }, (_, index) => <tr key={index} className="border-b border-border/60"><td colSpan={6} className="py-4"><div className="h-4 animate-pulse rounded bg-muted" /></td></tr>) :
                      filtrados.slice(0, 300).map((row, index) => <tr key={row.id || index} className="border-b border-border/60 last:border-0 hover:bg-secondary/30" data-testid={`row-finance-movement-${row.id || index}`}>
                        <td className="py-3 pr-4 tabular-nums">{row.data_pagamento?.slice(0, 10) ?? "—"}</td>
                        <td className="max-w-[280px] pr-4"><span className="block truncate font-medium">{descricaoLinha(row)}</span>{alunoRelacionado(row) && <span className="block truncate text-xs text-muted-foreground">Aluno: {alunoRelacionado(row)}</span>}</td>
                        <td className="pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isDespesa(row) ? "bg-rose-700/10 text-rose-800 dark:text-rose-300" : "bg-emerald-700/10 text-emerald-800 dark:text-emerald-300"}`}>{isDespesa(row) ? "Despesa" : "Receita"}</span></td>
                        <td className="pr-4">{row.pago === false ? "Pendente" : "Liquidado"}</td><td className="text-right font-mono tabular-nums">{fmtKz(valorLinha(row))}</td><td className="text-right font-mono tabular-nums text-muted-foreground">{fmtKz(Number(row.multa ?? 0))}</td>
                      </tr>)}
                    {!loading && filtrados.length === 0 && <tr data-testid="empty-finance-movements"><td colSpan={6} className="py-12 text-center"><p className="font-medium">Nenhum movimento para apresentar</p><p className="mt-1 text-sm text-muted-foreground">Experimente outro período ou registe um movimento.</p></td></tr>}
                  </tbody>
                </table>
                {!loading && filtrados.length > 300 && <p className="pt-3 text-xs text-muted-foreground">A mostrar 300 de {filtrados.length} movimentos. O relatório exportado inclui todos.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-[2px] print:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget && !registando) setModalAberto(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="movement-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between border-b border-border/70 pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Novo registo</p><h2 id="movement-title" className="mt-1 font-display text-2xl font-semibold">Movimento financeiro</h2></div>
              <Button variant="ghost" size="icon" onClick={() => setModalAberto(false)} aria-label="Fechar" disabled={registando}><X className="h-5 w-5" /></Button>
            </div>
            <form onSubmit={handleRegistarManual} className="mt-5 space-y-5" data-testid="form-finance-movement">
              <div className="space-y-2"><Label>Tipo de movimento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={tipoMovimento === "receita" ? "default" : "outline"} onClick={() => setTipoMovimento("receita")} className="gap-2"><TrendingUp className="h-4 w-4" /> Receita</Button>
                  <Button type="button" variant={tipoMovimento === "despesa" ? "destructive" : "outline"} onClick={() => setTipoMovimento("despesa")} className="gap-2"><TrendingDown className="h-4 w-4" /> Despesa</Button>
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="movement-description">Descrição do movimento *</Label><Input id="movement-description" data-testid="input-finance-description" value={descricaoManual} onChange={(event) => setDescricaoManual(event.target.value)} placeholder={tipoMovimento === "despesa" ? "Ex.: material didático, energia, manutenção" : "Ex.: receita de matrícula, apoio institucional"} required maxLength={160} /></div>
              <div className="rounded-xl border border-border/80 bg-secondary/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">Associar a um aluno</p><p className="mt-0.5 text-xs text-muted-foreground">Opcional. Use apenas quando o movimento pertence a um aluno.</p></div>
                  <Button type="button" size="sm" variant={associarAluno ? "default" : "outline"} onClick={() => { setAssociarAluno((current) => !current); setAlunoId(""); }} aria-pressed={associarAluno} data-testid="button-toggle-finance-student-link">{associarAluno ? "Ativo" : "Não associar"}</Button>
                </div>
                {associarAluno && (
                  <div className="mt-3 space-y-2"><Label>Aluno relacionado</Label>
                    <Popover open={alunoBuscaAberta} onOpenChange={setAlunoBuscaAberta}>
                      <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={alunoBuscaAberta} className="w-full justify-between rounded-lg font-normal" data-testid="combobox-finance-student">
                        {alunoId ? alunos.find((student) => student.id === alunoId)?.nome : "Pesquisar nome, classe ou processo"}<Search className="ml-2 h-4 w-4 text-muted-foreground" />
                      </Button></PopoverTrigger>
                      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command filter={(value, query) => value.includes(normalizeSearch(query)) ? 1 : 0}>
                          <CommandInput autoFocus placeholder="Nome, classe ou processo..." data-testid="input-finance-student-search" />
                          <CommandList className="max-h-56"><CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                            {alunos.map((student) => <CommandItem key={student.id} value={normalizeSearch(`${student.nome} ${student.processo} ${student.classe} ${student.turma}`)} onSelect={() => { setAlunoId(student.id); setAlunoBuscaAberta(false); }} className="cursor-pointer" data-testid={`option-finance-student-${student.id}`}>
                              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{student.nome}</span><span className="block truncate text-xs text-muted-foreground">{student.classe} · {student.turma}{student.processo ? ` · Processo ${student.processo}` : ""}</span></span>{alunoId === student.id && <Check className="h-4 w-4 text-primary" />}
                            </CommandItem>)}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Categoria</Label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="propina">Propina</SelectItem><SelectItem value="matricula">Matrícula / Confirmação</SelectItem><SelectItem value="material">Material / Manutenção</SelectItem><SelectItem value="salario">Salários / Outros</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="movement-amount">Valor (Kz) *</Label><Input id="movement-amount" type="number" min="1" step="1" value={valorManual} onChange={(event) => setValorManual(event.target.value)} required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="movement-fee">Multa (Kz)</Label><Input id="movement-fee" type="number" min="0" step="1" value={multaManual} onChange={(event) => setMultaManual(event.target.value)} /></div>
              <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalAberto(false)} disabled={registando}>Cancelar</Button>
                <Button type="submit" disabled={registando || (associarAluno && !alunoId)}>{registando && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{registando ? "A guardar..." : "Guardar movimento"}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </RoleLayout>
  );
};

export default SecretarioFinancas;