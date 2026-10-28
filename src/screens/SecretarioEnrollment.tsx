import { useState, useMemo } from "react";
import { useMatriculasQuery, useMatriculasMutations } from "@/hooks/useMatriculasQuery";
import { sortStudents } from "@/lib/studentOrder";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Camera, CheckCircle, XCircle, Clock, LayoutDashboard, FileText, DollarSign, CalendarCheck, Users, Megaphone, Printer, X, Pencil, Trash2 } from "lucide-react";
import { normalizeStudentRow, registarAlunoCompleto } from "@/lib/students";
import { fetchAllStudentRecords, fetchBaseEscolar, normalizeClasseOficial } from "@/lib/schoolData";

const secretarioNav = [
  { label: "Dashboard", path: "/secretario", icon: LayoutDashboard },
  { label: "Matrículas e Registo", path: "/secretario/enrollment", icon: UserPlus },
  { label: "Confirmações", path: "/secretario/confirmations", icon: CalendarCheck },
  { label: "Tesouraria", path: "/secretario/payments", icon: DollarSign },
  { label: "Listagens", path: "/secretario/lists", icon: Users },
  { label: "Documentos", path: "/secretario/documents", icon: FileText },
  { label: "Comunicados", path: "/secretario/announcements", icon: Megaphone },
];

const classes = ["Iniciação","1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","7ª Classe","8ª Classe","9ª Classe"];
const normalizeRosterKey = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

interface AlunoMatriculado {
  id: string;
  nome_completo: string;
  nomes_parentes?: string;
  data_nascimento: string;
  sexo?: string;
  classe: string;
  turma?: string;
  numero_processo?: string;
  contacto?: string;
  fotografia_url?: string;
  status: string;
}

