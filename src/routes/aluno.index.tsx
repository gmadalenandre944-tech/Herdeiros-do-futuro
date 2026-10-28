import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoDashboard from "@/screens/AlunoDashboard";

export const Route = createFileRoute("/aluno/")({
  head: () => ({ meta: [
    { title: "Aluno | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno." },
    { property: "og:title", content: "Aluno | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoDashboard /></RoleGuard>; }
