import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoRanking from "@/screens/AlunoRanking";

export const Route = createFileRoute("/aluno/ranking")({
  head: () => ({ meta: [
    { title: "Aluno · Ranking | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Ranking." },
    { property: "og:title", content: "Aluno · Ranking | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Ranking." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado"]}><AlunoRanking /></RoleGuard>; }
