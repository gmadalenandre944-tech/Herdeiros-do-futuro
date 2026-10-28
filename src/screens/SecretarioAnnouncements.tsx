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
import { Plus, Trash2 } from "lucide-react";
import { LayoutDashboard, UserCheck, DollarSign, Megaphone, ClipboardList } from "lucide-react";

const secretarioNav = [
  { label: "Dashboard", path: "/secretario", icon: LayoutDashboard },
  { label: "Validação de Matrículas", path: "/secretario/enrollment", icon: UserCheck },
  { label: "Pagamentos/Tesouraria", path: "/secretario/payments", icon: DollarSign },
  { label: "Emissão de Listagens", path: "/secretario/lists", icon: ClipboardList },
  { label: "Comunicados", path: "/secretario/announcements", icon: Megaphone },
];

const audiences = [
  { id: "todos", label: "Todos" },
  { id: "professor", label: "Professores" },
  { id: "aluno", label: "Alunos" },
  { id: "encarregado", label: "Encarregados" },
];

interface Announcement { id: string; title: string; content: string; target_audience: string[]; created_at: string; }

const SecretarioAnnouncements = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targets, setTargets] = useState<string[]>(["todos"]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const { data } = await dbFrom("announcements")
      .select("id, titulo, conteudo, target_audience, created_at")
      .order("created_at", { ascending: false });
    if (data) setItems(data.map((a: any) => ({ ...a, title: a.titulo, content: a.conteudo })) as Announcement[]);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleTarget = (t: string) => setTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await dbFrom("announcements").insert({ titulo: title, conteudo: content, target_audience: targets, author_id: user.id });
      if (error) throw error;
      toast.success("Comunicado publicado!");
      setTitle(""); setContent(""); setTargets(["todos"]);
      await fetchAll();
    } catch (error: any) {
      console.error("[SecretarioAnnouncements] falha ao publicar comunicado:", error);
      toast.error(`Não foi possível publicar o comunicado: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Comunicado removido.");
      await fetchAll();
    } catch (error: any) {
      console.error("[SecretarioAnnouncements] falha ao remover comunicado:", error);
      toast.error(`Não foi possível remover o comunicado: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Comunicados" navItems={secretarioNav}>
      <div className="space-y-6">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Comunicados</h1>
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Conteúdo</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={4} /></div>
            <div className="space-y-2">
              <Label>Público-Alvo</Label>
              <div className="flex flex-wrap gap-3">
                {audiences.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={targets.includes(a.id)} onCheckedChange={() => toggleTarget(a.id)} />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={saving}><Plus className="h-4 w-4 mr-2" />{saving ? "Publicando..." : "Publicar"}</Button>
          </form>
        </div>
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-montserrat font-semibold text-foreground">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <div className="flex gap-1 mt-2">{a.target_audience?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </RoleLayout>
  );
};

export default SecretarioAnnouncements;
