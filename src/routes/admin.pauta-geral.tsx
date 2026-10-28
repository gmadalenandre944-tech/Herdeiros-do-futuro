import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminPautaGeral from "@/screens/AdminPautaGeral";

export const Route = createFileRoute("/admin/pauta-geral")({
  head: () => ({ meta: [
    { title: "Admin · Pauta Geral | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Pauta Geral." },
    { property: "og:title", content: "Admin · Pauta Geral | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Pauta Geral." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminPautaGeral /></RoleGuard>; }
