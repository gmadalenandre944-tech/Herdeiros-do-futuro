import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { encarregadoNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Link2, Search, Trash2 } from "lucide-react";
import { fetchAlunosResult, type AlunoRow } from "@/lib/alunosApi";
import { fetchAllStudentRecords } from "@/lib/schoolData";
import { isUuid } from "@/lib/uuid";

const EncarregadoVinculo = () => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [busca, setBusca] = useState("");
  const [parentesco, setParentesco] = useState("Encarregado(a) de Educação");
  const [vinculos, setVinculos] = useState<any[]>([]);

  const loadVinculos = async () => {
    if (!user) return;
    const { data, error } = await dbFrom("encarregado_alunos").select("*").eq("encarregado_id", user.id);
    if (error) throw error;
    const list = (data as any[]) ?? [];
    if (list.length) {
      const als = await fetchAllStudentRecords();
      const byId: Record<string, any> = {};
      (als as any[]).forEach((a) => { byId[a.id] = a.nome_completo ?? a.full_name ?? a.nome; });
      setVinculos(list.map((v) => ({ ...v, nome: byId[v.aluno_id] ?? "Educando" })));
    } else setVinculos([]);
  };

  const [erroAlunos, setErroAlunos] = useState<string | null>(null);

  useEffect(() => {
    fetchAlunosResult().then(({ data, error }) => {
      setAlunos(data);
      setErroAlunos(error?.message ?? null);
      if (error) toast.error("Erro ao carregar alunos: " + error.message);
    });
  }, []);
  useEffect(() => {
    void loadVinculos().catch((error: any) => {
      console.error("[EncarregadoVinculo] falha ao carregar associações:", error);
      toast.error(`Não foi possível carregar os educandos associados: ${error?.message ?? "erro desconhecido"}`);
    });
  }, [user]);

  const filtrados = busca.length >= 2
    ? alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 25) : [];

  const associar = async (a: AlunoRow) => {
    if (!user) return;
    if (!isUuid(a.id)) {
      toast.error("Não é possível associar: o registo não contém um UUID válido.");
      return;
    }
    try {
      const { error } = await dbFrom("encarregado_alunos").insert({
        encarregado_id: user.id, aluno_id: a.id, parentesco,
      });
      if (error) {
        if (error.message?.toLowerCase().includes("duplicate")) throw new Error("Este educando já está associado ao seu perfil.");
        throw error;
      }
      toast.success(`${a.nome} associado ao seu perfil`);
      setBusca("");
      await loadVinculos();
    } catch (error: any) {
      console.error("[EncarregadoVinculo] falha ao associar educando:", error);
      toast.error(error?.message ?? "Não foi possível associar o educando. Verifique a ligação ao Supabase.");
    }
  };

  const remover = async (id: string) => {
    try {
      const { error } = await dbFrom("encarregado_alunos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Associação removida.");
      await loadVinculos();
    } catch (error: any) {
      console.error("[EncarregadoVinculo] falha ao remover associação:", error);
      toast.error(`Não foi possível remover a associação: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  return (
    <RoleLayout title="Encarregado" subtitle="Herdeiros do Futuro" headerLabel="Associar Educando" navItems={encarregadoNav}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Associar Educando</h1>
            <p className="text-sm text-muted-foreground">Pesquise o nome completo do seu educando já registado na base de dados da escola.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Pesquisar aluno</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Grau de parentesco</Label><Input value={parentesco} onChange={(e) => setParentesco(e.target.value)} /></div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Escreva o nome do educando..." />
            </div>
            {busca.length >= 2 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
                {erroAlunos ? (<p className="text-xs text-destructive">Erro ao carregar alunos: {erroAlunos}</p>) : alunos.length === 0 ? (<p className="text-xs text-muted-foreground">Nenhum aluno registado na base de dados.</p>) : null}
                {filtrados.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
                  : filtrados.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">{a.nome} <span className="text-muted-foreground">— {a.classe}</span></span>
                      <Button size="sm" onClick={() => associar(a)}>Associar</Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Educandos associados ({vinculos.length})</CardTitle></CardHeader>
          <CardContent>
            {vinculos.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não associou nenhum educando.</p> : (
              <div className="space-y-2">
                {vinculos.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.parentesco}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remover(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default EncarregadoVinculo;
