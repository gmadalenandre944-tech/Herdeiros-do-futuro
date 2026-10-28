import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { alunoNav, encarregadoNav } from "@/lib/nav";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { resolveAlunoDoUtilizador, fetchRankingTurma } from "@/lib/schoolData";
import { toast } from "sonner";

const AlunoRanking = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [linhas, setLinhas] = useState<{ id: string; nome: string; media: number }[]>([]);
  const [turmaNome, setTurmaNome] = useState("");
  const [meuId, setMeuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { aluno, alunos } = await resolveAlunoDoUtilizador(user.id, role);
        if (!active) return;
        if (!aluno) { setLoading(false); return; }
        setMeuId(aluno.id);
        setTurmaNome(aluno.raw?.turma_nome ?? aluno.raw?.turma ?? aluno.classe ?? "");

        const colegas = alunos.filter((a) =>
          aluno.turma_id ? a.turma_id === aluno.turma_id : a.classe === aluno.classe
        );
        const ranking = await fetchRankingTurma(colegas.map((a) => ({ id: a.id, nome: a.nome })));
        if (active) setLinhas(ranking);
      } catch (error: any) {
        if (active) toast.error(`Não foi possível carregar o ranking do Supabase: ${error?.message ?? "erro desconhecido"}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, role]);

  const minhaPos = useMemo(() => linhas.findIndex((l) => l.id === meuId) + 1, [linhas, meuId]);
  const nav = role === "encarregado" ? encarregadoNav : alunoNav;

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Ranking da Turma" navItems={nav}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-poppins font-bold text-2xl">Ranking da Turma</h1>
            <p className="text-sm text-muted-foreground">{turmaNome ? `Turma ${turmaNome}` : "Classificação por média anual"}</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">
            {minhaPos > 0 ? `A sua posição: ${minhaPos}º de ${linhas.length}` : "Classificação"}
          </CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">A carregar...</p>
              : linhas.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há notas lançadas para gerar o ranking.</p>
              : (
                <div className="space-y-1">
                  {linhas.map((l, i) => (
                    <div key={l.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${l.id === meuId ? "bg-primary/10 border border-primary/30" : "border border-border"}`}>
                      <Badge variant={i < 3 ? "default" : "secondary"}>{i + 1}º</Badge>
                      <span className="text-sm flex-1">{l.nome}</span>
                      <span className="font-semibold text-sm">{l.media.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default AlunoRanking;
