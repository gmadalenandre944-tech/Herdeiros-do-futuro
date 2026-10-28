import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretariaVirtual from "@/screens/SecretariaVirtual";

export const Route = createFileRoute("/secretaria-virtual")({
  head: () => ({ meta: [
    { title: "Secretaria Virtual | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretaria Virtual." },
    { property: "og:title", content: "Secretaria Virtual | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretaria Virtual." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado"]}><SecretariaVirtual /></RoleGuard>; }
