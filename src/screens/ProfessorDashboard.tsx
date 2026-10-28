import { useState, useMemo } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { professorNav } from "@/lib/nav";
import { Trophy, Users, Plus, Trash2, Medal } from "lucide-react";
import { toast } from "sonner";

interface AlunoRanking {
  id: string;
  turma: string;
  nome: string;
  nota: number;
}

export default function ProfessorDashboard() {
  // Estados para o Ranking Manual por Turma
  const [turmaInput, setTurmaInput] = useState("");
  const [nomeAlunoInput, setNomeAlunoInput] = useState("");
  const [notaAlunoInput, setNotaAlunoInput] = useState("");
  const [turmaSelecionadaFiltro, setTurmaSelecionadaFiltro] = useState("todas");

  // Lista de alunos no ranking (pode ser guardada no localStorage ou estado local)
  const [rankingLista, setRankingLista] = useState<AlunoRanking[]>([
    { id: "1", turma: "10ª A", nome: "Ana Costa", nota: 16.5 },
    { id: "2", turma: "10ª A", nome: "Carlos Manuel", nota: 14.0 },
    { id: "3", turma: "11ª B", nome: "Beatriz Sousa", nota: 18.2 },
  ]);

  // Obter lista única de turmas existentes no ranking
  const turmasDisponiveis = useMemo(() => {
    return [...new Set(rankingLista.map((item) => item.turma))];
  }, [rankingLista]);

  // Adicionar aluno/nota manualmente ao ranking
  const handleAdicionarAoRanking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaInput.trim() || !nomeAlunoInput.trim() || !notaAlunoInput) {
      toast.error("Por favor, preenche todos os campos (Turma, Nome e Nota).");
      return;
    }

    const novaNota = parseFloat(notaAlunoInput);
    if (isNaN(novaNota) || novaNota < 0 || novaNota > 20) {
      toast.error("Insere uma nota válida entre 0 e 20.");
      return;
    }

    const novoItem: AlunoRanking = {
      id: Date.now().toString(),
      turma: turmaInput.trim().toUpperCase(),
      nome: nomeAlunoInput.trim(),
      nota: novaNota,
    };

    setRankingLista((prev) => [...prev, novoItem]);
    setNomeAlunoInput("");
    setNotaAlunoInput("");
    toast.success("Aluno adicionado ao ranking com sucesso!");
  };

  // Remover aluno do ranking
  const handleRemoverAluno = (id: string) => {
    setRankingLista((prev) => prev.filter((item) => item.id !== id));
    toast.info("Aluno removido do ranking.");
  };

  // Filtrar e calcular o ranking de forma automática (Até o limite de 20 alunos por turma)
  const rankingProcessado = useMemo(() => {
    let lista = [...rankingLista];

    if (turmaSelecionadaFiltro !== "todas") {
      lista = lista.filter((item) => item.turma === turmaSelecionadaFiltro);
    }

    // Ordenar da maior nota para a menor e limitar estritamente a 20 posições
    return lista
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 20);
  }, [rankingLista, turmaSelecionadaFiltro]);

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Painel do Professor" navItems={professorNav}>
      <div className="space-y-6">
        
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Painel de Gestão e Ranking</h1>
          <p className="text-muted-foreground text-sm mt-1">Registe e acompanhe o aproveitamento das turmas manualmente.</p>
        </div>

        {/* Formulário para Digitar / Adicionar Aluno e Nota Manualmente */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-primary" /> Inserir Aluno no Ranking Manualmente
          </h2>
          
          <form onSubmit={handleAdicionarAoRanking} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Nome da Turma</Label>
              <Input
                type="text"
                placeholder="Ex: 10ª A"
                value={turmaInput}
                onChange={(e) => setTurmaInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Aluno</Label>
              <Input
                type="text"
                placeholder="Nome completo"
                value={nomeAlunoInput}
                onChange={(e) => setNomeAlunoInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Média / Nota (0 a 20)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 14.5"
                value={notaAlunoInput}
                onChange={(e) => setNotaAlunoInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Adicionar ao Ranking
            </Button>
          </form>
        </div>

        {/* Visualização do Ranking Automático por Turma */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-semibold flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" /> Ranking Automático por Turma (Top 20)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Calculado automaticamente com base nos dados inseridos.</p>
            </div>

            {/* Filtro para visualizar a turma desejada */}
            <div className="flex items-center gap-2">
              <Label className="text-xs">Filtrar Turma:</Label>
              <select
                value={turmaSelecionadaFiltro}
                onChange={(e) => setTurmaSelecionadaFiltro(e.target.value)}
                className="text-xs bg-secondary text-secondary-foreground border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="todas">Todas as Turmas</option>
                {turmasDisponiveis.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {rankingProcessado.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registo encontrado para esta turma.</p>
          ) : (
            <div className="space-y-2.5">
              {rankingProcessado.map((r, index) => (
                <div key={r.id} className="flex items-center justify-between p-3.5 bg-secondary/40 hover:bg-secondary/70 transition-colors rounded-xl border border-border/40">
                  <div className="flex items-center gap-3.5">
                    <Badge className={`w-8 h-8 rounded-full flex items-center justify-center p-0 text-xs font-bold ${
                      index === 0 ? "bg-amber-500 text-white" : index === 1 ? "bg-slate-400 text-white" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-foreground"
                    }`}>
                      {index === 0 ? <Medal className="h-4 w-4" /> : `${index + 1}º`}
                    </Badge>
                    <div>
                      <p className="font-semibold text-sm">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">Turma: {r.turma}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold text-primary text-base">{r.nota.toFixed(2)}</span>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Média</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoverAluno(r.id)}
                      className="text-destructive hover:text-destructive/80 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </RoleLayout>
  );
}