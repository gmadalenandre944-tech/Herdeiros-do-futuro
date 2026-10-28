import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@/lib/router-compat";

export const Route = createFileRoute("/aluno/grades")({
  head: () => ({ meta: [
    { title: "Aluno · Grades | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Grades." },
    { property: "og:title", content: "Aluno · Grades | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Grades." },
  ] }),
  component: Page,
});

function Page() { return <Navigate to="/aluno/desempenho" replace />; }
