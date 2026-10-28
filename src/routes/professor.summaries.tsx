import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorSummaries from "@/screens/ProfessorSummaries";

export const Route = createFileRoute("/professor/summaries")({
  head: () => ({ meta: [
    { title: "Professor · Summaries | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Summaries." },
    { property: "og:title", content: "Professor · Summaries | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Summaries." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorSummaries /></RoleGuard>; }
