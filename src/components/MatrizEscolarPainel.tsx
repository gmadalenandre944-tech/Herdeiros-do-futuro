import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Printer, FileDown } from "lucide-react";
import { downloadTablesPdf } from "@/lib/pdfTables";
import { compararPorClasse } from "@/lib/schoolData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/** Matriz escolar / da prova — mesma tabela usada no painel do administrador. */
export default function MatrizEscolarPainel() {
  const [linhas, setLinhas] = useState<any[]>([]);
  const { user } = useAuth();
  const baixar = () => {
    if (!linhas.length) return toast.error("A matriz ainda está vazia.");
    downloadTablesPdf("matriz-escolar", "MATRIZ ESCOLAR", [{
      title: `Total: ${linhas.length} disciplina(s)`,
      head: ["Classe", "Disciplina", "Carga Horária Semanal"],
      body: linhas.map((r) => [r.classe, r.disciplina, `${r.carga_horaria}h`]),
    }]);
  };
  const [m, setM] = useState({ classe: "", disciplina: "", carga_horaria: "2" });

  const load = async () => {
    const { data, error } = await db("matriz_escolar").select("*").order("classe");
    if (error) return toast.error(`Não foi possível carregar a matriz: ${error.message}`);
    setLinhas([...(data ?? [])].sort((a: any, b: any) => compararPorClasse(a, b) || String(a.disciplina).localeCompare(String(b.disciplina), "pt")));
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!m.classe.trim() || !m.disciplina.trim()) return toast.error("Indique a classe e a disciplina.");
    const { error } = await db("matriz_escolar").insert({
      classe: m.classe.trim(), disciplina: m.disciplina.trim(), carga_horaria: Number(m.carga_horaria) || 0, publicada: true, professor_id: user?.id ?? null,
    });
    if (error) return toast.error(`Não foi possível guardar: ${error.message}`);
    toast.success("Guardado na matriz.");
    setM({ classe: "", disciplina: "", carga_horaria: "2" });
    await load();
  };

  const del = async (id: string) => {
    if (!window.confirm("Eliminar esta linha da matriz?")) return;
    const { error } = await db("matriz_escolar").delete().eq("id", id);
    if (error) return toast.error(`Não foi possível eliminar: ${error.message}`);
    await load();
  };

  return (
    <div className="space-y-4">
      <style>{`@media print { body * { visibility: hidden !important; } .matriz-print, .matriz-print * { visibility: visible !important; } .matriz-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; background: white; } }`}</style>
      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">Nova entrada na Matriz da Prova</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div><Label>Classe</Label><Input value={m.classe} onChange={(e) => setM({ ...m, classe: e.target.value })} placeholder="Ex: 5ª Classe" /></div>
          <div><Label>Disciplina</Label><Input value={m.disciplina} onChange={(e) => setM({ ...m, disciplina: e.target.value })} placeholder="Ex: Matemática" /></div>
          <div><Label>Carga Horária Semanal</Label><Input type="number" value={m.carga_horaria} onChange={(e) => setM({ ...m, carga_horaria: e.target.value })} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={add}><Plus className="mr-2 h-4 w-4" />Adicionar à Matriz</Button></div>
        </CardContent>
      </Card>
      <Card id="printable-area" className="matriz-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Matriz da Prova ({linhas.length})</CardTitle>
          <div className="flex gap-2 print:hidden"><Button size="sm" variant="outline" onClick={baixar}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button><Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button></div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {linhas.length === 0 ? <p className="text-sm text-muted-foreground">Matriz ainda não definida.</p> : (
            <table className="print-grid w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary text-left"><th className="p-2">Classe</th><th className="p-2">Disciplina</th><th className="p-2">Carga</th><th className="p-2 print:hidden" /></tr></thead>
              <tbody>
                {linhas.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="p-2">{r.classe}</td><td className="p-2">{r.disciplina}</td><td className="p-2">{r.carga_horaria}h</td>
                    <td className="p-2 text-right print:hidden"><Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
