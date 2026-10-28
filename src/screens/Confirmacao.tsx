import { useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Printer, X } from "lucide-react";
import { registarConfirmacao } from "@/lib/students";
import { adminNav, secretarioNav } from "@/lib/nav";
import { useUserRole } from "@/hooks/useUserRole";
import ListaOficialPainel from "@/components/ListaOficialPainel";

const classes = ["Iniciação", "1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe", "7ª Classe", "8ª Classe", "9ª Classe"];

export default function Confirmacao() {
  const { role } = useUserRole();
  const nav = role === "secretario" ? secretarioNav : adminNav;
  
  const [nomeAluno, setNomeAluno] = useState("");
  const [numProcesso, setNumProcesso] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [idade, setIdade] = useState("");
  const [classe, setClasse] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [sala, setSala] = useState("");
  const [recibo, setRecibo] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  
  const [saving, setSaving] = useState(false);
  const [fichaConfirmacao, setFichaConfirmacao] = useState<any | null>(null);

  const handleConfirm = async () => {
    if (!nomeAluno.trim()) { toast.error("Digite o nome do aluno."); return; }
    if (!classe) { toast.error("Selecione a classe."); return; }
    if (!numProcesso.trim()) { toast.error("Informe o número de processo do aluno."); return; }
    if (!dataNascimento) { toast.error("Informe a data de nascimento do aluno."); return; }
    if (!sexo) { toast.error("Selecione o sexo do aluno."); return; }
    if (!recibo.trim()) { toast.error("Informe o número do Recibo de Confirmação."); return; }

    setSaving(true);

    try {
      await registarConfirmacao({
        fullName: nomeAluno,
        birthDate: dataNascimento,
        gender: sexo,
        idade: idade ? Number(idade) : null,
        turma: turmaNome || "Turma Geral",
        classe,
        numeroProcesso: numProcesso,
        recibo,
        sala,
        anoLetivo,
      });

      toast.success("Confirmação efetuada com sucesso!");

      setFichaConfirmacao({
        nome_completo: nomeAluno,
        numero_processo: numProcesso || "S/N",
        nova_classe: classe,
        turma_nome: turmaNome || "Turma Geral",
        sala: sala || "N/A",
        ano_letivo: anoLetivo,
        recibo_num: recibo,
        data_confirmacao: new Date().toLocaleDateString()
      });

    } catch (err: any) {
      console.error("[Confirmacao] erro ao guardar aluno confirmado:", err);
      toast.error(`Ocorreu um erro ao guardar o aluno: ${err?.message ?? "verifique a ligação à base de dados."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Confirmação de Matrícula" navItems={nav}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Confirmação (Re-matrícula Direta)</h1>
          <p className="text-muted-foreground text-sm mt-1">Preencha os dados manualmente para efetivar a confirmação e gerar o comprovativo oficial.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome Completo do Aluno *</Label>
              <Input 
                value={nomeAluno} 
                onChange={(e) => setNomeAluno(e.target.value)} 
                placeholder="Digite o nome completo do aluno..." 
              />
            </div>

            <div className="space-y-2">
              <Label>Número de Processo *</Label>
              <Input 
                value={numProcesso} 
                onChange={(e) => setNumProcesso(e.target.value)} 
                placeholder="Ex: PROC-2026-001" 
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Nascimento *</Label>
              <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Idade</Label>
              <Input type="number" min={2} max={30} value={idade} onChange={(e) => setIdade(e.target.value)} placeholder="Ex: 10" />
            </div>

            <div className="space-y-2">
              <Label>Género *</Label>
              <Select value={sexo} onValueChange={setSexo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano Letivo</Label>
              <Input type="number" value={anoLetivo} onChange={(e) => setAnoLetivo(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Classe *</Label>
              <Select value={classe} onValueChange={setClasse}>
                <SelectTrigger><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turma</Label>
              <Input 
                value={turmaNome} 
                onChange={(e) => setTurmaNome(e.target.value)} 
                placeholder="Ex: Turma A, Módulo 3" 
              />
            </div>

            <div className="space-y-2">
              <Label>Sala</Label>
              <Input 
                value={sala} 
                onChange={(e) => setSala(e.target.value)} 
                placeholder="Ex: Sala 05" 
              />
            </div>

            <div className="space-y-2">
              <Label>Nº Recibo de Confirmação *</Label>
              <Input 
                value={recibo} 
                onChange={(e) => setRecibo(e.target.value)} 
                placeholder="REC-2026-0001" 
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleConfirm} disabled={saving || !nomeAluno || !classe || !recibo} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />{saving ? "A processar..." : "Confirmar e Registar"}
            </Button>

            {fichaConfirmacao && (
              <Button variant="outline" onClick={() => setFichaConfirmacao(fichaConfirmacao)} className="gap-2 border-primary text-primary">
                <Printer className="h-4 w-4" /> Ver / Imprimir Ficha Oficial
              </Button>
            )}
          </div>
        </div>

        <ListaOficialPainel titulo="Painel de Confirmações e Matrículas" />
      </div>

      {/* MODAL DA FICHA DE CONFIRMAÇÃO OFICIAL */}
      {fichaConfirmacao && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-lg">Comprovativo de Confirmação de Matrícula</h3>
              <Button variant="ghost" size="icon" onClick={() => setFichaConfirmacao(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div id="printable-area" className="bg-card text-card-foreground p-6 border border-border rounded-lg space-y-4 text-sm">
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-bold text-lg uppercase">Colégio Herdeiros do Futuro</h2>
                <p className="text-muted-foreground text-xs">Secretaria Escolar — Declaração / Comprovativo de Re-matrícula</p>
              </div>

              <div className="space-y-2">
                <p><strong>Nome Completo do Aluno:</strong> {fichaConfirmacao.nome_completo}</p>
                <p><strong>Nº de Processo:</strong> {fichaConfirmacao.numero_processo}</p>
                <p><strong>Ano Letivo:</strong> {fichaConfirmacao.ano_letivo}</p>
                <p><strong>Classe Confirmada:</strong> {fichaConfirmacao.nova_classe}</p>
                <p><strong>Turma:</strong> {fichaConfirmacao.turma_nome}</p>
                <p><strong>Sala:</strong> {fichaConfirmacao.sala}</p>
                <p><strong>Nº do Recibo de Tesouraria:</strong> {fichaConfirmacao.recibo_num}</p>
                <p><strong>Data da Confirmação:</strong> {fichaConfirmacao.data_confirmacao}</p>
              </div>

              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-foreground/50 pt-1">O(A) Funcionário(a) da Secretaria</div>
                <div className="border-t border-foreground/50 pt-1">O(A) Encarregado(a)</div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setFichaConfirmacao(null)}>Fechar</Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir Ficha Oficial
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleLayout>
  );
}