import { createFileRoute } from "@tanstack/react-router";

// Alternative path to the school database, used by the browser when its direct
// connection fails. Only forwards to the database's own API paths; the caller's
// own key and session are passed through, so database access rules still apply.
const ALLOWED = /^(rest|auth|storage)\/v1\//;
const METHODS = ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"];
const PASS = ["apikey", "authorization", "content-type", "prefer", "accept", "accept-profile", "content-profile", "range", "range-unit", "x-client-info"];

const SESSAO_GRANDE = "A sessão desta conta está demasiado grande (foto de perfil antiga). O administrador deve executar a correção docs/sql/remover_foto_da_sessao.sql no Supabase; depois saia e entre de novo.";

type Envelope = { path?: string; method?: string; headers?: Record<string, string>; body?: string | null };

async function handle(request: Request): Promise<Response> {
  const started = Date.now();
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  let env: Envelope;
  try { env = await request.json(); } catch { return Response.json({ message: "Pedido inválido." }, { status: 400 }); }
  const path = String(env.path ?? "");
  const method = String(env.method ?? "GET").toUpperCase();
  if (!base || !ALLOWED.test(path) || path.includes("..") || !METHODS.includes(method)) {
    return Response.json({ message: "Pedido não permitido." }, { status: 400 });
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(env.headers ?? {})) {
    if (PASS.includes(k.toLowerCase()) && typeof v === "string") headers.set(k, v);
  }
  if (!headers.get("apikey")) return Response.json({ message: "Falta a chave." }, { status: 401 });
  if ((headers.get("authorization")?.length ?? 0) > 8000) {
    return Response.json({ code: "SESSAO_GRANDE", message: SESSAO_GRANDE }, { status: 431 });
  }

  const res = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : env.body ?? undefined,
  });
  // Buffer the whole answer: streamed bodies were cut by the preview proxy.
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  if (res.status >= 500 && !isJson) {
    return Response.json({ message: "A base de dados recusou o pedido. Tente de novo dentro de momentos." }, { status: 503 });
  }
  const data = await res.arrayBuffer();
  const out = new Headers();
  for (const h of ["content-type", "content-range", "preference-applied", "location"]) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set("cache-control", "no-store");
  console.log(`[sb-relay] ${method} ${path.split("?")[0]} -> ${res.status} in ${Date.now() - started}ms`);
  return new Response(data, { status: res.status, headers: out });
}

export const Route = createFileRoute("/api/public/sb-relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handle(request);
        } catch (e) {
          console.error("[sb-relay] failed:", e);
          return Response.json({ message: "A base de dados não respondeu." }, { status: 504 });
        }
      },
    },
  },
});
