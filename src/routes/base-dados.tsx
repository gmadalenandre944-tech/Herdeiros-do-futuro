import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import BaseDados from "@/screens/BaseDados";

export const Route = createFileRoute("/base-dados")({
  head: () => ({ meta: [
    { title: "Base Dados | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Base Dados." },
    { property: "og:title", content: "Base Dados | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Base Dados." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin","secretario","professor"]}><BaseDados /></RoleGuard>; }
