import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioFinancas from "@/screens/SecretarioFinancas";

export const Route = createFileRoute("/secretario/financas")({
  head: () => ({ meta: [
    { title: "Secretario · Financas | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Financas." },
    { property: "og:title", content: "Secretario · Financas | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Financas." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioFinancas /></RoleGuard>; }
