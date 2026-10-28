import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { adminNav } from "@/lib/nav";

interface Settings {
  id?: string;
  nome_instituicao: string;
  ano_lectivo: string;
}

const AdminSettings = () => {
  const [s, setS] = useState<Settings>({ nome_instituicao: "", ano_lectivo: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await dbFrom("system_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) toast.error("Erro ao carregar: " + error.message);
    if (data) setS(data as Settings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        nome_instituicao: s.nome_instituicao,
        ano_lectivo: s.ano_lectivo,
      };
      const q = dbFrom("system_settings");
      const { error } = s.id
        ? await q.update(payload).eq("id", s.id)
        : await q.insert(payload);
      if (error) throw error;
      toast.success("Configurações guardadas!");
      await load();
    } catch (error: any) {
      console.error("[AdminSettings] falha ao guardar configurações:", error);
      toast.error(`Não foi possível guardar as configurações: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `logo-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("system").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      toast.warning("Logo carregado no armazenamento, mas o endereço não foi guardado nas configurações porque a coluna logo_url não está disponível.");
    } catch (error: any) {
      console.error("[AdminSettings] falha ao carregar logo:", error);
      toast.error(`Não foi possível carregar o logo: ${error?.message ?? "verifique o armazenamento do Supabase."}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Configurações do Sistema" navItems={adminNav}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Configurações do Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">Identidade visual e dados gerais da instituição</p>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">A carregar...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="space-y-2">
              <Label>Nome da Escola</Label>
              <Input value={s.nome_instituicao ?? ""} onChange={(e) => setS({ ...s, nome_instituicao: e.target.value })} placeholder="Ex: Herdeiros do Futuro" />
            </div>
            <div className="space-y-2">
              <Label>Ano Lectivo</Label>
              <Input value={s.ano_lectivo ?? ""} onChange={(e) => setS({ ...s, ano_lectivo: e.target.value })} placeholder="Ex: 2025/2026" />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-sm">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Carregar logo
                  </span>
                </label>
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "A guardar..." : "Guardar Configurações"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </RoleLayout>
  );
};

export default AdminSettings;
