import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoRanking from "@/screens/AlunoRanking";

export const Route = createFileRoute("/aluno/ranking")({
  head: () => ({ meta: [
    { title: "Aluno · Ranking | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Ranking." },
    { property: "og:title", content: "Aluno · Ranking | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Ranking." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado"]}><AlunoRanking /></RoleGuard>; }
