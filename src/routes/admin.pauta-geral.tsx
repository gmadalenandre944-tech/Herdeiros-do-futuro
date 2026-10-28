import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminPautaGeral from "@/screens/AdminPautaGeral";

export const Route = createFileRoute("/admin/pauta-geral")({
  head: () => ({ meta: [
    { title: "Admin · Pauta Geral | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Pauta Geral." },
    { property: "og:title", content: "Admin · Pauta Geral | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Pauta Geral." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminPautaGeral /></RoleGuard>; }
