import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { adminNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ANO = new Date().getFullYear();

interface Turma { id: string; nome: string; classe: string }

const AdminMatriz = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [matriz, setMatriz] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  
  const [m, setM] = useState({ classe: "", disciplina: "", carga_horaria: "2" });
  const [h, setH] = useState({ 
    turma_id: "", 
    turma_nome_manual: "", 
    classe_manual: "", 
    dia_semana: "Segunda", 
    hora_inicio: "07:30", 
    hora_fim: "08:15", 
    disciplina: "", 
    professor_nome: "", 
    sala: "" 
  });

  const load = async () => {
    const [t, cl, mm, hh] = await Promise.all([
      (supabase as any).from("turmas").select("*"),
      (supabase as any).from("classes").select("*"),
      dbFrom("matriz_escolar").select("*").order("classe"),
      dbFrom("horarios").select("*").order("dia_semana"),
    ]);
    const turmasDb = ((t.data as any[]) ?? []).map((x: any) => ({
      id: String(x.id),
      nome: x.nome ?? x.turma ?? x.name ?? "Turma",
      classe: x.classe ?? x.classe_nome ?? "",
    }));
    const classesDb = ((cl.data as any[]) ?? []).map((c: any) => ({
      id: `classe:${c.id}`,
      nome: "Turma única",
      classe: c.name ?? c.nome ?? c.designacao ?? c.classe ?? "Classe",
    }));
    
    setTurmas((turmasDb.length ? turmasDb : classesDb) as Turma[]);
    setMatriz((mm as any)?.data ?? []);
    setHorarios((hh as any)?.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const addMatriz = async () => {
    if (!m.classe.trim()) return toast.error("Indique a classe");
    if (!m.disciplina.trim()) return toast.error("Indique a disciplina");

    try {
      const { error } = await dbFrom("matriz_escolar").insert({
        classe: m.classe,
        disciplina: m.disciplina,
        carga_horaria: Number(m.carga_horaria) || 0,
        publicada: true,
      });
      if (error) throw error;
      toast.success("Disciplina adicionada à matriz e publicada!");
      setM({ classe: "", disciplina: "", carga_horaria: "2" });
      await load();
    } catch (error: any) {
      console.error("[AdminMatriz] falha ao publicar disciplina:", error);
      toast.error(`Não foi possível publicar a disciplina: ${error?.message ?? "verifique as permissões do Supabase."}`);
    }
  };

  const addHorario = async () => {
    if (!h.disciplina.trim()) return toast.error("Indique a disciplina");
    if (!h.professor_nome.trim()) return toast.error("Indique o nome do professor");

    let nomeTurmaFinal = h.turma_nome_manual.trim();
    let classeFinal = h.classe_manual.trim();
    let turmaIdFinal = h.turma_id && !h.turma_id.startsWith("classe:") ? h.turma_id : null;

    // Se selecionou uma turma na lista, garante que puxa os dados
    if (h.turma_id) {
      const t = turmas.find((x) => x.id === h.turma_id);
      if (t) {
        nomeTurmaFinal = t.nome;
        classeFinal = t.classe;
      }
    }

    if (!nomeTurmaFinal) nomeTurmaFinal = "Turma Geral";
    if (!classeFinal) classeFinal = "Classe Geral";

    try {
      const { error } = await dbFrom("horarios").insert({
        turma_id: turmaIdFinal,
        turma_nome: nomeTurmaFinal,
        classe: classeFinal,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fim: h.hora_fim,
        disciplina: h.disciplina,
        professor_nome: h.professor_nome,
        sala: h.sala,
        publicado: true,
      });
      if (error) throw error;
      toast.success("Horário publicado com sucesso!");
      setH({
        turma_id: "",
        turma_nome_manual: "",
        classe_manual: "",
        dia_semana: "Segunda",
        hora_inicio: "07:30",
        hora_fim: "08:15",
        disciplina: "",
        professor_nome: "",
        sala: "",
      });
      await load();
    } catch (error: any) {
      console.error("[AdminMatriz] falha ao publicar horário:", error);
      toast.error(`Não foi possível publicar o horário: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  const del = async (table: string, id: string) => {
    try {
      const { error } = await dbFrom(table).delete().eq("id", id);
      if (error) throw error;
      toast.success("Registo removido com sucesso.");
      await load();
    } catch (error: any) {
      console.error(`[AdminMatriz] falha ao remover registo de ${table}:`, error);
      toast.error(`Não foi possível remover o registo: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Matriz e Horários" navItems={adminNav}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Matriz Escolar e Horários</h1>
            <p className="text-sm text-muted-foreground">Preencha manualmente os campos e publique para atualizar os painéis de todos os utilizadores.</p>
          </div>
        </div>

        <Tabs defaultValue="horarios">
          <TabsList>
            <TabsTrigger value="horarios">Horários das Aulas</TabsTrigger>
            <TabsTrigger value="matriz">Matriz Escolar</TabsTrigger>
          </TabsList>

          {/* ABA DE HORÁRIOS */}
          <TabsContent value="horarios" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Novo tempo lectivo (Digitação Manual)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Selecione Turma Registada (Opcional)</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={h.turma_id} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if(val) {
                        const found = turmas.find(t => t.id === val);
                        setH(prev => ({ 
                          ...prev, 
                          turma_id: val, 
                          turma_nome_manual: found ? found.nome : prev.turma_nome_manual, 
                          classe_manual: found ? found.classe : prev.classe_manual 
                        }));
                      } else {
                        setH(prev => ({ ...prev, turma_id: "" }));
                      }
                    }}
                  >
                    <option value="">-- Digitar Manualmente --</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.classe} — {t.nome}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Classe (Manual)</Label>
                  <Input 
                    value={h.classe_manual} 
                    onChange={(e) => setH({ ...h, classe_manual: e.target.value })} 
                    placeholder="Ex: 9ª classe" 
                  />
                </div>

                <div>
                  <Label>Nome da Turma (Manual)</Label>
                  <Input 
                    value={h.turma_nome_manual} 
                    onChange={(e) => setH({ ...h, turma_nome_manual: e.target.value })} 
                    placeholder="Ex: Turma A" 
                  />
                </div>

                <div>
                  <Label>Dia da Semana</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={h.dia_semana} 
                    onChange={(e) => setH({ ...h, dia_semana: e.target.value })}
                  >
                    {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div><Label>Início</Label><Input type="time" value={h.hora_inicio} onChange={(e) => setH({ ...h, hora_inicio: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="time" value={h.hora_fim} onChange={(e) => setH({ ...h, hora_fim: e.target.value })} /></div>
                
                <div>
                  <Label>Disciplina (Digitação livre)</Label>
                  <Input 
                    value={h.disciplina} 
                    onChange={(e) => setH({ ...h, disciplina: e.target.value })} 
                    placeholder="Ex: Matemática..." 
                  />
                </div>

                <div>
                  <Label>Professor</Label>
                  <Input 
                    value={h.professor_nome} 
                    onChange={(e) => setH({ ...h, professor_nome: e.target.value })} 
                    placeholder="Nome do professor" 
                  />
                </div>

                <div>
                  <Label>Sala</Label>
                  <Input 
                    value={h.sala} 
                    onChange={(e) => setH({ ...h, sala: e.target.value })} 
                    placeholder="Ex: 05" 
                  />
                </div>

                <div className="md:col-span-3 flex justify-end mt-2">
                  <Button onClick={addHorario} className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Publicar Horário no Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Horários publicados ({horarios.length})</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {horarios.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum horário publicado.</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-2">Turma</th><th>Dia</th><th>Hora</th><th>Disciplina</th><th>Prof.</th><th>Sala</th><th /></tr></thead>
                    <tbody>
                      {horarios.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="py-2">{r.classe} — {r.turma_nome}</td>
                          <td>{r.dia_semana}</td>
                          <td>{r.hora_inicio}–{r.hora_fim}</td>
                          <td>{r.disciplina}</td>
                          <td>{r.professor_nome}</td>
                          <td>{r.sala}</td>
                          <td className="text-right"><Button size="sm" variant="ghost" onClick={() => del("horarios", r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA DE MATRIZ ESCOLAR */}
          <TabsContent value="matriz" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Nova entrada na matriz (Digitação Manual)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Classe</Label>
                  <Input 
                    value={m.classe} 
                    onChange={(e) => setM({ ...m, classe: e.target.value })} 
                    placeholder="Ex: 5ª classe" 
                  />
                </div>
                <div>
                  <Label>Disciplina</Label>
                  <Input 
                    value={m.disciplina} 
                    onChange={(e) => setM({ ...m, disciplina: e.target.value })} 
                    placeholder="Ex: Matemática" 
                  />
                </div>
                <div>
                  <Label>Carga Horária Semanal</Label>
                  <Input 
                    type="number" 
                    value={m.carga_horaria} 
                    onChange={(e) => setM({ ...m, carga_horaria: e.target.value })} 
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={addMatriz}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar à Matriz
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Matriz {ANO} ({matriz.length})</CardTitle></CardHeader>
              <CardContent>
                {matriz.length === 0 ? <p className="text-sm text-muted-foreground">Matriz ainda não definida.</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-2">Classe</th><th>Disciplina</th><th>Carga</th><th /></tr></thead>
                    <tbody>
                      {matriz.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="py-2">{r.classe}</td>
                          <td>{r.disciplina}</td>
                          <td>{r.carga_horaria}h</td>
                          <td className="text-right"><Button size="sm" variant="ghost" onClick={() => del("matriz_escolar", r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
};

export default AdminMatriz;