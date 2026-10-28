import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { professorNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface HorarioRow {
  id: string;
  dia_semana: number; // 1: Segunda, etc.
  hora_inicio: string;
  hora_fim: string;
  sala: string | null;
  turmas?: { nome: string; classe: string } | null;
  disciplinas?: { nome: string } | null;
  // Campos de suporte caso seja inserido manualmente ou via admin texto
  turma_nome?: string;
  disciplina_nome?: string;
}

const dias = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

export default function ProfessorSchedule() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HorarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const today = now.getDay(); // 1 = Segunda, ..., 5 = Sexta

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await dbFrom("horarios")
          .select("id, dia_semana, hora_inicio, hora_fim, sala, turmas(nome, classe), disciplinas(nome)")
          .eq("professor_id", user.id)
          .order("dia_semana")
          .order("hora_inicio");

        if (error) {
          console.error("Erro ao carregar horários:", error.message);
        }
        setRows((data as any) ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const isCurrent = (r: HorarioRow) => {
    if (r.dia_semana !== today) return false;
    const t = now.toTimeString().slice(0, 5);
    return r.hora_inicio.slice(0, 5) <= t && t <= r.hora_fim.slice(0, 5);
  };

  // Função para descarregar/imprimir o Horário Semanal em PDF
  const descarregarHorarioPDF = () => {
    if (rows.length === 0) {
      toast.error("Não existem horários publicados para exportar.");
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
          <title>Horário Semanal do Professor</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; text-transform: uppercase; }
            p.sub { text-align: center; margin-top: 0; font-size: 14px; color: #666; margin-bottom: 30px; }
            .grid { display: flex; flex-direction: column; gap: 15px; }
            .dia-bloco { border: 1px solid #ccc; border-radius: 6px; padding: 10px 15px; }
            .dia-titulo { font-weight: bold; font-size: 15px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 8px; color: #111; }
            ul { margin: 0; padding-left: 20px; }
            li { margin-bottom: 6px; font-size: 13px; }
            .hora { font-family: monospace; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Colégio Herdeiros do Futuro</h2>
          <p class="sub">Horário Escolar Publicado — Painel do Professor</p>
          <div class="grid">
            ${[1, 2, 3, 4, 5]
              .map((d) => {
                const aulasDoDia = rows.filter((r) => r.dia_semana === d);
                return `
                <div class="dia-bloco">
                  <div class="dia-titulo">${dias[d - 1]}</div>
                  ${
                    aulasDoDia.length === 0
                      ? `<p style="font-size: 13px; color: #777; font-style: italic; margin: 5px 0;">Sem aulas atribuídas.</p>`
                      : `<ul>` +
                        aulasDoDia
                          .map(
                            (r) => `
                          <li>
                            <span class="hora">${r.hora_inicio.slice(0, 5)} – ${r.hora_fim.slice(0, 5)}</span> | 
                            <strong>Turma:</strong> ${r.turmas?.nome || r.turma_nome || "—"} (${r.turmas?.classe || ""}) | 
                            <strong>Disciplina:</strong> ${r.disciplinas?.nome || r.disciplina_nome || "—"} 
                            ${r.sala ? `| <em>Sala ${r.sala}</em>` : ""}
                          </li>
                        `
                          )
                          .join("") +
                        `</ul>`
                  }
                </div>
              `;
              })
              .join("")}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    janelaPrint.document.write(htmlConteudo);
    janelaPrint.document.close();
    toast.success("A preparar documento para descarregar em PDF...");
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Horário" navItems={professorNav}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-montserrat font-bold text-2xl lg:text-3xl">Horário Semanal</h1>
            <p className="text-sm text-muted-foreground">Consulte as aulas publicadas pela administração (Segunda a Sexta).</p>
          </div>
          {rows.length > 0 && (
            <Button variant="outline" onClick={descarregarHorarioPDF} className="self-start sm:self-auto gap-2">
              <Download className="h-4 w-4" /> Descarregar Horário (PDF)
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground text-center">A carregar horários publicados...</p>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Sem horário definido ou publicado.</p>
              <p className="text-xs text-muted-foreground">O administrador ainda não publicou aulas associadas ao seu perfil.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[750px]">
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="space-y-3 bg-secondary/20 p-3 rounded-lg border border-border/60">
                  <h3 className="font-semibold text-center text-sm pb-2 border-b border-border text-foreground">
                    {dias[d - 1]}
                  </h3>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => r.dia_semana === d)
                      .map((r) => {
                        const atual = isCurrent(r);
                        return (
                          <div
                            key={r.id}
                            className={`p-3 rounded-lg border text-xs transition-all shadow-xs ${
                              atual
                                ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                                : "bg-card border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-1 font-mono font-semibold opacity-90 mb-1">
                              <Clock className="h-3 w-3 inline" />
                              {r.hora_inicio.slice(0, 5)} – {r.hora_fim.slice(0, 5)}
                            </div>
                            <p className="font-bold text-sm mt-1">
                              {r.turmas?.nome ?? r.turma_nome ?? "Turma N/D"} 
                              {r.turmas?.classe ? ` (${r.turmas.classe})` : ""}
                            </p>
                            <p className="opacity-90">{r.disciplinas?.nome ?? r.disciplina_nome ?? "—"}</p>
                            {r.sala && (
                              <p className={`mt-1.5 pt-1 border-t ${atual ? "border-primary-foreground/30 text-primary-foreground/90" : "border-border/60 text-muted-foreground"}`}>
                                Sala: {r.sala}
                              </p>
                            )}
                            {atual && (
                              <span className="inline-block mt-2 bg-background/20 text-primary-foreground font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                Acontecendo Agora
                              </span>
                            )}
                          </div>
                        );
                      })}
                    {rows.filter((r) => r.dia_semana === d).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6 italic">— Sem aulas —</p>
                    )}
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