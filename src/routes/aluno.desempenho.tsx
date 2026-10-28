import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoDesempenho from "@/screens/AlunoGrades";

export const Route = createFileRoute("/aluno/desempenho")({
  head: () => ({ meta: [
    { title: "Aluno · Desempenho | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Desempenho." },
    { property: "og:title", content: "Aluno · Desempenho | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Desempenho." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoDesempenho /></RoleGuard>; }
