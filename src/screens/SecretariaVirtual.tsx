import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { db as dbFrom } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, FileText, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { alunoNav, encarregadoNav } from "@/lib/nav";
import { fetchAlunosResult, type AlunoRow } from "@/lib/alunosApi";

const TIPOS_DOC = ["Declaração de Notas", "Certificado", "Cartão de Estudante", "Boletim de Notas"];

const SecretariaVirtual = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isEncarregado = role === "encarregado";
  const nav = isEncarregado ? encarregadoNav : alunoNav;

  const [tipoDoc, setTipoDoc] = useState(TIPOS_DOC[0]);
  const [obs, setObs] = useState("");
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [busca, setBusca] = useState("");
  const [alunoSel, setAlunoSel] = useState<AlunoRow | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroAlunos, setErroAlunos] = useState<string | null>(null);

  const loadPedidos = async () => {
    if (!user) return;
    try {
      const { data, error } = await dbFrom("documentos_solicitados")
        .select("*")
        .eq("solicitante_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPedidos((data as any[]) ?? []);
    } catch (error: any) {
      console.error("[SecretariaVirtual] falha ao carregar pedidos:", error);
      toast.error(`Não foi possível carregar os pedidos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  useEffect(() => {
    void loadPedidos();
  }, [user]);

  useEffect(() => {
    if (!isEncarregado) return;
    void (async () => {
      try {
        const { data, error } = await fetchAlunosResult();
        if (error) throw error;
        setAlunos(data ?? []);
        setErroAlunos(null);
      } catch (error: any) {
        console.error("[SecretariaVirtual] falha ao carregar alunos:", error);
        setErroAlunos(error?.message ?? "Verifique a ligação ao Supabase.");
        toast.error(`Não foi possível carregar os alunos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      }
    })();
  }, [isEncarregado]);

  const filtradosAlunos = busca.length >= 2 && !alunoSel
    ? alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 15) 
    : [];

  const enviarPedido = async () => {
    if (!user) return;

    if (isEncarregado && !alunoSel) {
      toast.error("Por favor, selecione o educando na lista de pesquisa.");
      return;
    }

    setEnviando(true);
    try {
      const { error } = await dbFrom("documentos_solicitados").insert({
        solicitante_id: user.id,
        solicitante_nome: user.email,
        solicitante_role: role ?? "aluno",
        aluno_id: alunoSel?.id ?? null,
        aluno_nome: alunoSel?.nome ?? null,
        tipo: tipoDoc,
        observacao: obs,
        estado: "Pendente",
      });
      if (error) throw error;
      toast.success("Pedido enviado com sucesso!");
      setObs("");
      setAlunoSel(null);
      setBusca("");
      await loadPedidos();
    } catch (error: any) {
      console.error("[SecretariaVirtual] falha ao enviar pedido:", error);
      toast.error(`Não foi possível enviar o pedido: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <RoleLayout title={isEncarregado ? "Encarregado" : "Aluno"} subtitle="Herdeiros do Futuro" headerLabel="Secretaria Virtual" navItems={nav}>
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Secretaria Virtual</h1>
          <p className="text-muted-foreground text-sm mt-1">Preencha o formulário abaixo para solicitar documentos oficiais à escola.</p>
        </div>

        {/* Formulário Único */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-montserrat font-bold text-lg">Novo Pedido de Documento</h2>
          
          {isEncarregado && (
            <div className="space-y-2">
              <Label>Selecionar Educando</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  value={busca} 
                  onChange={(e) => { setBusca(e.target.value); setAlunoSel(null); }} 
                  placeholder="Pesquisar nome do educando..." 
                />
              </div>

              {alunoSel && (
                <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary p-2 rounded-lg font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Educando selecionado: {alunoSel.nome} ({alunoSel.classe})
                </div>
              )}

              {erroAlunos && <p className="text-xs text-destructive">Erro ao carregar alunos: {erroAlunos}</p>}

              {filtradosAlunos.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border mt-1 max-h-48 overflow-y-auto bg-background shadow-md z-10 relative">
                  {filtradosAlunos.map((a) => (
                    <button 
                      key={a.id} 
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                      onClick={() => { setAlunoSel(a); setBusca(a.nome); }}
                    >
                      {a.nome} — <span className="text-muted-foreground">{a.classe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select value={tipoDoc} onValueChange={setTipoDoc}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_DOC.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação / Finalidade (Opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Para efeitos de abono de família ou transferência" />
          </div>

          <Button onClick={enviarPedido} disabled={enviando} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />{enviando ? "A enviar pedido..." : "Enviar Pedido"}
          </Button>
        </div>

        {/* Histórico de Pedidos */}
        <div className="space-y-3">
          <h2 className="font-montserrat font-bold text-lg">Histórico de Pedidos</h2>
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card border border-border p-6 rounded-xl text-center">Nenhum pedido efetuado até o momento.</p>
          ) : (
            pedidos.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start shadow-sm">
                <div className="space-y-1">
                  <p className="font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4 text-primary" />{r.tipo}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-AO")}</p>
                  {r.aluno_nome && <p className="text-xs font-medium text-primary mt-1">Educando: {r.aluno_nome}</p>}
                  {r.observacao && <p className="text-sm text-muted-foreground mt-1">Obs: {r.observacao}</p>}
                </div>
                <Badge variant={r.estado === "Concluído" ? "default" : "secondary"}>
                  {r.estado}
                </Badge>
              </div>
            ))
          )}
        </div>

      </div>
    </RoleLayout>
  );
};

export default SecretariaVirtual;