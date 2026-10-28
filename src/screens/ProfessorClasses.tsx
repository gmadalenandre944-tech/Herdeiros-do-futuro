import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { professorNav } from "@/lib/nav";
import { Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchBaseEscolar, fetchMatriculas } from "@/lib/schoolData";

interface TurmaInfo {
  id: string;
  nome: string;
  classe: string;
  totalAlunos: number;
  alunosLiberados: number;
  disciplinas: string[];
}

const ProfessorClasses = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const ano = new Date().getFullYear();
        const [{ data: pd, error: assignmentsError }, base, matriculas] = await Promise.all([
          dbFrom("professor_disciplinas").select("turma_id, disciplina_id").eq("professor_id", user.id),
          fetchBaseEscolar(),
          fetchMatriculas(),
        ]);
        if (assignmentsError) throw assignmentsError;
        const list = ((pd as any[]) ?? []);
        const turmaIds = [...new Set<string>(list.map((x) => String(x.turma_id ?? "")).filter(Boolean))];
        const turmasAtribuidas = base.turmas.filter((turma) => turmaIds.includes(turma.id));
        const ds = base.disciplinas;
        if (!turmaIds.length) {
          setTurmas([]);
          return;
        }

        const enriched: TurmaInfo[] = await Promise.all(turmasAtribuidas.map(async (turma) => {
          const ids = matriculas
            .filter((aluno) =>
              aluno.turma_id === turma.id &&
              (!aluno.ano_lectivo || aluno.ano_lectivo.replace(/[-–—]/g, "/").startsWith(String(ano))),
            )
            .map((aluno) => Number(aluno.id));
          let liberados = 0;
          if (ids.length) {
            const { data: payments, error: paymentsError } = await dbFrom("pagamentos_propinas")
              .select("matricula_id, estado")
              .eq("tipo", "confirmacao")
              .eq("ano_referencia", ano)
              .in("matricula_id", ids);
            if (paymentsError) throw paymentsError;
            liberados = new Set(((payments as any[]) ?? [])
              .filter((payment) => ["pago", "paid", "confirmado", "liquidado"]
                .includes(String(payment?.estado ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()))
              .map((payment) => String(payment.matricula_id))).size;
          }
          const turmaDiscs = list.filter((assignment) => assignment.turma_id === turma.id)
            .map((assignment) => ds.find((discipline) => discipline.id === assignment.disciplina_id)?.nome)
            .filter(Boolean) as string[];
          return {
            id: turma.id,
            nome: turma.nome,
            classe: String(turma.classe ?? ""),
            totalAlunos: ids.length,
            alunosLiberados: liberados,
            disciplinas: turmaDiscs,
          };
        }));
        setTurmas(enriched);
      } catch (error: any) {
        console.error("[ProfessorClasses] falha ao carregar turmas:", error);
        toast.error(`Não foi possível carregar as turmas: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Turmas" navItems={professorNav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Minhas Turmas</h1>
          <p className="text-sm text-muted-foreground">Apenas alunos com <strong>Confirmação paga</strong> são contados como elegíveis para lançamento de notas.</p>
        </div>
        {loading ? <p className="text-muted-foreground text-sm">Carregando...</p>
        : turmas.length === 0 ? <div className="bg-card border border-border rounded-xl p-6"><p className="text-muted-foreground text-sm">Nenhuma turma atribuída. Contacte o administrador.</p></div>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmas.map((t) => {
              const bloqueados = t.totalAlunos - t.alunosLiberados;
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {t.nome}
                      <Badge variant="secondary">{t.classe}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-primary" /> <strong>{t.alunosLiberados}</strong> elegíveis / {t.totalAlunos} total</div>
                    {bloqueados > 0 && <div className="flex items-center gap-2 text-xs text-destructive"><Lock className="h-3 w-3" /> {bloqueados} sem Confirmação</div>}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Disciplinas:</p>
                      <div className="flex flex-wrap gap-1">
                        {t.disciplinas.map((d) => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleLayout>
  );
};

export default ProfessorClasses;
