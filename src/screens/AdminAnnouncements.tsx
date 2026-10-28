import { useState, useEffect } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, FileSpreadsheet, Megaphone, Paperclip } from "lucide-react";
import { adminNav } from "@/lib/nav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchBaseEscolar } from "@/lib/schoolData";

const classes = [
  "Iniciação", "1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe", 
  "7ª Classe", "8ª Classe", "9ª Classe", "10ª Classe", "11ª Classe", "12ª Classe", "13ª Classe"
];

const audiences = [
  { id: "todos", label: "Todos" },
  { id: "professor", label: "Professores" },
  { id: "aluno", label: "Alunos" },
  { id: "encarregado", label: "Encarregados" },
  { id: "secretario", label: "Secretaria" },
];

const diasSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  created_at: string;
}

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  
  // Tipos: 'comunicado' | 'horario' | 'matriz'
  const [tipoPublicacao, setTipoPublicacao] = useState<string>("comunicado");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targets, setTargets] = useState<string[]>(["todos"]);
  const [classeFiltro, setClasseFiltro] = useState<string>("");
  const [turmaFiltro, setTurmaFiltro] = useState<string>("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [turmas, setTurmas] = useState<{ id: string; nome: string; classe: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Estado para a Tabela de Horário (linhas com hora e dias da semana)
  const [linhasHorario, setLinhasHorario] = useState([
    { tempo: "1º Bloco (07:30 - 08:15)", dias: { "Segunda-feira": "", "Terça-feira": "", "Quarta-feira": "", "Quinta-feira": "", "Sexta-feira": "" } },
    { tempo: "2º Bloco (08:15 - 09:00)", dias: { "Segunda-feira": "", "Terça-feira": "", "Quarta-feira": "", "Quinta-feira": "", "Sexta-feira": "" } },
    { tempo: "3º Bloco (09:15 - 10:00)", dias: { "Segunda-feira": "", "Terça-feira": "", "Quarta-feira": "", "Quinta-feira": "", "Sexta-feira": "" } },
    { tempo: "4º Bloco (10:00 - 10:45)", dias: { "Segunda-feira": "", "Terça-feira": "", "Quarta-feira": "", "Quinta-feira": "", "Sexta-feira": "" } },
  ]);

  // Estado para o Formulário de Matriz de Provas (itens da matriz)
  const [itensMatriz, setItensMatriz] = useState([
    { disciplina: "", data: "", hora: "", materia: "" }
  ]);

  const fetchAll = async () => {
    const { data } = await dbFrom("announcements")
      .select("id, titulo, conteudo, target_audience, created_at")
      .order("created_at", { ascending: false });
    if (data) setItems(data.map((a: any) => ({ ...a, title: a?.titulo, content: a?.conteudo })) as Announcement[]);
  };

  useEffect(() => {
    fetchAll();
    void fetchBaseEscolar()
      .then(({ turmas }) => setTurmas(turmas as any))
      .catch((error: any) => {
        console.error("[AdminAnnouncements] falha ao carregar turmas:", error);
        toast.error(`Não foi possível carregar as turmas: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      });
  }, []);

  const toggleTarget = (t: string) => {
    setTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleTipoChange = (novoTipo: string) => {
    setTipoPublicacao(novoTipo);
    if (novoTipo === "horario") {
      setTitle("Horário Escolar");
      setTargets(["aluno", "encarregado", "professor"]);
    } else if (novoTipo === "matriz") {
      setTitle("Matriz de Provas / Avaliações");
      setTargets(["aluno", "encarregado"]);
    } else {
      setTitle("");
      setTargets(["todos"]);
    }
  };

  // Funções para manipular a tabela de horário
  const adicionarLinhaHorario = () => {
    setLinhasHorario([
      ...linhasHorario,
      { tempo: `${linhasHorario.length + 1}º Bloco`, dias: { "Segunda-feira": "", "Terça-feira": "", "Quarta-feira": "", "Quinta-feira": "", "Sexta-feira": "" } }
    ]);
  };

  const atualizarCelulaHorario = (indexLinha: number, dia: string, valor: string) => {
    const novasLinhas = [...linhasHorario];
    novasLinhas[indexLinha].dias[dia as keyof typeof novasLinhas[0]['dias']] = valor;
    setLinhasHorario(novasLinhas);
  };

  // Funções para manipular a matriz de provas
  const adicionarItemMatriz = () => {
    setItensMatriz([...itensMatriz, { disciplina: "", data: "", hora: "", materia: "" }]);
  };

  const removerItemMatriz = (index: number) => {
    setItensMatriz(itensMatriz.filter((_, i) => i !== index));
  };

  const atualizarItemMatriz = (index: number, campo: string, valor: string) => {
    const novaMatriz = [...itensMatriz];
    (novaMatriz[index] as any)[campo] = valor;
    setItensMatriz(novaMatriz);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    let conteudoFinal = content;
    const meta: string[] = [];
    meta.push(`Tipo: ${tipoPublicacao.toUpperCase()}`);
    if (classeFiltro) meta.push(`Classe: ${classeFiltro}`);
    if (turmaFiltro) {
      const t = turmas.find((x) => x.id === turmaFiltro);
      if (t) meta.push(`Turma: ${t?.nome}`);
    }
    if (anexo) meta.push(`Anexo: ${anexo?.name}`);

    // Se for horário, formata a tabela num texto estruturado para envio
    if (tipoPublicacao === "horario") {
      const tabelaTexto = linhasHorario.map(l => 
        `[${l.tempo}] -> ` + Object.entries(l.dias).map(([dia, disc]) => `${dia}: ${disc || '—'}`).join(" | ")
      ).join("\n");
      conteudoFinal = `HORÁRIO ESCOLAR\n\n${tabelaTexto}\n\nObs: ${content}`;
    } 
    // Se for matriz, formata os itens do formulário
    else if (tipoPublicacao === "matriz") {
      const matrizTexto = itensMatriz.map(m => 
        `• Disciplina: ${m.disciplina} | Data: ${m.data} (${m.hora}) | Matéria: ${m.materia}`
      ).join("\n");
      conteudoFinal = `MATRIZ DE PROVAS\n\n${matrizTexto}\n\nObs: ${content}`;
    }

    const finalContentWithMeta = meta.length ? `${conteudoFinal}\n\n[${meta.join(" • ")}]` : conteudoFinal;
    try {
      const { error } = await dbFrom("announcements").insert({
        titulo: title,
        conteudo: finalContentWithMeta,
        target_audience: targets,
        author_id: user.id,
      });
      if (error) throw error;

      toast.success(`${tipoPublicacao === 'horario' ? 'Horário' : tipoPublicacao === 'matriz' ? 'Matriz' : 'Comunicado'} publicado com sucesso!`);
      setTitle("");
      setContent("");
      setTargets(["todos"]);
      setClasseFiltro("");
      setTurmaFiltro("");
      setAnexo(null);
      setTipoPublicacao("comunicado");
      await fetchAll();
    } catch (error: any) {
      console.error("[AdminAnnouncements] falha ao publicar:", error);
      toast.error(`Não foi possível publicar: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Publicação removida com sucesso.");
      await fetchAll();
    } catch (error: any) {
      console.error("[AdminAnnouncements] falha ao remover publicação:", error);
      toast.error(`Não foi possível remover a publicação: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  const turmasFiltradas = classeFiltro ? turmas.filter((t) => t?.classe === classeFiltro) : turmas;

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Comunicados, Horários e Matrizes" navItems={adminNav}>
      <div className="space-y-6">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Gestão de Publicações Escolares</h1>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-4">
            
            {/* Seletor do Tipo de Publicação */}
            <div className="space-y-2">
              <Label>O que deseja publicar?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={tipoPublicacao === "comunicado" ? "default" : "outline"}
                  className="justify-start gap-2 h-11"
                  onClick={() => handleTipoChange("comunicado")}
                >
                  <Megaphone className="h-4 w-4" /> Comunicado Geral
                </Button>
                <Button
                  type="button"
                  variant={tipoPublicacao === "horario" ? "default" : "outline"}
                  className="justify-start gap-2 h-11"
                  onClick={() => handleTipoChange("horario")}
                >
                  <Calendar className="h-4 w-4" /> Horário Escolar (Tabela)
                </Button>
                <Button
                  type="button"
                  variant={tipoPublicacao === "matriz" ? "default" : "outline"}
                  className="justify-start gap-2 h-11"
                  onClick={() => handleTipoChange("matriz")}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Matriz de Provas (Formulário)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título da Publicação</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Horário 1º Trimestre - 10ª Classe" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Classe Alvo</Label>
                  <Select value={classeFiltro || "todas"} onValueChange={(v) => { setClasseFiltro(v === "todas" ? "" : v); setTurmaFiltro(""); }}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as classes</SelectItem>
                      {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turma Alvo</Label>
                  <Select value={turmaFiltro || "todas"} onValueChange={(v) => setTurmaFiltro(v === "todas" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      {turmasFiltradas.map((t) => <SelectItem key={t.id} value={t.id}>{t?.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SE FOR HORÁRIO: MOSTRA A TABELA INTERATIVA */}
            {tipoPublicacao === "horario" && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-base">Construtor de Horário por Tabela</Label>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarLinhaHorario}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Bloco/Hora
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Preencha a disciplina correspondente a cada dia da semana e tempo letivo.</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="p-2 border border-border text-left">Tempo / Horas</th>
                        {diasSemana.map(dia => (
                          <th key={dia} className="p-2 border border-border text-center">{dia}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {linhasHorario.map((linha, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border border-border font-medium">
                            <Input 
                              value={linha.tempo} 
                              onChange={(e) => {
                                const novas = [...linhasHorario];
                                novas[idx].tempo = e.target.value;
                                setLinhasHorario(novas);
                              }}
                              className="h-8 text-xs" 
                            />
                          </td>
                          {diasSemana.map(dia => (
                            <td key={dia} className="p-2 border border-border">
                              <Input 
                                placeholder="Disciplina" 
                                value={linha.dias[dia as keyof typeof linha['dias']]} 
                                onChange={(e) => atualizarCelulaHorario(idx, dia, e.target.value)}
                                className="h-8 text-xs text-center"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SE FOR MATRIZ: MOSTRA O FORMULÁRIO DE ITENS DE PROVA */}
            {tipoPublicacao === "matriz" && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-base">Formulário de Matriz de Provas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarItemMatriz}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Prova
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Adicione as disciplinas, datas, horários e as matérias que vão sair na prova.</p>

                <div className="space-y-3">
                  {itensMatriz.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-card p-3 rounded-lg border border-border">
                      <div className="sm:col-span-3">
                        <Label className="text-[10px]">Disciplina</Label>
                        <Input 
                          placeholder="Ex: Matemática" 
                          value={item.disciplina} 
                          onChange={(e) => atualizarItemMatriz(idx, "disciplina", e.target.value)}
                          className="h-8 text-xs" 
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[10px]">Data</Label>
                        <Input 
                          type="date" 
                          value={item.data} 
                          onChange={(e) => atualizarItemMatriz(idx, "data", e.target.value)}
                          className="h-8 text-xs" 
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[10px]">Hora</Label>
                        <Input 
                          placeholder="Ex: 08:00" 
                          value={item.hora} 
                          onChange={(e) => atualizarItemMatriz(idx, "hora", e.target.value)}
                          className="h-8 text-xs" 
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <Label className="text-[10px]">Matéria / Conteúdos</Label>
                        <Input 
                          placeholder="Ex: Funções, Equações..." 
                          value={item.materia} 
                          onChange={(e) => atualizarItemMatriz(idx, "materia", e.target.value)}
                          className="h-8 text-xs" 
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end pt-4">
                        {itensMatriz.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removerItemMatriz(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações / Instruções Adicionais</Label>
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Escreva notas adicionais, sala de exames ou avisos importantes..." 
                rows={3} 
              />
            </div>

            <div className="space-y-2">
              <Label>Público-Alvo</Label>
              <div className="flex flex-wrap gap-3">
                {audiences.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={targets.includes(a.id)} onCheckedChange={() => toggleTarget(a.id)} />
                    {a?.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexar Ficheiro (Opcional)</Label>
              <Input type="file" onChange={(e) => setAnexo(e.target.files?.[0] ?? null)} accept="image/*,application/pdf,.doc,.docx" />
              {anexo && <p className="text-xs text-muted-foreground">Ficheiro selecionado: {anexo?.name}</p>}
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto mt-4">
              <Plus className="h-4 w-4 mr-2" />{saving ? "A publicar..." : `Publicar ${tipoPublicacao === 'horario' ? 'Horário' : tipoPublicacao === 'matriz' ? 'Matriz' : 'Comunicado'}`}
            </Button>
          </form>
        </div>

        {/* Listagem de Publicações */}
        <div className="space-y-3">
          <h2 className="font-montserrat font-bold text-lg pt-2">Publicações Ativas</h2>
          {items.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start gap-4 shadow-sm">
              <div>
                <h3 className="font-montserrat font-semibold text-foreground text-base">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{a.content}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {a.target_audience?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString("pt-AO")}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} title="Eliminar Publicação">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </RoleLayout>
  );
};

export  default AdminAnnouncements;