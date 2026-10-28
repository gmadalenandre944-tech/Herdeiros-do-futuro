import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { downloadExcel } from "@/lib/excelExport";
import { AlertCircle, CheckCircle, Clock, DollarSign, FileSpreadsheet, Plus, Printer, Search, Users, UserPlus, X } from "lucide-react";
import { secretarioNav } from "@/lib/nav";
import { classeFromTurma, CLASSES_OFICIAIS, fetchBaseEscolar, fetchMatriculasDaVista, normalizeClasseOficial, turmaNomeFromTurma } from "@/lib/schoolData";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import {
  anoReferenciaPagamento,
  dataPagamentoHoje,
  MESES_PAGAMENTO,
  normalizarMesPagamento,
  normalizarPagamento,
  type PaymentRecord,
} from "@/lib/paymentData";

type EstadoPagamento = "Pago" | "Não Pago" | "Pendente";
const PAYMENT_COLUMNS = ["Nome Completo do Aluno", "Classe", "Turma", "Referência", "Valor", "Estado"] as const;

type PaymentType = "propina" | "matricula" | "confirmacao" | "outros";

interface StudentRecord {
  id: string;
  nome: string;
  numero_processo: string;
  classe: string;
  turma: string;
  turno: string;
}

interface PaymentReceipt {
  code: string;
  student: StudentRecord;
  amount: number;
  month: number;
  year: number;
  type: PaymentType;
  date: string;
}

const anoActual = new Date().getFullYear();
const normalizeStudentSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

