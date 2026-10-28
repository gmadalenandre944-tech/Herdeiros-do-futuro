import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { secretarioNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Download, Search } from "lucide-react";
import { fetchAlunosResult, type AlunoRow } from "@/lib/alunosApi";
import { gerarCartaoEscolarPDF } from "@/lib/officialDocs";

const SecretarioCartao = () => {
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<AlunoRow | null>(null);
  const [extra, setExtra] = useState({ turma: "", sala: "", numero: "", tel_escola: "941843725", tel_encarregado: "", ano_lectivo: "2025 - 2026" });
  const [foto, setFoto] = useState<string | null>(null);

  const [erroAlunos, setErroAlunos] = useState<string | null>(null);

  useEffect(() => {
    fetchAlunosResult().then(({ data, error }) => {
      setAlunos(data);
      setErroAlunos(error?.message ?? null);
      if (error) toast.error("Erro ao carregar alunos: " + error.message);
    });
  }, []);

  const filtrados = busca.length >= 2
    ? alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 20)
    : [];

  const onFoto = (f: File | null) => {
    if (!f) return setFoto(null);
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(f);
  };

  const gerar = () => {
    if (!sel) return toast.error("Selecione o aluno");
    const doc = gerarCartaoEscolarPDF({
      nome: sel.nome,
      classe: sel.classe ?? "",
      numero_processo: sel.numero_processo ?? "",
      turma: extra.turma, sala: extra.sala, numero: extra.numero,
      tel_escola: extra.tel_escola, tel_encarregado: extra.tel_encarregado || sel.contacto || "",
      ano_lectivo: extra.ano_lectivo,
      foto,
    });
    doc.save(`cartao-${sel.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("Cartão gerado para impressão");
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Cartão Escolar" navItems={secretarioNav}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Cartão de Estudante</h1>
            <p className="text-sm text-muted-foreground">Layout oficial amarelo com foto, dados do aluno e assinatura da Direcção.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">1. Seleccionar aluno</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" value={busca} onChange={(e) => { setBusca(e.target.value); setSel(null); }} placeholder="Pesquisar nome do aluno..." />
            </div>
            {erroAlunos ? (<p className="text-xs text-destructive">Erro ao carregar alunos: {erroAlunos}</p>) : alunos.length === 0 ? (<p className="text-xs text-muted-foreground">Nenhum aluno registado na base de dados.</p>) : null}
            {filtrados.length > 0 && !sel && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                {filtrados.map((a) => (
                  <button key={a.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => { setSel(a); setBusca(a.nome); }}>
                    {a.nome} <span className="text-muted-foreground">— {a.classe} · {a.numero_processo}</span>
                  </button>
                ))}
              </div>
            )}
            {sel && <p className="text-sm text-primary font-medium">Seleccionado: {sel.nome} ({sel.classe})</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">2. Dados do cartão</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Turma</Label><Input value={extra.turma} onChange={(e) => setExtra({ ...extra, turma: e.target.value })} /></div>
            <div><Label>Sala</Label><Input value={extra.sala} onChange={(e) => setExtra({ ...extra, sala: e.target.value })} /></div>
            <div><Label>Nº</Label><Input value={extra.numero} onChange={(e) => setExtra({ ...extra, numero: e.target.value })} /></div>
            <div><Label>Tel. da Escola</Label><Input value={extra.tel_escola} onChange={(e) => setExtra({ ...extra, tel_escola: e.target.value })} /></div>
            <div><Label>Tel. do Encarregado</Label><Input value={extra.tel_encarregado} onChange={(e) => setExtra({ ...extra, tel_encarregado: e.target.value })} /></div>
            <div><Label>Ano Lectivo</Label><Input value={extra.ano_lectivo} onChange={(e) => setExtra({ ...extra, ano_lectivo: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Fotografia</Label><Input type="file" accept="image/*" onChange={(e) => onFoto(e.target.files?.[0] ?? null)} /></div>
            {foto && <img src={foto} alt="Pré-visualização da foto do aluno" className="h-24 w-20 object-cover rounded border border-border" />}
          </CardContent>
        </Card>

        <Button onClick={gerar} disabled={!sel}><Download className="h-4 w-4 mr-2" />Gerar Cartão em PDF</Button>
      </div>
    </RoleLayout>
  );
};

export default SecretarioCartao;
