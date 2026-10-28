/**
 * Exportação de documentos oficiais em formato Word (.doc — compatível com
 * Microsoft Word, LibreOffice e Google Docs). Gerado a partir de HTML,
 * sem dependências externas, com download automático.
 */
export function baixarWord(nomeFicheiro: string, titulo: string, corpoHtml: string) {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; }
  h1 { font-size: 16pt; text-align: center; }
  h2 { font-size: 13pt; text-align: center; }
  .cab { text-align: center; line-height: 1.4; }
  table { border-collapse: collapse; width: 100%; margin-top: 12pt; }
  th, td { border: 1px solid #333; padding: 4pt 6pt; font-size: 11pt; }
  .just { text-align: justify; line-height: 1.6; }
  .ass { margin-top: 48pt; }
</style></head>
<body>${corpoHtml}</body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFicheiro.endsWith(".doc") ? nomeFicheiro : `${nomeFicheiro}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const cabecalhoHtml = (escola: string, subtitulo: string) => `
  <div class="cab">
    <p><b>REPÚBLICA DE ANGOLA</b><br/>GOVERNO PROVINCIAL DE LUANDA<br/>ADMINISTRAÇÃO MUNICIPAL DO KILAMBA KIAXI<br/>DIRECÇÃO MUNICIPAL DA EDUCAÇÃO</p>
    <h1>${escola}</h1>
    <h2>${subtitulo}</h2>
  </div>`;

export const assinaturaHtml = () => `
  <p class="ass">Luanda, ${new Date().toLocaleDateString("pt-AO")}</p>
  <p class="ass">_______________________________<br/>A Direcção / Secretaria</p>`;
