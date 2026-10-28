import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, RefreshCw } from "lucide-react";
import { professorNav } from "@/lib/nav";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  created_at: string;
}

const audienceLabels: Record<string, string> = {
  todos: "Todos",
  professor: "Professores",
  aluno: "Alunos",
  encarregado: "Encarregados",
  secretario: "Secretaria",
};

export default function ProfessorAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await dbFrom("announcements")
        .select("id, titulo, conteudo, target_audience, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (queryError) {
        setError("Não foi possível carregar os comunicados. Tente novamente.");
        setItems([]);
      } else {
        setError("");
        setItems(
          ((data as any[]) ?? []).map((item) => ({
            id: item.id,
            title: item.titulo,
            content: item.conteudo,
            target_audience: item.target_audience ?? [],
            created_at: item.created_at,
          })),
        );
      }
      setLoading(false);
    };

    load();
    const channel = supabase
      .channel("professor-announcements-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RoleLayout
      title="Professor"
      subtitle="Herdeiros do Futuro"
      headerLabel="Comunicados"
      navItems={professorNav}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Informação escolar</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">Comunicados</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Consulte todos os comunicados publicados pela Administração.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualização automática
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              Publicações da Administração
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">A carregar comunicados...</p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <Megaphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Ainda não existem comunicados publicados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-semibold text-foreground">{item.title}</h2>
                      <time className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("pt-AO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.content}</p>
                    {item.target_audience.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.target_audience.map((audience) => (
                          <Badge key={audience} variant="secondary" className="rounded-full text-[10px]">
                            {audienceLabels[audience] ?? audience}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}