export default function SecretarioEnrollment() {
  const [form, setForm] = useState({
    nome_completo: "",
    nomes_parentes: "",
    data_nascimento: "",
    sexo: "",
    idade: "",
    classe: "",
    turma: "A",
    numero_processo: "",
    contacto: "",
    fotografia_url: "",
  });
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fichaAtiva, setFichaAtiva] = useState<any | null>(null);

  const loadAlunos = async (): Promise<AlunoMatriculado[]> => {
      const [data, financeiroBase] = await Promise.all([
        fetchAllStudentRecords(),
        fetchBaseEscolar(),
      ]);
      const financeiroRows = financeiroBase.alunos.map((aluno) => ({
        ...aluno.raw,
        id: aluno.id,
        nome_completo: aluno.nome,
        numero_processo: aluno.numero_processo,
        data_nascimento: aluno.data_nascimento,
        sexo: aluno.sexo,
      }));
      const mapped = data.map((row: any) => {
        const normalized = normalizeStudentRow(row);
        const sameName = financeiroRows.filter((aluno) =>
          normalizeRosterKey(aluno?.nome_completo ?? aluno?.nome) === normalizeRosterKey(normalized.nome_completo),
        );
        const birthDate = normalized.data_nascimento.slice(0, 10);
        const matched = financeiroRows.find((aluno) => String(aluno?.id ?? "") === normalized.id)
          ?? sameName.find((aluno) =>
          birthDate && String(aluno?.data_nascimento ?? "").slice(0, 10) === birthDate,
        ) ?? (sameName.length === 1 ? sameName[0] : undefined);
        return {
          ...normalized,
          numero_processo: String(row?.numero_processo ?? matched?.numero_processo ?? ""),
          sexo: String(row?.gender ?? row?.sexo ?? matched?.sexo ?? ""),
        } as AlunoMatriculado;
      });
      return mapped;
  };
  const alunosQuery = useMatriculasQuery<AlunoMatriculado>(loadAlunos);
  const alunosList = alunosQuery.data ?? [];
  const loadingAlunos = alunosQuery.isLoading;
  const { insert, update, remove } = useMatriculasMutations<AlunoMatriculado>();
  if (alunosQuery.error) console.error("[SecretarioEnrollment] falha ao carregar alunos:", alunosQuery.error);

  const [classeFiltro, setClasseFiltro] = useState("todas");
  const classesFiltro = useMemo(() => {
    const presentes = new Set(alunosList.map((aluno) => normalizeClasseOficial(aluno.classe)).filter((classe) => classe !== "Sem classe"));
    return [
      ...classes.filter((classe) => presentes.has(classe)),
      ...[...presentes].filter((classe) => !classes.includes(classe as any)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [alunosList]);
  const alunosFiltrados = useMemo(
    () => classeFiltro === "todas"
      ? alunosList
      : alunosList.filter((aluno) => normalizeClasseOficial(aluno.classe) === classeFiltro),
    [alunosList, classeFiltro],
  );

  const editarNome = (a: AlunoMatriculado) => {
    const nome = window.prompt("Nome completo do aluno", a.nome_completo)?.trim();
    if (nome && nome !== a.nome_completo) update.mutate({ id: a.id, changes: { nome_completo: nome } });
  };
  const eliminar = (a: AlunoMatriculado) => {
    if (window.confirm(`Eliminar a matrícula de ${a.nome_completo}?`)) remove.mutate(a.id);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFotoPreview(result);
        setForm((prev) => ({ ...prev, fotografia_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo || !form.classe || !form.data_nascimento || !form.numero_processo.trim() || !form.sexo) {
      toast.error("Por favor, preencha os campos obrigatórios (*).");
      return;
    }

    setSaving(true);

    const novoAluno: AlunoMatriculado = {
      id: "",
      nome_completo: form.nome_completo.trim(),
      nomes_parentes: form.nomes_parentes.trim(),
      data_nascimento: form.data_nascimento,
      sexo: form.sexo,
      classe: form.classe,
      turma: form.turma || "A",
      numero_processo: form.numero_processo.trim(),
      contacto: form.contacto.trim(),
      fotografia_url: form.fotografia_url || "",
      status: "pendente"
    };

    const temp = { ...novoAluno, id: `tmp-${Date.now()}` };
    const form0 = form;
    setForm({ nome_completo: "", nomes_parentes: "", data_nascimento: "", sexo: "", idade: "", classe: "", turma: "A", numero_processo: "", contacto: "", fotografia_url: "" });
    setFotoPreview(null);
    insert.mutate({
      aluno: temp,
      save: async () => {
        const { student } = await registarAlunoCompleto({
          fullName: novoAluno.nome_completo,
          birthDate: novoAluno.data_nascimento,
          gender: novoAluno.sexo,
          idade: form0.idade ? Number(form0.idade) : null,
          turma: novoAluno.turma,
          classe: novoAluno.classe,
          numeroProcesso: novoAluno.numero_processo ?? "",
        });
        if (student?.id) novoAluno.id = String(student.id);
        toast.success("Aluno guardado na base escolar e na base financeira.");
        setFichaAtiva(novoAluno);
      },
    }, {
      onError: () => setForm(form0),
      onSettled: () => setSaving(false),
    });
  };

  const updateStatus = async (id: string, novoStatus: string) => {
    void id;
    void novoStatus;
    toast.error("Estado não alterado: o esquema actual não confirma uma coluna de decisão em `matriculas` ou `confirmacoes`; nenhum dado foi enviado.");
  };

  const renderBadge = (status?: string) => {
    if (status === "aprovado") return <Badge className="bg-green-600 text-white">Aprovado</Badge>;
    if (status === "rejeitado") return <Badge variant="destructive">Rejeitado</Badge>;
    if (!status) return <Badge variant="outline">Estado indisponível</Badge>;
    return <Badge variant="secondary" className="text-amber-700 bg-amber-100"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Matrículas e Registo" navItems={secretarioNav}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Registo de Matrícula</h1>
          <p className="text-muted-foreground text-sm mt-1">Preencha o formulário para matricular o aluno no sistema.</p>
        </div>

        {/* Formulário */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start pb-4 border-b border-border/60">
              <div className="flex flex-col items-center gap-2">
                <div className="w-28 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-secondary/50 relative">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs px-3 py-1.5 rounded-md font-medium transition-colors">
                  Anexar Foto
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo do Aluno *</Label>
                  <Input
                    value={form.nome_completo}
                    onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                    placeholder="Ex: Carlos Eduardo Manuel"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Nascimento *</Label>
                    <Input
                      type="date"
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input type="number" min={2} max={30} value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} placeholder="Ex: 6" />
                  </div>
                  <div className="space-y-2">
                    <Label>Género *</Label>
                    <Select value={form.sexo} onValueChange={(value) => setForm({ ...form, sexo: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto Telefónico</Label>
                    <Input
                      value={form.contacto}
                      onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                      placeholder="+244 9XX XXX XXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nº de Processo *</Label>
                  <Input
                    value={form.numero_processo}
                    onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
                    placeholder="Ex: 10245"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome Completo dos Parentes / Encarregado</Label>
                <Input
                  value={form.nomes_parentes}
                  onChange={(e) => setForm({ ...form, nomes_parentes: e.target.value })}
                  placeholder="Ex: Maria José Manuel (Mãe)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Classe *</Label>
                  <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Input
                    value={form.turma}
                    onChange={(e) => setForm({ ...form, turma: e.target.value })}
                    placeholder="Ex: A, B ou C"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                <UserPlus className="h-4 w-4 mr-2" />
                {saving ? "A processar..." : "Efetuar Matrícula e Gerar Ficha"}
              </Button>
            </div>
          </form>
        </div>

        {/* Tabela de Alunos */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-lg">Alunos Registados ({alunosFiltrados.length})</h2>
            <Select value={classeFiltro} onValueChange={setClasseFiltro}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar alunos por classe">
                <SelectValue placeholder="Todas as classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as classes</SelectItem>
                {classesFiltro.map((classe) => <SelectItem key={classe} value={classe}>{classe}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-4 py-3 font-semibold">Nome do Aluno</th>
                  <th className="text-left px-4 py-3 font-semibold">Classe</th>
                  <th className="text-left px-4 py-3 font-semibold">Processo</th>
                  <th className="text-left px-4 py-3 font-semibold">Turma</th>
                  <th className="text-center px-4 py-3 font-semibold">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold">Ficha Oficial</th>
                  <th className="text-center px-4 py-3 font-semibold">Acções</th>
                </tr>
              </thead>
              <tbody>
                {loadingAlunos ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</td></tr>
                ) : alunosList.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluno registado ainda.</td></tr>
                ) : alunosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluno nesta classe.</td></tr>
                ) : (
                  alunosFiltrados.map((a) => (
                    <tr key={a.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.nome_completo}</td>
                      <td className="px-4 py-3">{a.classe}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.numero_processo || "—"}</td>
                      <td className="px-4 py-3">{a.turma || "—"}</td>
                      <td className="px-4 py-3 text-center">{renderBadge(a.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => setFichaAtiva(a)} className="h-7 text-xs gap-1 border-primary text-primary">
                          <Printer className="h-3 w-3" /> Ver Ficha
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.status === "pendente" && (
                          <div className="flex gap-1.5 justify-center">
                            <Button size="sm" onClick={() => updateStatus(a.id, "aprovado")} className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, "rejeitado")} className="h-7 text-xs">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {!a.id.startsWith("tmp-") && (
                          <div className="flex gap-1.5 justify-center mt-1">
                            <Button size="sm" variant="outline" onClick={() => editarNome(a)} className="h-7 text-xs" aria-label="Editar nome">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => eliminar(a)} className="h-7 text-xs text-destructive" aria-label="Eliminar">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL DA FICHA */}
      {fichaAtiva && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-lg">Ficha Oficial de Matrícula</h3>
              <Button variant="ghost" size="icon" onClick={() => setFichaAtiva(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div id="printable-area" className="bg-card text-card-foreground p-6 border border-border rounded-lg space-y-4 text-sm">
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-bold text-lg uppercase">Colégio Herdeiros do Futuro</h2>
                <p className="text-muted-foreground text-xs">Secretaria Escolar — Comprovativo Oficial de Matrícula</p>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <p><strong>Nome Completo do Aluno:</strong> {fichaAtiva.nome_completo}</p>
                  <p><strong>Data de Nascimento:</strong> {fichaAtiva.data_nascimento}</p>
                  <p><strong>Classe Matriculada:</strong> {fichaAtiva.classe}</p>
                  <p><strong>Nº de Processo:</strong> {fichaAtiva.numero_processo || "—"}</p>
                  <p><strong>Turma Atribuída:</strong> {fichaAtiva.turma || "A"}</p>
                  <p><strong>Encarregado / Parentes:</strong> {fichaAtiva.nomes_parentes || "—"}</p>
                  <p><strong>Contacto Telefónico:</strong> {fichaAtiva.contacto || "—"}</p>
                  <p><strong>Data de Registo:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-foreground/50 pt-1">Assinatura da Secretaria</div>
                <div className="border-t border-foreground/50 pt-1">Assinatura do Encarregado</div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setFichaAtiva(null)}>Fechar</Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleLayout>
  );
}