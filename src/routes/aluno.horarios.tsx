import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoHorarios from "@/screens/AlunoHorarios";

export const Route = createFileRoute("/aluno/horarios")({
  head: () => ({ meta: [
    { title: "Aluno · Horarios | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Horarios." },
    { property: "og:title", content: "Aluno · Horarios | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Horarios." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado","professor"]}><AlunoHorarios /></RoleGuard>; }
