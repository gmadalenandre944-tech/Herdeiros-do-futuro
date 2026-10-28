import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoDesempenho from "@/screens/AlunoGrades";

export const Route = createFileRoute("/aluno/desempenho")({
  head: () => ({ meta: [
    { title: "Aluno · Desempenho | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Desempenho." },
    { property: "og:title", content: "Aluno · Desempenho | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Desempenho." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoDesempenho /></RoleGuard>; }
