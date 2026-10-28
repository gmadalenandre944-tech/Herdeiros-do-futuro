import { useCallback, useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shirt, Plus, Trash2, CheckCircle, Pencil, X, Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { secretarioNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";

interface Uniforme {
  id: string;
  nome: string;
  processo: string;
  tamanho: number;
  tipo: "escolar" | "educacao_fisica";
  quantidade: number;
  valor: number;
  estado: "Pendente" | "Entregue";
  data: string;
  origem_local_id?: string | null;
}

type UniformeForm = {
  nome: string;
  processo: string;
  tamanho: string;
  tipo: "escolar" | "educacao_fisica";
  quantidade: string;
  valor: string;
};

const KEY = "hf_uniformes";
const fmtKz = (n: number) => `${n.toLocaleString("pt-AO")} Kz`;
const emptyForm: UniformeForm = { nome: "", processo: "", tamanho: "", tipo: "escolar", quantidade: "1", valor: "" };

const normalizeUniforme = (row: any): Uniforme => ({
  id: String(row?.id ?? ""),
  nome: String(row?.nome ?? ""),
  processo: String(row?.processo ?? ""),
  tamanho: Number(row?.tamanho ?? 0),
  tipo: row?.tipo === "educacao_fisica" ? "educacao_fisica" : "escolar",
  quantidade: Number(row?.quantidade ?? 1),
  valor: Number(row?.valor ?? 0),
  estado: row?.estado === "Entregue" ? "Entregue" : "Pendente",
  data: String(row?.data ?? "").slice(0, 10),
  origem_local_id: row?.origem_local_id == null ? null : String(row.origem_local_id),
});

/** Gera o comprovativo de compra de uniforme em PDF. */
export function gerarComprovativoUniforme(u: Uniforme) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const total = u.valor * u.quantidade;
  const numero = `UNI-${(u.id || Date.now().toString()).slice(0, 8).toUpperCase()}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COLÉGIO HERDEIROS DO FUTURO", w / 2, 40, { align: "center" });
  doc.setFontSize(11);
  doc.text("COMPROVATIVO DE COMPRA DE UNIFORME", w / 2, 60, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const linhas: [string, string][] = [
    ["Nº do comprovativo", numero],
    ["Data", u.data || new Date().toISOString().slice(0, 10)],
    ["Aluno", u.nome],
    ["Nº de processo", u.processo],
    ["Tipo", u.tipo === "educacao_fisica" ? "Educação Física" : "Escolar"],
    ["Tamanho", String(u.tamanho)],
    ["Quantidade", String(u.quantidade)],
    ["Valor unitário", fmtKz(u.valor)],
    ["Total pago", fmtKz(total)],
    ["Estado", u.estado],
  ];
  let y = 95;
  linhas.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, 160, y);
    y += 20;
  });
  y += 30;
  doc.line(40, y, w / 2 - 10, y);
  doc.line(w / 2 + 10, y, w - 40, y);
  doc.setFontSize(9);
  doc.text("Secretaria", (40 + w / 2 - 10) / 2, y + 12, { align: "center" });
  doc.text("Encarregado", (w / 2 + 10 + w - 40) / 2, y + 12, { align: "center" });
  doc.save(`comprovativo-uniforme-${u.nome.replace(/\s+/g, "-")}.pdf`);
}

const sortUniformes = (items: Uniforme[]) =>
  [...items].sort((a, b) => b.data.localeCompare(a.data) || a.nome.localeCompare(b.nome));

const migrationError = (error: any) => {
  const details = [error?.code, error?.message, error?.details].filter(Boolean).join(" ").toLowerCase();
  if (details.includes("uniformes_entregas") || details.includes("origem_local_id")) {
    return "Aplique primeiro a migração supabase/migrations/20261008_sync_school_records.sql no Supabase.";
  }
  return error?.message ?? "Verifique as permissões e a ligação ao Supabase.";
};

const SecretarioUniformes = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Uniforme[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await dbFrom("uniformes_entregas")
        .select("*")
        .order("data", { ascending: false })
        .limit(5000);
      if (error) throw error;
      let remoteItems = sortUniformes(((data as any[]) ?? []).map(normalizeUniforme));
      setItems(remoteItems);

      // Import once by source ID. The browser copy is deliberately retained as a backup.
      const raw = localStorage.getItem(KEY);
      if (raw) {
        let legacy: any[] = [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) legacy = parsed;
        } catch (parseError) {
          console.error("[SecretarioUniformes] os dados locais não têm um formato válido:", parseError);
        }
        const candidates = legacy.filter((row) =>
          row && row.id != null && String(row.nome ?? "").trim() &&
          String(row.processo ?? "").trim() &&
          Number.isInteger(Number(row.tamanho)) && Number(row.tamanho) > 0 &&
          Number.isInteger(Number(row.quantidade)) && Number(row.quantidade) > 0 &&
          Number.isFinite(Number(row.valor)) && Number(row.valor) >= 0,
        );
        const sourceIds = [...new Set(candidates.map((row) => String(row.id)))];
        if (sourceIds.length) {
          const { data: existing, error: existingError } = await dbFrom("uniformes_entregas")
            .select("origem_local_id")
            .in("origem_local_id", sourceIds);
          if (existingError) throw existingError;
          const importedIds = new Set(((existing as any[]) ?? []).map((row) => String(row.origem_local_id)));
          const missing = candidates.filter((row) => !importedIds.has(String(row.id)));
          if (missing.length) {
            const payload = missing.map((row) => ({
              nome: String(row.nome).trim(),
              processo: String(row.processo).trim(),
              tamanho: Number(row.tamanho),
              tipo: row.tipo === "educacao_fisica" ? "educacao_fisica" : "escolar",
              quantidade: Number(row.quantidade),
              valor: Number(row.valor),
              estado: row.estado === "Entregue" ? "Entregue" : "Pendente",
              data: /^\d{4}-\d{2}-\d{2}$/.test(String(row.data ?? ""))
                ? String(row.data)
                : new Date().toISOString().slice(0, 10),
              origem_local_id: String(row.id),
              criado_por: user?.id ?? null,
            }));
            const { error: importError } = await dbFrom("uniformes_entregas").insert(payload);
            if (importError) throw importError;
            const { data: verified, error: verifyError } = await dbFrom("uniformes_entregas")
              .select("origem_local_id")
              .in("origem_local_id", missing.map((row) => String(row.id)));
            if (verifyError) throw verifyError;
            const verifiedIds = new Set(((verified as any[]) ?? []).map((row) => String(row.origem_local_id)));
            if (missing.some((row) => !verifiedIds.has(String(row.id)))) {
              throw new Error("O Supabase não confirmou todos os registos locais; a cópia no navegador foi mantida.");
            }
            const { data: refreshed, error: refreshError } = await dbFrom("uniformes_entregas")
              .select("*")
              .order("data", { ascending: false })
              .limit(5000);
            if (refreshError) throw refreshError;
            remoteItems = sortUniformes(((refreshed as any[]) ?? []).map(normalizeUniforme));
            setItems(remoteItems);
            toast.success(`${missing.length} registo(s) local(is) copiado(s) para o Supabase. A cópia do navegador foi mantida.`);
          }
        }
      }
    } catch (error: any) {
      console.error("[SecretarioUniformes] falha ao sincronizar registos:", error);
      toast.error(`Não foi possível sincronizar os uniformes: ${migrationError(error)}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const save = async () => {
    const tamanho = Number(form.tamanho);
    const quantidade = Number(form.quantidade);
    const valor = Number(form.valor);
    if (!form.nome.trim() || !form.processo.trim()) return toast.error("Preencha o nome do aluno e o número de processo.");
    if (!Number.isInteger(tamanho) || tamanho <= 0) return toast.error("Indique o tamanho numérico do uniforme.");
    if (!Number.isInteger(quantidade) || quantidade <= 0) return toast.error("A quantidade deve ser um número inteiro positivo.");
    if (!Number.isFinite(valor) || valor < 0) return toast.error("Indique um valor válido, igual ou superior a zero.");

    const current = items.find((item) => item.id === editingId);
    const payload = {
      nome: form.nome.trim(),
      processo: form.processo.trim(),
      tamanho,
      tipo: form.tipo,
      quantidade,
      valor,
      estado: current?.estado ?? "Pendente",
      data: current?.data ?? new Date().toISOString().slice(0, 10),
      origem_local_id: current?.origem_local_id ?? null,
      criado_por: user?.id ?? null,
    };
    setSaving(true);
    try {
      const result = editingId
        ? await dbFrom("uniformes_entregas").update(payload).eq("id", editingId).select("*").single()
        : await dbFrom("uniformes_entregas").insert(payload).select("*").single();
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error("O Supabase não confirmou o registo.");
      const saved = normalizeUniforme(result.data);
      setItems((currentItems) => sortUniformes(
        editingId
          ? currentItems.map((item) => item.id === editingId ? saved : item)
          : [saved, ...currentItems],
      ));
      toast.success(editingId ? "Registo actualizado no Supabase." : "Compra registada. Comprovativo gerado.");
      if (!editingId) gerarComprovativoUniforme(saved);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error: any) {
      console.error("[SecretarioUniformes] falha ao guardar:", error);
      toast.error(`Não foi possível guardar o uniforme: ${migrationError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: Uniforme) => {
    const estado = item.estado === "Entregue" ? "Pendente" : "Entregue";
    setSaving(true);
    try {
      const { data, error } = await dbFrom("uniformes_entregas")
        .update({ estado })
        .eq("id", item.id)
        .select("*")
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("O Supabase não confirmou a alteração de estado.");
      const updated = normalizeUniforme(data);
      setItems((current) => current.map((row) => row.id === item.id ? updated : row));
      toast.success(`Estado actualizado: ${estado}.`);
    } catch (error: any) {
      toast.error(`Não foi possível actualizar o estado: ${migrationError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: Uniforme) => {
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      processo: item.processo,
      tamanho: String(item.tamanho),
      tipo: item.tipo,
      quantidade: String(item.quantidade),
      valor: String(item.valor),
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Tem a certeza de que pretende eliminar este registo de uniforme?")) return;
    setSaving(true);
    try {
      const { data, error } = await dbFrom("uniformes_entregas").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("O registo não foi encontrado ou não tem permissão para o eliminar.");
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      toast.success("Registo eliminado do Supabase.");
    } catch (error: any) {
      toast.error(`Não foi possível eliminar o registo: ${migrationError(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const totalKz = items.reduce((sum, item) => sum + item.valor * item.quantidade, 0);
  const pendentes = items.filter((item) => item.estado === "Pendente").length;

  return (
    <RoleLayout title="Secretaria" subtitle="Uniformes" headerLabel="Controlo de Uniformes" navItems={secretarioNav}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shirt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Uniformes</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "A carregar do Supabase…" : `Sincronizado com o Supabase • ${items.length} registos • ${fmtKz(totalKz)} • ${pendentes} pendente(s)`}
            </p>
          </div>
          <Button type="button" variant="outline" className="ml-auto" onClick={() => void loadData()} disabled={loading || saving}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="sm:col-span-2"><Label htmlFor="uniform-student-name">Nome do Aluno *</Label><Input id="uniform-student-name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label htmlFor="uniform-process">Nº Processo *</Label><Input id="uniform-process" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} /></div>
          <div><Label htmlFor="uniform-size">Tamanho numérico *</Label><Input id="uniform-size" type="number" min="1" step="1" value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} placeholder="Ex.: 34" /></div>
          <div><Label>Tipo de uniforme *</Label>
            <Select value={form.tipo} onValueChange={(value) => setForm({ ...form, tipo: value as typeof form.tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="escolar">Uniforme escolar</SelectItem><SelectItem value="educacao_fisica">Educação física</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="uniform-quantity">Quantidade *</Label><Input id="uniform-quantity" type="number" min="1" step="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
          <div><Label htmlFor="uniform-value">Valor unitário (Kz) *</Label><Input id="uniform-value" type="number" min="0" step="1" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-6">
            <Button type="button" onClick={() => void save()} disabled={loading || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? "Guardar alterações" : "Registar uniforme"}
            </Button>
            {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}><X className="h-4 w-4 mr-1" />Cancelar edição</Button>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary">
              <th className="text-left px-3 py-3">Aluno</th>
              <th className="text-left px-3 py-3">Processo</th>
              <th className="text-center px-3 py-3">Tamanho</th>
              <th className="text-center px-3 py-3">Tipo</th>
              <th className="text-center px-3 py-3">Qtd</th>
              <th className="text-right px-3 py-3">Total</th>
              <th className="text-center px-3 py-3">Estado</th>
              <th className="px-3 py-3"></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">A carregar registos…</td></tr>
              : items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum uniforme registado.</td></tr>
              : items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-3 py-2 font-medium">{item.nome}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.processo}</td>
                  <td className="px-3 py-2 text-center"><Badge variant="outline">{item.tamanho}</Badge></td>
                  <td className="px-3 py-2 text-center">{item.tipo === "educacao_fisica" ? "Educação física" : "Escolar"}</td>
                  <td className="px-3 py-2 text-center">{item.quantidade}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtKz(item.valor * item.quantidade)}</td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => void toggle(item)} disabled={saving} aria-label={`Alterar estado do uniforme de ${item.nome}`}>
                      {item.estado === "Entregue"
                        ? <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>
                        : <Badge variant="secondary">Pendente</Badge>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => gerarComprovativoUniforme(item)} aria-label={`Comprovativo de ${item.nome}`} title="Baixar comprovativo"><FileDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => edit(item)} disabled={saving} aria-label={`Editar uniforme de ${item.nome}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => void remove(item.id)} disabled={saving} aria-label={`Eliminar uniforme de ${item.nome}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
};

export default SecretarioUniformes;
