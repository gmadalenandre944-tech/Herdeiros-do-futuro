import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoDashboard from "@/screens/AlunoDashboard";

export const Route = createFileRoute("/aluno/")({
  head: () => ({ meta: [
    { title: "Aluno | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno." },
    { property: "og:title", content: "Aluno | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoDashboard /></RoleGuard>; }
