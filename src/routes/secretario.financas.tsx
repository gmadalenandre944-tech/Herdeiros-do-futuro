import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioFinancas from "@/screens/SecretarioFinancas";

export const Route = createFileRoute("/secretario/financas")({
  head: () => ({ meta: [
    { title: "Secretario · Financas | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Financas." },
    { property: "og:title", content: "Secretario · Financas | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Financas." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioFinancas /></RoleGuard>; }
