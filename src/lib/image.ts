// Client-side image compression helper.
// Resizes to <= maxDim px on longest edge and re-encodes as JPEG until
// the resulting base64 payload is under ~700 KB (safely below the
// Supabase 1 MB request-body limit for auth signup metadata).

export async function compressImageToDataURL(
  file: File,
  maxDim = 512,
  maxBytes = 700 * 1024,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Ficheiro inválido — selecione uma imagem.");
  }

  const bitmap = await createImageBitmap(file).catch(async () => {
    // Safari/older fallback
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    return img as unknown as ImageBitmap;
  });

  const w = (bitmap as ImageBitmap).width ?? 0;
  const h = (bitmap as ImageBitmap).height ?? 0;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.35) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}
