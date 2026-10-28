import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { alunoNav, encarregadoNav, professorNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import { CalendarDays } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const AlunoHorarios = () => {
  const { role } = useUserRole();
  const [horarios, setHorarios] = useState<any[]>([]);
  const [matriz, setMatriz] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [h, m] = await Promise.all([
        dbFrom("horarios").select("*").eq("publicado", true),
        dbFrom("matriz_escolar").select("*").eq("publicada", true),
      ]);
      setHorarios((h as any)?.data ?? []);
      setMatriz((m as any)?.data ?? []);
    })();
  }, []);

  const nav = role === "encarregado" ? encarregadoNav : role === "professor" ? professorNav : alunoNav;

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Comunicados / Horários" navItems={nav}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="font-montserrat font-bold text-2xl">Comunicados e Horários</h1>
        </div>

        <AnnouncementsFeed role={(role ?? "aluno") as any} />

        <Card>
          <CardHeader><CardTitle className="text-base">Horário das Aulas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {horarios.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há horários publicados pela Direcção.</p> : (
              DIAS.filter((d) => horarios.some((h) => h.dia_semana === d)).map((d) => (
                <div key={d}>
                  <p className="font-semibold text-sm mb-2">{d}</p>
                  <div className="space-y-1">
                    {horarios.filter((h) => h.dia_semana === d)
                      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                      .map((h) => (
                        <div key={h.id} className="flex flex-wrap items-center gap-2 text-sm border border-border rounded-lg px-3 py-2">
                          <Badge variant="secondary">{h.hora_inicio}–{h.hora_fim}</Badge>
                          <span className="font-medium">{h.disciplina}</span>
                          <span className="text-muted-foreground">{h.classe} · {h.turma_nome}</span>
                          {h.sala && <span className="text-muted-foreground">Sala {h.sala}</span>}
                          {h.professor_nome && <span className="text-muted-foreground ml-auto">{h.professor_nome}</span>}
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Matriz Escolar</CardTitle></CardHeader>
          <CardContent>
            {matriz.length === 0 ? <p className="text-sm text-muted-foreground">Matriz ainda não publicada.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2">Classe</th><th>Disciplina</th><th className="text-right">Carga semanal</th></tr></thead>
                <tbody>
                  {matriz.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2">{r.classe}</td><td>{r.disciplina}</td><td className="text-right">{r.carga_horaria}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default AlunoHorarios;
