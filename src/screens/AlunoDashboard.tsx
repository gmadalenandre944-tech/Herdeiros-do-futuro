import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";
import { alunoNav } from "@/lib/nav";
import { Trophy, Award } from "lucide-react";
import { resolveAlunoDoUtilizador, fetchMediasPorDisciplina, fetchRankingTurma } from "@/lib/schoolData";
import { toast } from "sonner";

const AlunoDashboard = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [melhores, setMelhores] = useState<{ disciplina: string; media: number }[]>([]);
  const [posicao, setPosicao] = useState<{ pos: number; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const { data: prof, error: profileError } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!active) return;
        if (prof?.nome) setNome(prof.nome);

        const { aluno, alunos } = await resolveAlunoDoUtilizador(user.id, "aluno");
        if (!active || !aluno) return;
        if (!prof?.nome) setNome(aluno.nome);

        const colegas = alunos.filter((a) =>
          aluno.turma_id ? a.turma_id === aluno.turma_id : a.classe === aluno.classe
        );
        const [medias, rank] = await Promise.all([
          fetchMediasPorDisciplina(aluno.id),
          fetchRankingTurma(colegas.map((a) => ({ id: a.id, nome: a.nome }))),
        ]);
        if (!active) return;
        setMelhores(medias);
        const pos = rank.findIndex((r) => r.id === aluno.id);
        if (pos >= 0) setPosicao({ pos: pos + 1, total: rank.length });
      } catch (error: any) {
        if (active) toast.error(`Não foi possível carregar o desempenho do Supabase: ${error?.message ?? "erro desconhecido"}`);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const mediaGeral = melhores.length
    ? melhores.reduce((s, m) => s + m.media, 0) / melhores.length
    : null;

  return (
    <RoleLayout title="Aluno" subtitle="Herdeiros do Futuro" headerLabel="Painel do Aluno" navItems={alunoNav}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Área do aluno</p>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-foreground">Olá, {nome || "Aluno"}.</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o seu desempenho escolar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Média Geral</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-primary">{mediaGeral !== null ? mediaGeral.toFixed(2) : "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" />Posição na Turma</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{posicao ? `${posicao.pos}º / ${posicao.total}` : "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Disciplinas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{melhores.length}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Disciplinas com melhor desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {melhores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há resultados disponíveis.</p>
            ) : melhores.slice(0, 5).map((m, i) => (
              <div key={m.disciplina} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant={i === 0 ? "default" : "secondary"}>{i + 1}º</Badge>
                  <span className="text-sm flex-1">{m.disciplina}</span>
                  <span className="text-sm font-semibold">{m.media.toFixed(1)}</span>
                </div>
                <Progress value={(m.media / 20) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <AnnouncementsFeed role="aluno" />
      </div>
    </RoleLayout>
  );
};

export default AlunoDashboard;
