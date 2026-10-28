import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorSchedule from "@/screens/ProfessorSchedule";

export const Route = createFileRoute("/professor/schedule")({
  head: () => ({ meta: [
    { title: "Professor · Schedule | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Schedule." },
    { property: "og:title", content: "Professor · Schedule | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Schedule." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorSchedule /></RoleGuard>; }
