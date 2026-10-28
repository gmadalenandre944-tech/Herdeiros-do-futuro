import { useEffect, useRef, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Award, CreditCard, ScrollText, FileType2, Download, Printer } from "lucide-react";
import { INSIGNIA } from "@/lib/insignia";
import { downloadElementPdf } from "@/lib/elementPdf";
import { adminNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { toast } from "sonner";
import DocumentosDinamicos from "@/components/DocumentosDinamicos";
import { baixarWord, cabecalhoHtml, assinaturaHtml } from "@/lib/wordDocs";

const Documentos = () => {
  const [escola, setEscola] = useState("Colégio Herdeiros do Futuro");

  useEffect(() => {
    dbFrom("system_settings").select("nome_instituicao").maybeSingle()
      .then(({ data }: any) => { if (data?.nome_instituicao) setEscola(data.nome_instituicao); });
  }, []);

  /* ------------------------------ Modelo: Declaração de Frequência ------------------------------ */
  const baixarModeloDeclaracao = (): string => {
    const corpo = 
      cabecalhoHtml(escola, "DECLARAÇÃO DE FREQUÊNCIA") +
      `<p style="text-align: justify; font-size: 12pt; line-height: 1.8; margin-top: 30px;">
         Declara-se para os devidos efeitos que o(a) estudante <b>___________________________________________________</b>, portador(a) do processo nº <b>___________</b>, está regularmente matriculado(a) e frequenta a <b>___________</b> classe, no presente ano lectivo de <b>${new Date().getFullYear()}</b>, neste estabelecimento de ensino.
       </p>` +
      `<p style="font-size: 11pt; margin-top: 20px;"><b>Observações:</b> _________________________________________________________________</p>` +
      assinaturaHtml();
    return corpo;
  };

  /* ------------------------------ Modelo: Boletim / Declaração de Notas ------------------------------ */
  const baixarModeloBoletim = (): string => {
    const corpo = 
      cabecalhoHtml(escola, "BOLETIM / DECLARAÇÃO DE NOTAS") +
      `<p style="font-size: 11pt; margin-bottom: 15px;">
         <b>Estudante:</b> ___________________________________________________ | <b>Classe:</b> ____________ | <b>Ano Lectivo:</b> ${new Date().getFullYear()}
       </p>` +
      `<table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 10px;">
         <thead>
           <tr style="background-color: #f2f2f2;">
             <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Disciplina</th>
             <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Trimestre</th>
             <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">MAC</th>
             <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">NPP</th>
             <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">NPT</th>
             <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Média Final</th>
           </tr>
         </thead>
         <tbody>
           <tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td></tr>
           <tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td></tr>
           <tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td></tr>
           <tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td><td style="border: 1px solid #ccc; padding: 8px;"></td></tr>
         </tbody>
       </table>` +
      assinaturaHtml();
    return corpo;
  };

  /* ------------------------------ Modelo: Cartão de Estudante ------------------------------ */
  const baixarModeloCartao = (): string => {
    const corpo = `
      <div style="border: 2px solid #1e3a8a; border-radius: 12px; padding: 20px; width: 380px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <h3 style="text-align: center; color: #1e3a8a; margin: 0 0 5px 0; font-size: 14pt;">${escola}</h3>
        <p style="text-align: center; font-size: 9pt; color: #666; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Cartão de Estudante</p>
        <p style="font-size: 11pt; margin: 8px 0;"><b>Nome:</b> ___________________________</p>
        <p style="font-size: 11pt; margin: 8px 0;"><b>Classe:</b> _________ | <b>Turma:</b> _______</p>
        <p style="font-size: 11pt; margin: 8px 0;"><b>Nº Processo:</b> _____________________</p>
        <p style="font-size: 11pt; margin: 8px 0;"><b>Contacto:</b> ________________________</p>
        <div style="margin-top: 30px; text-align: center; border-top: 1px dashed #999; padding-top: 10px;">
          <p style="font-size: 8pt; color: #555; margin: 0;">O Diretor Escolar</p>
          <p style="font-size: 9pt; font-weight: bold; margin: 5px 0 0 0;">___________________________</p>
        </div>
      </div>
    `;
    return corpo;
  };

  /* ------------------------------ Modelo: Certificado ------------------------------ */
  const baixarModeloCertificado = (): string => {
    const corpo = 
      cabecalhoHtml(escola, "CERTIFICADO DE CONCLUSÃO") +
      `<p style="text-align: justify; font-size: 12pt; line-height: 1.8; margin-top: 40px;">
         Certifica-se para os devidos efeitos que <b>___________________________________________________</b>, filho(a) de ___________________________________________ e de ___________________________________________, nascido(a) aos ____ de ________________ de ________, natural de ________________________, portador(a) do bilhete de identidade nº _______________________, concluiu com aproveitamento o curso / ciclo de estudos de <b>___________________________________________________</b> no <b>${escola}</b>, no ano lectivo de <b>${new Date().getFullYear()}</b>.
       </p>` +
      assinaturaHtml();
    return corpo;
  };

  const modelos = [
    { id: "declaracao", titulo: "Declaração de Frequência", icon: FileText, ficheiro: "declaracao-frequencia", html: baixarModeloDeclaracao },
    { id: "boletim", titulo: "Boletim / Declaração de Notas", icon: Award, ficheiro: "boletim-notas", html: baixarModeloBoletim },
    { id: "cartao", titulo: "Cartão de Estudante", icon: CreditCard, ficheiro: "cartao-estudante", html: baixarModeloCartao },
    { id: "certificado", titulo: "Certificado", icon: ScrollText, ficheiro: "certificado", html: baixarModeloCertificado },
  ];
  const [ativo, setAtivo] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const modelo = modelos.find((m) => m.id === ativo);

  const abrir = (id: string) => {
    setAtivo(id);
    setTimeout(() => document.getElementById("doc-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const baixarWordAtual = () => {
    if (!modelo || !editorRef.current) return;
    baixarWord(modelo.ficheiro, modelo.titulo, editorRef.current.innerHTML);
    toast.success("Documento Word descarregado.");
  };
  const baixarPdfAtual = async () => {
    if (!modelo) return;
    try { await downloadElementPdf(".doc-folha", modelo.ficheiro); toast.success("PDF descarregado."); }
    catch (e: any) { toast.error(`Não foi possível gerar o PDF: ${e?.message ?? "erro"}`); }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Documentos" navItems={adminNav}>
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } body * { visibility: hidden !important; } .doc-folha, .doc-folha * { visibility: visible !important; } .doc-folha { position: absolute; left: 0; top: 0; width: 100% !important; box-shadow: none !important; padding: 0 !important; } } .doc-folha, .doc-folha * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`}</style>
      <div className="space-y-6">
        <div className="no-print">
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Modelos de Documentos Oficiais (Word)</h1>
          <p className="text-muted-foreground mt-1">
            Transfira os modelos em branco para edição e preenchimento manual diretamente no Microsoft Word.
          </p>
        </div>

        <DocumentosDinamicos escola={escola} />

        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
          {modelos.map((m) => (
            <Card key={m.id} className={`shadow-sm hover:shadow-md transition-shadow ${ativo === m.id ? "ring-2 ring-primary" : ""}`}>
              <CardHeader><CardTitle className="flex items-center gap-2"><m.icon className="h-5 w-5 text-primary" />{m.titulo}</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={() => abrir(m.id)} className="w-full gap-2">
                  <FileType2 className="h-4 w-4" /> Abrir e preencher
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {modelo && (
          <div id="doc-editor" className="space-y-3 scroll-mt-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div>
                <p className="font-montserrat text-lg font-bold">{modelo.titulo}</p>
                <p className="text-sm text-muted-foreground">Clique no documento abaixo e escreva os dados por cima das linhas. Depois baixe ou imprima.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={baixarWordAtual} className="gap-2"><FileType2 className="h-4 w-4" />Baixar Word</Button>
                <Button variant="outline" onClick={() => void baixarPdfAtual()} className="gap-2"><Download className="h-4 w-4" />Baixar PDF</Button>
                <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />Imprimir</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-muted p-4">
              <div className="doc-folha mx-auto w-[794px] min-h-[1000px] bg-background p-12 text-foreground shadow-md" style={{ fontFamily: '"Times New Roman", serif', fontSize: "12pt" }}>
                <img src={INSIGNIA} alt="Insígnia da República de Angola" className="insignia mx-auto mb-2 h-20" />
                <div key={modelo.id} ref={editorRef} contentEditable suppressContentEditableWarning
                  className="outline-none [&_h1]:text-center [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-center [&_h2]:text-lg [&_h2]:font-bold [&_.cab]:text-center"
                  dangerouslySetInnerHTML={{ __html: modelo.html() }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleLayout>
  );
};

export default Documentos;