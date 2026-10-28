import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES_OFICIAIS, TODAS_TURMAS, fetchMatriculasDaVista, filtrarPorClasseTurma, turmasDaClasse, type Matricula } from "@/lib/schoolData";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Check, X, AlertCircle, Plus, Trash2, FileDown } from "lucide-react";
import { professorNav } from "@/lib/nav";

interface AlunoFrequencia {
  id: string;
  alunoId?: string;
  numeroProcesso: string;
  nomeAluno: string;
  status: "presente" | "ausente" | "justificado";
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ProfessorAttendance() {
  const { user } = useAuth();
  const [turma, setTurma] = useState("");
  const [classe, setClasse] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [vista, setVista] = useState<Matricula[]>([]);
  const [letra, setLetra] = useState(TODAS_TURMAS);
  const [gravando, setGravando] = useState(false);
  const [data, setData] = useState(today());
  
  // Lista de alunos inseridos manualmente
  const [alunos, setAlunos] = useState<AlunoFrequencia[]>([
    { id: "1", numeroProcesso: "01", nomeAluno: "", status: "presente" },
  ]);

  const numerar = (lista: AlunoFrequencia[]) =>
    lista.map((a, i) => ({ ...a, numeroProcesso: String(i + 1).padStart(2, "0") }));

  /** Ordena alfabeticamente e renumera 01, 02, 03… (linhas vazias ficam no fim). */
  const ordenar = (lista: AlunoFrequencia[]) =>
    numerar([...lista].sort((a, b) => {
      if (!a.nomeAluno.trim()) return 1;
      if (!b.nomeAluno.trim()) return -1;
      return a.nomeAluno.localeCompare(b.nomeAluno, "pt");
    }));

  const aplicar = (lista: Matricula[], c: string, l: string) => {
    const sel = filtrarPorClasseTurma(lista, c, l);
    if (!sel.length) toast.info("Não há alunos registados nesta turma.");
    setTurma(l === TODAS_TURMAS ? c : `${c.replace(/ª Classe$/, "")}${l}`);
    setAlunos(ordenar(sel.map((a) => ({
      id: `db-${a.id}`, alunoId: a.id, numeroProcesso: "", nomeAluno: a.nome, status: "presente" as const,
    }))));
  };

  const carregarClasse = async (c: string) => {
    setClasse(c);
    setLetra(TODAS_TURMAS);
    setCarregando(true);
    try {
      const todos = vista.length ? vista : await fetchMatriculasDaVista();
      setVista(todos);
      aplicar(todos, c, TODAS_TURMAS);
    } catch (e: any) {
      toast.error(`Não foi possível carregar os alunos: ${e?.message ?? "erro de ligação"}`);
    } finally {
      setCarregando(false);
    }
  };

  const adicionarAluno = () => {
    setAlunos((prev) => numerar([
      ...prev,
      { id: Date.now().toString(), numeroProcesso: "", nomeAluno: "", status: "presente" },
    ]));
  };

  const removerAluno = (id: string) => {
    if (alunos.length === 1) {
      toast.error("Deve manter pelo menos um aluno na lista.");
      return;
    }
    setAlunos((prev) => numerar(prev.filter((a) => a.id !== id)));
  };

  const atualizarAluno = (id: string, campo: keyof AlunoFrequencia, valor: any) => {
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a))
    );
  };

  const setAll = (status: "presente" | "ausente" | "justificado") => {
    setAlunos((prev) => prev.map((a) => ({ ...a, status })));
    toast.success(`Todos marcados como: ${status}`);
  };

  const salvarFrequencia = async () => {
    if (!turma.trim()) {
      toast.error("Por favor, preencha o nome da turma.");
      return;
    }
    // Linhas sem nome são ignoradas; nomes escritos à mão são aceites.
    const preenchidos = alunos.filter((a) => a.nomeAluno.trim());
    if (!preenchidos.length) {
      toast.error("Escreva o nome de pelo menos um aluno.");
      return;
    }
    setAlunos(ordenar(preenchidos.length ? preenchidos : alunos));
    const base = (a: AlunoFrequencia) => ({
      professor_id: user?.id ?? null,
      turma: turma.trim(),
      data,
      presente: a.status === "presente",
    });
    const daLista = preenchidos.filter((a) => a.alunoId).map((a) => ({
      ...base(a),
      aluno_id: Number.isNaN(Number(a.alunoId)) ? a.alunoId : Number(a.alunoId),
    }));
    const manuais = preenchidos.filter((a) => !a.alunoId).map((a) => ({ ...base(a), aluno_id: null }));
    setGravando(true);
    try {
      let gravados = 0;
      if (daLista.length) {
        const { error } = await dbFrom("frequencias").insert(daLista as any);
        if (error) throw error;
        gravados += daLista.length;
      }
      if (manuais.length) {
        const { error } = await dbFrom("frequencias").insert(manuais as any);
        if (error) {
          toast.warning(`${manuais.length} aluno(s) adicionados à mão não foram gravados: a base de dados exige um aluno registado.`);
        } else {
          gravados += manuais.length;
        }
      }
      if (gravados) toast.success(`Frequência de ${gravados} aluno(s) guardada na base de dados.`);
    } catch (e: any) {
      toast.error(`Não foi possível guardar a frequência: ${e?.message ?? "erro de ligação"}`);
    } finally {
      setGravando(false);
    }
  };

  // Função para descarregar o mapa de frequências em PDF
  const descarregarPDF = () => {
    if (!turma.trim()) {
      toast.error("Preencha a turma para gerar o PDF.");
      return;
    }

    const janelaPrint = window.open("", "_blank");
    if (!janelaPrint) {
      toast.error("Permita pop-ups no navegador para descarregar o PDF.");
      return;
    }

    const htmlConteudo = `
      <html>
        <head>
          <title>Mapa de Frequência - ${turma} (${data})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; text-transform: uppercase; }
            p { text-align: center; margin-top: 0; font-size: 14px; color: #666; }
            .info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; font-size: 13px; }
            th { background-color: #f4f4f4; text-align: center; }
            td.center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Colégio Herdeiros do Futuro</h2>
          <p>Mapa de Controlo de Assiduidade</p>
          <div class="info">
            <strong>Turma:</strong> ${turma} &nbsp;&nbsp;|&nbsp;&nbsp; 
            <strong>Data:</strong> ${data}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Nº</th>
                <th>Nome Completo do Aluno</th>
                <th style="width: 120px; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${alunos
                .map(
                  (a, index) => `
                <tr>
                  <td class="center">${a.numeroProcesso || index + 1}</td>
                  <td>${a.nomeAluno || "—"}</td>
                  <td class="center"><strong>${a.status.toUpperCase()}</strong></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    janelaPrint.document.write(htmlConteudo);
    janelaPrint.document.close();
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Frequência" navItems={professorNav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl">Frequência Diária (Manual)</h1>
          <p className="text-sm text-muted-foreground">Digite a turma, data, adicione os alunos e marque as presenças ou faltas.</p>
        </div>

        {/* Passo 1 e 2: Digitação Manual da Turma, Data e Atalhos */}
        <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm">
          <div className="space-y-2">
            <Label>Classe (carrega os alunos)</Label>
            <Select value={classe} onValueChange={(v) => void carregarClasse(v)}>
              <SelectTrigger><SelectValue placeholder={carregando ? "A carregar..." : "Escolher classe"} /></SelectTrigger>
              <SelectContent>
                {CLASSES_OFICIAIS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={letra} onValueChange={(v) => { setLetra(v); aplicar(vista, classe, v); }} disabled={!classe}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_TURMAS}>Todas as turmas</SelectItem>
                {turmasDaClasse(vista, classe).map((l) => <SelectItem key={l} value={l}>{classe.replace(/ª Classe$/, "")}{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input 
              placeholder="Nome da turma (ex: 5A)" 
              value={turma} 
              onChange={(e) => setTurma(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => setAll("presente")} className="w-full text-xs">
              Marcar Todos Presentes
            </Button>
          </div>
        </div>

        {/* Tabela de Inserção Manual de Alunos e Estados */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-secondary/30 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-sm">Lista de Alunos e Assiduidade</h3>
            <Button size="sm" variant="outline" onClick={adicionarAluno} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar Aluno
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium w-20">Nº</th>
                  <th className="text-left px-4 py-3 font-medium">Nome Completo do Aluno</th>
                  <th className="text-center px-4 py-3 w-56 font-medium">Estado de Assiduidade</th>
                  <th className="text-center px-4 py-3 w-16 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Input 
                        value={a.numeroProcesso} 
                        onChange={(e) => atualizarAluno(a.id, "numeroProcesso", e.target.value)}
                        className="text-center h-9 font-mono"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input 
                        placeholder="Nome completo do aluno..." 
                        value={a.nomeAluno} 
                        onChange={(e) => atualizarAluno(a.id, "nomeAluno", e.target.value)}
                        className="h-9"
                      />
                    </td>
                    <td className="px-4 py-3 text-center space-x-1">
                      <button 
                        type="button"
                        onClick={() => atualizarAluno(a.id, "status", "presente")}
                         className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${a.status === "presente" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"}`}
                      >
                        <Check className="h-3 w-3 inline mr-1" /> P
                      </button>
                      <button 
                        type="button"
                        onClick={() => atualizarAluno(a.id, "status", "ausente")}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${a.status === "ausente" ? "bg-red-600 text-white border-red-700" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"}`}
                      >
                        <X className="h-3 w-3 inline mr-1" /> F
                      </button>
                      <button 
                        type="button"
                        onClick={() => atualizarAluno(a.id, "status", "justificado")}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${a.status === "justificado" ? "bg-amber-500 text-white border-amber-600" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/70"}`}
                      >
                        <AlertCircle className="h-3 w-3 inline mr-1" /> J
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removerAluno(a.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botões de Ação Inferiores */}
          <div className="p-4 bg-secondary/20 border-t border-border flex justify-between items-center gap-4">
            <Button variant="outline" onClick={descarregarPDF} className="gap-2">
              <FileDown className="h-4 w-4" /> Descarregar PDF
            </Button>
            <Button onClick={() => void salvarFrequencia()} disabled={gravando} className="gap-2">
              <Save className="h-4 w-4" /> Salvar Frequência
            </Button>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}