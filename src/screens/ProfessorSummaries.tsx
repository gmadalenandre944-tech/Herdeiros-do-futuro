import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useTeacher } from "@/hooks/useTeacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, BookMarked, Download } from "lucide-react";
import { professorNav } from "@/lib/nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const today = () => new Date().toISOString().slice(0, 10);

interface HistoryRow {
  id: string;
  data: string;
  turma: string;
  disciplina: string;
  subtema?: string | null;
  conteudo: string;
  objetivo: string | null;
}

export default function ProfessorSummaries() {
  const { user } = useTeacher();
  const [turma, setTurma] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [subtema, setSubtema] = useState("");
  const [data, setData] = useState(today());
  const [conteudo, setConteudo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { data: rows, error } = await dbFrom("sumarios")
        .select("id, data, turma, disciplina, subtema, conteudo, objetivo")
        .eq("professor_id", user.id)
        .order("data", { ascending: false })
        .limit(30);
      if (error) throw error;
      setHistory((rows as any) ?? []);
    } catch (error: any) {
      console.error("[ProfessorSummaries] falha ao carregar sumários:", error);
      toast.error(`Não foi possível carregar os sumários: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!turma.trim()) return toast.error("Informe a turma");
    if (!disciplina.trim()) return toast.error("Informe a disciplina");
    if (!conteudo.trim()) return toast.error("Conteúdo é obrigatório");

    setSaving(true);
    try {
      const { error } = await dbFrom("sumarios").insert({
        professor_id: user.id,
        turma: turma.trim(),
        disciplina: disciplina.trim(),
        subtema: subtema.trim() || null,
        data,
        conteudo,
        objetivo: objetivo || null,
      });
      if (error) throw error;
      toast.success("Sumário guardado com sucesso!");
      setConteudo("");
      setObjetivo("");
      setSubtema("");
      await loadHistory();
    } catch (error: any) {
      console.error("[ProfessorSummaries] falha ao guardar sumário:", error);
      toast.error(`Não foi possível guardar o sumário: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setSaving(false);
    }
  };

  // Função para descarregar o caderno digital completo ou filtrado
  const exportCaderno = () => {
    if (history.length === 0) {
      return toast.error("Não há sumários para descarregar.");
    }

    const conteudoFicheiro = history
      .map(
        (h, index) =>
          `-----------------------------------------\n` +
          `REGISTO #${history.length - index}\n` +
          `Data: ${h.data}\n` +
          `Turma: ${h.turma}\n` +
          `Disciplina: ${h.disciplina}\n` +
          (h.subtema ? `Subtema: ${h.subtema}\n` : "") +
          `Objetivos: ${h.objetivo || "N/A"}\n` +
          `Conteúdo:\n${h.conteudo}\n`
      )
      .join("\n");

    const blob = new Blob([conteudoFicheiro], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Caderno_Digital_Sumarios_${today()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Caderno digital descarregado com sucesso!");
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Sumários" navItems={professorNav}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-montserrat font-bold text-2xl lg:text-3xl">Caderno Digital / Sumários</h1>
            <p className="text-sm text-muted-foreground">Registe e descarregue o diário das suas aulas.</p>
          </div>
          <Button variant="outline" onClick={exportCaderno} className="self-start sm:self-auto">
            <Download className="h-4 w-4 mr-2" /> Descarregar Caderno
          </Button>
        </div>

        <Tabs defaultValue="sumarios" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="sumarios">Sumários</TabsTrigger>
        </TabsList>
        <TabsContent value="sumarios" className="space-y-6">
        {/* Formulário de Registo Manual */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Input
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 12ª A, 10ª Inf..."
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <Input
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                placeholder="Ex: Matemática, TIC..."
              />
            </div>
            <div className="space-y-2">
              <Label>Subtema</Label>
              <Input
                value={subtema}
                onChange={(e) => setSubtema(e.target.value)}
                placeholder="Ex: Funções Trigonométricas"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conteúdo da Aula *</Label>
            <Textarea
              rows={4}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva detalhadamente o que foi lecionado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Objetivos</Label>
            <Textarea
              rows={2}
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Objetivos pedagógicos da aula (opcional)"
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Salvar Sumário no Caderno"}
          </Button>
        </div>

        {/* Histórico / Visualização do Caderno */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <BookMarked className="h-5 w-5 text-primary" /> Histórico do Caderno Digital
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem sumários registados até ao momento.</p>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="border-l-4 border-primary bg-secondary/30 p-4 rounded-r-lg space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-b border-border/50 pb-2">
                    <span className="font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded">
                      {h.turma} — {h.disciplina}
                      {h.subtema ? ` (${h.subtema})` : ""}
                    </span>
                    <span>{h.data}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap font-sans">{h.conteudo}</p>
                  {h.objetivo && (
                    <p className="text-xs text-muted-foreground pt-1">
                      <strong>Objetivo:</strong> {h.objetivo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
}