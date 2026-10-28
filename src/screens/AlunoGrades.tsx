import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { alunoNav } from "@/lib/nav";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp } from "lucide-react";
import { resolveAlunoDoUtilizador, fetchMediasPorDisciplina } from "@/lib/schoolData";
import { toast } from "sonner";

const AlunoDesempenho = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<{ disciplina: string; media: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const { aluno } = await resolveAlunoDoUtilizador(user.id, "aluno");
        if (!active) return;
        if (!aluno) { setLoading(false); return; }
        setNome(aluno.nome);
        const medias = await fetchMediasPorDisciplina(aluno.id);
        if (active) setLinhas(medias);
      } catch (error: any) {
        if (active) toast.error(`Não foi possível carregar as notas do Supabase: ${error?.message ?? "erro desconhecido"}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const melhores = linhas.slice(0, 5);

  return (
    <RoleLayout title="Aluno" subtitle="Herdeiros do Futuro" headerLabel="Meu Desempenho" navItems={alunoNav}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-poppins font-bold text-2xl">Meu Desempenho</h1>
            <p className="text-sm text-muted-foreground">
              {nome ? `${nome} — ` : ""}disciplinas em que está a ter melhores resultados.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Melhores disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">A carregar...</p>
            ) : melhores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há resultados disponíveis.</p>
            ) : melhores.map((l, i) => (
              <div key={l.disciplina} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant={i === 0 ? "default" : "secondary"}>{i + 1}º</Badge>
                  <span className="text-sm flex-1">{l.disciplina}</span>
                  <span className="text-sm font-semibold">{l.media.toFixed(1)}</span>
                </div>
                <Progress value={(l.media / 20) * 100} className="h-2" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              As classificações detalhadas por avaliação são geridas pelo professor e pela secretaria.
            </p>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default AlunoDesempenho;
