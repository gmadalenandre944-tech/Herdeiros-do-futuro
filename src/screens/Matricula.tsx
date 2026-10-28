import { useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Download, Camera } from "lucide-react";
import { adminNav } from "@/lib/nav";
import { registarAlunoCompleto } from "@/lib/students";

const classes = ["Iniciação", "1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe", "7ª Classe", "8ª Classe", "9ª Classe"];

export default function Matricula() {
  const [form, setForm] = useState({
    nome_completo: "",
    nomes_parentes: "",
    data_nascimento: "",
    genero: "Masculino",
    idade: "",
    classe: "",
    turma: "",
    contacto: "",
    numero_processo: "",
    fotografia_url: "",
  });
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ultimoMatriculado, setUltimoMatriculado] = useState<any>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFotoPreview(result);
        setForm((prev) => ({ ...prev, fotografia_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo || !form.classe || !form.nomes_parentes || !form.data_nascimento || !form.numero_processo.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      await registarAlunoCompleto({
        fullName: form.nome_completo,
        birthDate: form.data_nascimento,
        gender: form.genero,
        idade: form.idade ? Number(form.idade) : null,
        turma: form.turma,
        classe: form.classe,
        numeroProcesso: form.numero_processo,
      });
      toast.success("Aluno matriculado e incluído na base escolar e financeira.");
      setUltimoMatriculado({ ...form, nome_completo: form.nome_completo, classe: form.classe });
    } catch (error: any) {
      toast.error(`Erro ao guardar matrícula: ${error?.message ?? "verifique a ligação à base de dados."}`);
    } finally {
      setSaving(false);
    }
  };

  const descarregarFicha = (alunoData: any = form) => {
    const janelaPrint = window.open("", "_blank");
    if (!janelaPrint) {
      toast.error("Permita pop-ups no navegador para descarregar a ficha.");
      return;
    }

    const nomeAluno = alunoData.nome_completo || alunoData.full_name || "";
    const generoAluno = alunoData.genero || alunoData.gender || "";

    const htmlConteudo = `
      <html>
        <head>
          <title>Ficha de Matrícula - Colégio Herdeiros do Futuro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            h2 { margin: 0; text-transform: uppercase; font-size: 18px; }
            p.sub { margin: 5px 0 0; font-size: 13px; color: #555; }
            .content { margin-top: 20px; }
            .row { display: flex; margin-bottom: 12px; border-bottom: 1px dotted #ccc; padding-bottom: 6px; font-size: 14px; }
            .label { font-weight: bold; width: 220px; color: #444; }
            .value { flex: 1; }
            .foto-box { width: 110px; height: 130px; border: 1px solid #333; float: right; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; color: #777; overflow: hidden; background: #f9f9f9; }
            .foto-box img { width: 100%; height: 100%; object-fit: cover; }
            .assinaturas { margin-top: 60px; display: flex; justify-content: space-between; }
            .linha-assinatura { width: 40%; border-top: 1px solid #333; text-align: center; padding-top: 5px; font-size: 12px; }
            .footer-note { margin-top: 40px; font-size: 11px; text-align: center; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Colégio Herdeiros do Futuro</h2>
            <p class="sub">Secretaria Escolar — Comprovativo de Matrícula / Ficha Oficial</p>
          </div>

          <div class="content">
            <div class="foto-box">
              ${alunoData.fotografia_url ? `<img src="${alunoData.fotografia_url}" />` : "Fotografia do Aluno"}
            </div>

            <div class="row"><div class="label">Nome Completo do Aluno:</div><div class="value"><strong>${nomeAluno}</strong></div></div>
            <div class="row"><div class="label">Data de Nascimento:</div><div class="value">${alunoData.data_nascimento}</div></div>
            <div class="row"><div class="label">Género:</div><div class="value">${generoAluno}</div></div>
            <div class="row"><div class="label">Classe Matriculada:</div><div class="value"><strong>${alunoData.classe}</strong></div></div>
            <div class="row"><div class="label">Turma Atribuída:</div><div class="value">${alunoData.turma || "Turma Única"}</div></div>
            <div class="row"><div class="label">Nº de Processo:</div><div class="value">${alunoData.numero_processo || "—"}</div></div>
            <div class="row"><div class="label">Nome dos Parentes / Encarregado:</div><div class="value">${alunoData.nomes_parentes}</div></div>
            <div class="row"><div class="label">Contacto Telefónico:</div><div class="value">${alunoData.contacto || "Não especificado"}</div></div>
            <div class="row"><div class="label">Data do Registo:</div><div class="value">${new Date().toLocaleDateString()}</div></div>
          </div>

          <div class="assinaturas">
            <div class="linha-assinatura">Assinatura da Secretaria</div>
            <div class="linha-assinatura">Assinatura do Encarregado</div>
          </div>

          <p class="footer-note">Documento gerado eletronicamente pelo sistema escolar Herdeiros do Futuro.</p>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    janelaPrint.document.write(htmlConteudo);
    janelaPrint.document.close();
    toast.success("A preparar ficha para descarregar/imprimir...");
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Matrícula" navItems={adminNav}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Registo e Matrícula de Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">Preencha o formulário oficial para registar o aluno diretamente no painel de turmas e estatísticas.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col sm:flex-row gap-6 items-start pb-4 border-b border-border/60">
              <div className="flex flex-col items-center gap-2">
                <div className="w-28 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-secondary/50 relative">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs px-3 py-1.5 rounded-md font-medium transition-colors">
                  Anexar Foto
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo do Aluno *</Label>
                  <Input
                    value={form.nome_completo}
                    onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                    placeholder="Ex: Manuel António da Silva"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Nascimento *</Label>
                    <Input
                      type="date"
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input type="number" min={2} max={30} value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} placeholder="Ex: 6" />
                  </div>
                  <div className="space-y-2">
                    <Label>Género *</Label>
                    <Select value={form.genero} onValueChange={(v) => setForm({ ...form, genero: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº de Processo</Label>
                    <Input
                      value={form.numero_processo}
                      onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
                      placeholder="Ex: 10245"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome Completo dos Parentes / Encarregado *</Label>
                <Input
                  value={form.nomes_parentes}
                  onChange={(e) => setForm({ ...form, nomes_parentes: e.target.value })}
                  placeholder="Ex: Maria da Conceição Silva (Mãe)"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Classe *</Label>
                  <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Input
                    value={form.turma}
                    onChange={(e) => setForm({ ...form, turma: e.target.value })}
                    placeholder="Ex: Turma A, Turma B"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contacto Telefónico</Label>
                  <Input
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    placeholder="+244 9XX XXX XXX"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/60">
              <Button type="submit" className="w-full sm:w-auto flex-1" disabled={saving}>
                <UserPlus className="h-4 w-4 mr-2" />
                {saving ? "A guardar na base de dados..." : "Efetuar Matrícula e Registar"}
              </Button>

              {ultimoMatriculado && (
                <Button type="button" variant="outline" onClick={() => descarregarFicha(ultimoMatriculado)} className="w-full sm:w-auto gap-2">
                  <Download className="h-4 w-4" /> Descarregar Ficha de Matrícula
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </RoleLayout>
  );
}