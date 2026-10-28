import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@/lib/router-compat";

export const Route = createFileRoute("/aluno/grades")({
  head: () => ({ meta: [
    { title: "Aluno · Grades | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Grades." },
    { property: "og:title", content: "Aluno · Grades | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Grades." },
  ] }),
  component: Page,
});

function Page() { return <Navigate to="/aluno/desempenho" replace />; }