const SecretarioPayments = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(anoActual));
  const [classFilter, setClassFilter] = useState("todas");
  const [shiftFilter, setShiftFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | EstadoPagamento>("todos");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState(String(new Date().getMonth() + 1));
  const [paymentYear, setPaymentYear] = useState(String(anoActual));
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("propina");
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [creatingQuickStudent, setCreatingQuickStudent] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const quickStudentNameQuery = normalizeStudentSearch(newStudentName);
  const quickStudentMatches = useMemo(
    () => quickStudentNameQuery
      ? students.filter((student) => normalizeStudentSearch(student.nome).includes(quickStudentNameQuery))
      : [],
    [students, quickStudentNameQuery],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ turmas }, matriculas, paymentResult] = await Promise.all([
        fetchBaseEscolar(),
        fetchMatriculasDaVista(),
        dbFrom("pagamentos_propinas").select("*").order("data_pagamento", { ascending: false }).limit(5000),
      ]);
      if (paymentResult.error) throw paymentResult.error;

      const turmaById = new Map(turmas.map((turma) => [turma.id, turma]));
      // Mostra todos os alunos da base de dados (qualquer ano lectivo).
      const activeStudents = matriculas;
      setStudents(activeStudents.map((aluno) => {
        const turma = aluno.turma_id ? turmaById.get(aluno.turma_id) : undefined;
        const turmaRegistry = String(aluno.turma ?? "").trim();
        const classeRegistry = classeFromTurma(turmaRegistry);
        const turmaNomeRegistry = turmaNomeFromTurma(turmaRegistry);
        return {
          id: aluno.id,
          nome: aluno.nome,
          numero_processo: aluno.numero_processo ?? "",
          classe: classeRegistry !== "Sem classe"
            ? classeRegistry
            : normalizeClasseOficial(aluno.classe ?? turma?.classe),
          turma: (turma?.nome ?? turmaNomeRegistry ?? turmaRegistry) || "Sem turma atribuída",
          turno: turma?.turno ?? "Sem turno atribuído",
        };
      }));
      const estadoNorm = (row: any) => String(row?.estado ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const rows = (paymentResult.data ?? []) as any[];
      const toRecord = (row: any) => normalizarPagamento({
        ...row,
        aluno_id: row?.matricula_id,
        mes: normalizarMesPagamento(row?.mes),
        pago: ["pago", "paga", "liquidado", "liquidada", "paid", "approved", "confirmado"].includes(estadoNorm(row)),
      });
      setPayments(rows.map(toRecord));
      setPendingPayments(rows
        .filter((row) => ["pendente", "pending", "em analise", "aguardando", "processando"].includes(estadoNorm(row)))
        .map(toRecord));
    } catch (error: any) {
      console.error("[SecretarioPayments] falha ao carregar pagamentos:", error);
      toast.error(`Não foi possível carregar a tesouraria: ${error?.message ?? "verifique as permissões e a ligação à base de dados."}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const shifts = useMemo(
    () => [...new Set(students.map((student) => student.turno).filter((turno) => turno && turno !== "Sem turno atribuído"))]
      .sort((a, b) => a.localeCompare(b)),
    [students],
  );
  const selectedMonth = Number(monthFilter);
  const selectedYear = Number(yearFilter);

  const rosterRows = useMemo(() => students.map((student) => {
    const studentPayments = payments.filter((payment) =>
      payment.aluno_id === student.id &&
      payment.mes === selectedMonth &&
      anoReferenciaPagamento(payment) === selectedYear &&
      payment.tipo === "propina",
    );
    const paidPayments = studentPayments.filter((payment) => payment.pago);
    const pendingIds = new Set(pendingPayments.map((p) => p.id));
    const pending = studentPayments.filter((payment) => pendingIds.has(payment.id));
    const pago = paidPayments.length > 0;
    const estado: EstadoPagamento = pago ? "Pago" : pending.length > 0 ? "Pendente" : "Não Pago";
    return {
      ...student,
      pago,
      estado,
      valorPago: paidPayments.reduce((total, payment) => total + payment.valor_pago, 0),
      valorPendente: pending.reduce((total, payment) => total + payment.valor_pago, 0),
      pagamentoId: paidPayments[0]?.id,
    };
  }), [students, payments, pendingPayments, selectedMonth, selectedYear]);

  const scopedRows = useMemo(
    () => rosterRows.filter((row) =>
      (classFilter === "todas" || row.classe === classFilter) &&
      (shiftFilter === "todos" || row.turno === shiftFilter),
    ),
    [rosterRows, classFilter, shiftFilter],
  );

  const displayedRows = useMemo(() => scopedRows
    .filter((row) => row.nome.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .filter((row) => statusFilter === "todos" || row.estado === statusFilter)
    .sort((a, b) => {
      const classA = CLASSES_OFICIAIS.indexOf(a.classe as (typeof CLASSES_OFICIAIS)[number]);
      const classB = CLASSES_OFICIAIS.indexOf(b.classe as (typeof CLASSES_OFICIAIS)[number]);
      const rankA = classA < 0 ? CLASSES_OFICIAIS.length : classA;
      const rankB = classB < 0 ? CLASSES_OFICIAIS.length : classB;
      return rankA - rankB || a.classe.localeCompare(b.classe) || a.nome.localeCompare(b.nome);
    }),
  [scopedRows, search, statusFilter]);

  const paidCount = scopedRows.filter((row) => row.estado === "Pago").length;
  const pendingCount = scopedRows.filter((row) => row.estado === "Pendente").length;
  const unpaidCount = scopedRows.filter((row) => row.estado === "Não Pago").length;

  const referencia = `${MESES_PAGAMENTO[selectedMonth - 1]} / ${yearFilter}`;
  const valorLinha = (row: (typeof displayedRows)[number]) =>
    row.estado === "Pago" ? row.valorPago : row.estado === "Pendente" ? row.valorPendente : 0;
  const reportRows = () => displayedRows.map((row) => [
    row.nome,
    row.classe === "Sem classe" ? "—" : row.classe,
    row.turma,
    referencia,
    valorLinha(row),
    row.estado,
  ]);

  const handleExportExcel = () => {
    if (!displayedRows.length) return toast.error("Não há registos para exportar.");
    downloadExcel(
      `Pagamentos_${MESES_PAGAMENTO[selectedMonth - 1]}_${yearFilter}`,
      "Pagamentos",
      [[...PAYMENT_COLUMNS], ...reportRows()],
    );
  };

  const handlePrintOfficial = () => {
    if (!displayedRows.length) return toast.error("Não há registos para imprimir.");
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const body = reportRows().map((r, i) => `<tr><td class="c">${i + 1}</td>${r.map((c, j) =>
      `<td class="${j === 4 ? "r" : j === 5 ? "c" : ""}">${j === 4 ? (Number(c) ? `${Number(c).toLocaleString("pt-AO")} Kz` : "—") : esc(c)}</td>`).join("")}<td class="box"></td></tr>`).join("");
    const filtros = `Referência: ${esc(referencia)} · Classe: ${classFilter === "todas" ? "Todas" : esc(classFilter)} · Turno: ${shiftFilter === "todos" ? "Todos" : esc(shiftFilter)}`;
    const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Lista de Pagamentos</title><style>
      @page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:11px}
      h1{font-size:15px;text-align:center;margin:0}h2{font-size:13px;text-align:center;margin:4px 0 2px}p{text-align:center;margin:2px 0 10px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:4px 6px}th{background:#eee;text-transform:uppercase;font-size:10px}
      .c{text-align:center}.r{text-align:right}td.box{width:60px;min-width:60px;background:#fff}.sum{margin-top:10px;text-align:left}.sig{margin-top:40px;display:flex;justify-content:space-around}.sig div{border-top:1px solid #000;width:200px;text-align:center;padding-top:4px}
    </style></head><body>
      <h1>Colégio Herdeiros do Futuro</h1><h2>Lista Oficial de Pagamentos</h2><p>${filtros}</p>
      <table><thead><tr><th>Nº</th>${PAYMENT_COLUMNS.map((c) => `<th>${c}</th>`).join("")}<th></th></tr></thead><tbody>${body}</tbody></table>
      <p class="sum">Pago: ${paidCount} · Não Pago: ${unpaidCount} · Pendente: ${pendingCount} · Total: ${displayedRows.length}</p>
      <div class="sig"><div>O(A) Secretário(a)</div><div>A Direcção</div></div>
      <script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita janelas pop-up para imprimir.");
    w.document.write(html);
    w.document.close();
  };
  const openPaymentModal = (studentId = "") => {
    setSelectedStudentId(studentId);
    setStudentPickerOpen(false);
    setNewStudentOpen(false);
    setPaymentMonth(monthFilter);
    setPaymentYear(yearFilter);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setStudentPickerOpen(false);
    setNewStudentOpen(false);
  };

  const handleRegisterPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    const month = Number(paymentMonth);
    const year = Number(paymentYear);
    const amount = Number(paymentValue);
    const student = students.find((item) => item.id === selectedStudentId);

    if (!student) {
      toast.error("Selecione um aluno registado na base escolar.");
      return;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
      toast.error("Indique um mês e ano de referência válidos.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("O valor do pagamento deve ser superior a zero.");
      return;
    }

    setSaving(true);
    try {
      const receiptDate = dataPagamentoHoje();
      const { data, error } = await dbFrom("pagamentos_propinas")
        .insert({
        matricula_id: Number(student.id),
        mes: MESES_PAGAMENTO[month - 1],
        valor_pago: amount,
        estado: "Pago",
        tipo: paymentType,
        ano_referencia: year,
        data_pagamento: receiptDate,
        registrado_por: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) {
        const details = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
        if (details.includes("ano_referencia") || details.includes("tipo")) {
          throw new Error("Aplique primeiro a migração supabase/migrations/20261008_sync_school_records.sql no Supabase.");
        }
        throw error;
      }
      if (!data?.id) throw new Error("O Supabase não confirmou o pagamento nem devolveu o ID do recibo.");
      const savedPayment = normalizarPagamento({
        ...data,
        aluno_id: data.matricula_id,
        mes: normalizarMesPagamento(data.mes),
        pago: String(data.estado ?? "").toLowerCase() === "pago",
      });
      setPayments((current) => [savedPayment, ...current]);
      setReceipt({
        code: `HF-${String(data.data_pagamento ?? receiptDate).slice(0, 10).replace(/-/g, "")}-${String(data.id).slice(-6).toUpperCase()}`,
        student,
        amount,
        month,
        year,
        type: paymentType,
        date: String(data.data_pagamento ?? receiptDate).slice(0, 10),
      });
      toast.success(`Pagamento de ${student.nome} confirmado no Supabase. O recibo está pronto.`);
      closePaymentModal();
      setSelectedStudentId("");
      setMonthFilter(String(month));
      setYearFilter(String(year));
    } catch (error: any) {
      console.error("[SecretarioPayments] erro ao gravar pagamento:", error);
      toast.error(`Não foi possível registar o pagamento: ${error?.message ?? "erro na base de dados."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChooseStudentByName = (student: StudentRecord) => {
    setSelectedStudentId(student.id);
    setNewStudentOpen(false);
    setNewStudentName("");
    toast.success(`${student.nome} selecionado para o pagamento.`);
  };

  const handleCreateQuickStudent = async () => {
    setCreatingQuickStudent(true);
    try {
      await loadData();
      toast.info("Lista actualizada. Registe primeiro o aluno em Matrículas antes de lançar o pagamento.");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível actualizar a lista de alunos.");
    } finally {
      setCreatingQuickStudent(false);
    }
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Tesouraria" navItems={secretarioNav}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="font-montserrat text-2xl font-bold text-foreground lg:text-3xl">Pagamentos e Relatórios</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Registe propinas na ficha do aluno e consulte pendências por classe, turno e período.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrintOfficial} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir relatório
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button onClick={() => openPaymentModal()} className="gap-2" data-testid="button-register-payment">
              <Plus className="h-4 w-4" /> Registar pagamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3 text-primary"><Users className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">Alunos no filtro</p><p className="text-xl font-bold">{scopedRows.length}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-green-500/10 p-3 text-green-700"><CheckCircle className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">Pago</p><p className="text-xl font-bold text-green-700">{paidCount}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-destructive/10 p-3 text-destructive"><AlertCircle className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">Não Pago</p><p className="text-xl font-bold text-destructive">{unpaidCount}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-amber-500/10 p-3 text-amber-700"><Clock className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">Pendente</p><p className="text-xl font-bold text-amber-700">{pendingCount}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" /> Relatório de propinas por classe e turno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 print:hidden">
              <div className="space-y-1">
                <Label>Mês</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES_PAGAMENTO.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ano</Label>
                <Input type="number" min="2000" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Classe</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as classes</SelectItem>
                    {CLASSES_OFICIAIS.map((classe) => <SelectItem key={classe} value={classe}>{classe}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Turno</Label>
                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os turnos</SelectItem>
                    {shifts.map((shift) => <SelectItem key={shift} value={shift}>{shift}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Não Pago">Não Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pesquisar aluno</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome do aluno..." className="pl-9" />
                </div>
              </div>
            </div>

            {payments.some((payment) => payment.ano_referencia == null) && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                Registos anteriores sem ano de referência usam o ano da data de recebimento como estimativa (*); confirme pagamentos antecipados ou atrasados.
              </p>
            )}

            <p className="hidden print:block text-sm text-muted-foreground">
              Referência: {MESES_PAGAMENTO[selectedMonth - 1]} de {yearFilter} · Classe: {classFilter === "todas" ? "Todas" : classFilter} · Turno: {shiftFilter === "todos" ? "Todos" : shiftFilter}
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-semibold">Nome Completo do Aluno</th>
                    <th className="px-4 py-3 text-left font-semibold">Classe</th>
                    <th className="px-4 py-3 text-left font-semibold">Turma</th>
                    <th className="px-4 py-3 text-left font-semibold">Referência</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    <th className="px-4 py-3 text-center font-semibold">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">A carregar dados da base escolar...</td></tr>
                  ) : displayedRows.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum aluno corresponde aos filtros selecionados.</td></tr>
                  ) : displayedRows.map((row, index) => (
                    <Fragment key={row.id}>
                      {(index === 0 || displayedRows[index - 1].classe !== row.classe) && (
                        <tr className="border-b border-border bg-muted/70">
                          <th colSpan={7} className="px-4 py-2 text-left text-sm font-semibold">{row.classe}</th>
                        </tr>
                      )}
                      <tr className={`border-b border-border last:border-0 ${row.estado === "Pago" ? "bg-green-500/5" : row.estado === "Pendente" ? "bg-amber-500/5" : "bg-red-500/5"}`}>
                        <td className="px-4 py-3 font-medium">{row.nome}</td>
                        <td className="px-4 py-3">{row.classe === "Sem classe" ? "—" : row.classe}</td>
                        <td className="px-4 py-3">{row.turma}</td>
                        <td className="px-4 py-3">{referencia}</td>
                        <td className="px-4 py-3 text-right font-mono">{valorLinha(row) ? `${valorLinha(row).toLocaleString("pt-AO")} Kz` : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {row.estado === "Pago" ? <Badge className="bg-green-600 text-white">Pago</Badge>
                            : row.estado === "Pendente" ? <Badge className="bg-amber-500 text-white">Pendente</Badge>
                            : <Badge variant="destructive">Não Pago</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center print:hidden">
                          {!row.pago && (
                            <Button size="sm" variant="outline" onClick={() => openPaymentModal(row.id)}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> Registar
                            </Button>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-5 rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-bold text-lg">Registar pagamento</h2>
                <p className="text-sm text-muted-foreground">O pagamento ficará associado à matrícula do aluno no Supabase.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closePaymentModal} aria-label="Fechar">×</Button>
            </div>
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Aluno *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewStudentOpen((open) => !open);
                      setNewStudentName("");
                    }}
                    data-testid="button-toggle-new-payment-student"
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />{newStudentOpen ? "Voltar à lista" : "Pesquisar aluno"}
                  </Button>
                </div>
                {newStudentOpen ? (
                  <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-payment-student-name">Nome do aluno</Label>
                      <Input
                        id="new-payment-student-name"
                        autoFocus
                        autoComplete="off"
                        value={newStudentName}
                        onChange={(event) => setNewStudentName(event.target.value)}
                        placeholder="Escreva o nome do aluno"
                        maxLength={160}
                        data-testid="input-payment-student-name-only"
                      />
                      <p className="text-xs text-muted-foreground">
                        Pesquise pelo nome. O aluno precisa de ter uma matrícula registada antes de receber pagamentos.
                      </p>
                    </div>
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-1">
                      {!quickStudentNameQuery ? (
                        <p className="p-3 text-sm text-muted-foreground">Escreva o nome para procurar.</p>
                      ) : quickStudentMatches.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nenhum aluno financeiro encontrado com este nome. O registo escolar e financeiro precisa existir antes de lançar o pagamento.
                        </p>
                      ) : quickStudentMatches.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          className="flex w-full items-start justify-between gap-3 rounded px-3 py-2 text-left hover:bg-secondary"
                          onClick={() => handleChooseStudentByName(student)}
                          data-testid={`option-payment-student-name-${student.id}`}
                        >
                          <span className="min-w-0 truncate font-medium">{student.nome}</span>
                          <span className="shrink-0 text-right text-xs text-muted-foreground">
                            {student.classe === "Sem classe" ? "Classe não indicada" : student.classe}
                            {student.numero_processo ? ` · Proc. ${student.numero_processo}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                    {quickStudentNameQuery.length >= 3 && quickStudentMatches.length === 0 && (
                        <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                          <p className="text-sm font-medium">Este aluno ainda não aparece na lista de matrículas.</p>
                          <p className="text-xs text-muted-foreground">
                            Registe-o primeiro no módulo Matrículas. Esta tela não cria alunos sem uma matrícula válida.
                          </p>
                          <Button
                            type="button"
                            className="w-full"
                            onClick={handleCreateQuickStudent}
                            disabled={creatingQuickStudent}
                            data-testid="button-refresh-payment-students"
                          >
                            {creatingQuickStudent ? "A actualizar..." : "Actualizar lista de matrículas"}
                          </Button>
                        </div>
                    )}
                  </div>
                ) : (
                <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" aria-label="Pesquisar e selecionar aluno" aria-expanded={studentPickerOpen} className="w-full justify-between rounded-lg font-normal" data-testid="combobox-payment-student" disabled={students.length === 0}>
                      {selectedStudentId
                        ? students.find((student) => student.id === selectedStudentId)?.nome
                        : "Pesquisar por nome, classe ou processo"}
                      <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command
                      filter={(value, query) => normalizeStudentSearch(value).includes(normalizeStudentSearch(query)) ? 1 : 0}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setStudentPickerOpen(false);
                      }}
                    >
                      <CommandInput autoFocus placeholder="Escreva o nome, classe ou nº de processo..." data-testid="input-payment-student-search" />
                      <CommandList className="max-h-64">
                        <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                        {students.map((student) => {
                          const searchKey = normalizeStudentSearch(`${student.nome} ${student.numero_processo} ${student.classe} ${student.turma} ${student.turno}`);
                          return (
                            <CommandItem
                              key={student.id}
                              value={searchKey}
                              onSelect={() => {
                                setSelectedStudentId(student.id);
                                setStudentPickerOpen(false);
                              }}
                              className="cursor-pointer py-2.5"
                              data-testid={`option-payment-student-${student.id}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{student.nome}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {student.classe === "Sem classe" ? "Classe não indicada" : student.classe}
                                  {student.turma !== "Sem turma atribuída" ? ` · ${student.turma}` : ""}
                                  {student.numero_processo ? ` · Processo ${student.numero_processo}` : ""}
                                </p>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                )}
                {selectedStudentId && !newStudentOpen && (
                  <button type="button" className="text-xs text-primary underline-offset-4 hover:underline" onClick={() => setSelectedStudentId("")} data-testid="button-clear-payment-student">
                    Limpar aluno selecionado
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês de referência *</Label>
                  <Select value={paymentMonth} onValueChange={setPaymentMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MESES_PAGAMENTO.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano de referência *</Label>
                  <Input type="number" min="2000" value={paymentYear} onChange={(event) => setPaymentYear(event.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={paymentType} onValueChange={(value) => setPaymentType(value as PaymentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propina">Propina</SelectItem>
                      <SelectItem value="matricula">Matrícula</SelectItem>
                      <SelectItem value="confirmacao">Confirmação</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (Kz) *</Label>
                  <Input type="number" min="1" step="1" value={paymentValue} onChange={(event) => setPaymentValue(event.target.value)} required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O mês e o ano de referência ficam separados da data real em que o pagamento foi recebido.
              </p>
              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={closePaymentModal}>Cancelar</Button>
                <Button type="submit" disabled={saving || !selectedStudentId || newStudentOpen || creatingQuickStudent}>
                  {saving ? "A guardar..." : "Guardar pagamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receipt && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .payment-receipt-print, .payment-receipt-print * { visibility: visible !important; }
              .payment-receipt-overlay { position: absolute !important; inset: 0 !important; display: block !important; padding: 0 !important; background: #fff !important; }
              .payment-receipt-card { width: 100% !important; max-width: 760px !important; margin: 0 auto !important; border: 0 !important; box-shadow: none !important; color: #111 !important; background: #fff !important; }
              .payment-receipt-actions { display: none !important; }
            }
          `}</style>
          <div className="payment-receipt-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 print:bg-white">
            <section className="payment-receipt-print payment-receipt-card w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="payment-receipt-title">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Colégio Herdeiros do Futuro</p>
                <h2 id="payment-receipt-title" className="mt-2 text-2xl font-bold">Recibo de pagamento</h2>
                <p className="mt-1 font-mono text-sm">Nº {receipt.code}</p>
              </div>
              <div className="my-5 space-y-3 border-y border-border py-4 text-sm">
                <p><strong>Aluno:</strong> {receipt.student.nome}</p>
                <p><strong>Nº de processo:</strong> {receipt.student.numero_processo || "—"}</p>
                <p><strong>Classe / turma:</strong> {receipt.student.classe} · {receipt.student.turma}</p>
                <p><strong>Tipo:</strong> {{ propina: "Propina", matricula: "Matrícula", confirmacao: "Confirmação", outros: "Outros" }[receipt.type]}</p>
                <p><strong>Referência:</strong> {MESES_PAGAMENTO[receipt.month - 1]} de {receipt.year}</p>
                <p><strong>Data de recebimento:</strong> {new Date(`${receipt.date}T00:00:00`).toLocaleDateString("pt-AO")}</p>
                <p className="pt-2 text-lg"><strong>Valor recebido:</strong> {receipt.amount.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz</p>
              </div>
              <div className="payment-receipt-actions flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setReceipt(null)}><X className="mr-1 h-4 w-4" />Fechar</Button>
                <Button type="button" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir recibo</Button>
              </div>
            </section>
          </div>
        </>
      )}
    </RoleLayout>
  );
};

export default SecretarioPayments;