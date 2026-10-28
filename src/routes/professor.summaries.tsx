import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorSummaries from "@/screens/ProfessorSummaries";

export const Route = createFileRoute("/professor/summaries")({
  head: () => ({ meta: [
    { title: "Professor · Summaries | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Summaries." },
    { property: "og:title", content: "Professor · Summaries | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Summaries." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorSummaries /></RoleGuard>; }
