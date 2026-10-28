import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Landmark, Save } from "lucide-react";
import { adminNav } from "@/lib/nav";

const AdminBankSettings = () => {
  const [form, setForm] = useState({ id: "", banco: "", iban: "", titular: "", express: "", instrucoes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("bank_details").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setForm({
        id: data.id,
        banco: data.banco ?? "",
        iban: data.iban ?? "",
        titular: data.titular ?? "",
        express: data.express ?? "",
        instrucoes: data.instrucoes ?? "",
      });
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.id) throw new Error("Não foi possível localizar os dados bancários para actualizar.");
      const { error } = await supabase
        .from("bank_details")
        .update({
          banco: form.banco, iban: form.iban, titular: form.titular,
          express: form.express, instrucoes: form.instrucoes, updated_at: new Date().toISOString(),
        })
        .eq("id", form.id);
      if (error) throw error;
      toast.success("Dados bancários atualizados!");
    } catch (error: any) {
      console.error("[AdminBankSettings] falha ao guardar dados bancários:", error);
      toast.error(`Não foi possível actualizar os dados bancários: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Dados Bancários" navItems={adminNav}>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground flex items-center gap-2">
          <Landmark className="h-7 w-7 text-primary" /> Dados Bancários
        </h1>
        <p className="text-sm text-muted-foreground">
          Estes dados são exibidos a Alunos e Encarregados na secção Pagamentos.
        </p>

        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <Field label="Banco" value={form.banco} onChange={(v) => setForm({ ...form, banco: v })} />
          <Field label="Titular" value={form.titular} onChange={(v) => setForm({ ...form, titular: v })} />
          <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />
          <Field label="Express (telemóvel)" value={form.express} onChange={(v) => setForm({ ...form, express: v })} />
          <div className="space-y-2">
            <Label>Instruções</Label>
            <Textarea
              value={form.instrucoes}
              onChange={(e) => setForm({ ...form, instrucoes: e.target.value })}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </form>
      </div>
    </RoleLayout>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export default AdminBankSettings;
