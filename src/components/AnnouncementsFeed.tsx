import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  created_at: string;
}

interface AnnouncementsFeedProps {
  role: string;
}

const AnnouncementsFeed = ({ role }: AnnouncementsFeedProps) => {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    const load = () =>
      supabase
        .from("announcements")
        .select("id, titulo, conteudo, target_audience, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) {
            const mapped = data.map((a: any) => ({ ...a, title: a.titulo, content: a.conteudo }));
            const filtered = mapped.filter(
              (a: any) => a.target_audience?.includes("todos") || a.target_audience?.includes(role)
            );
            setItems(filtered as Announcement[]);
          }
        });
    load();
    const ch = supabase
      .channel("announcements-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [role]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-accent" />
          Avisos e Comunicados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum comunicado recente.</p>
        ) : (
          <div className="space-y-4">
            {items.map((a) => (
              <div key={a.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-montserrat font-semibold text-sm text-foreground">{a.title}</h4>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString("pt-AO")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <div className="flex gap-1 mt-2">
                  {a.target_audience?.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsFeed;
