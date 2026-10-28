import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorSchedule from "@/screens/ProfessorSchedule";

export const Route = createFileRoute("/professor/schedule")({
  head: () => ({ meta: [
    { title: "Professor · Schedule | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Schedule." },
    { property: "og:title", content: "Professor · Schedule | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Schedule." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorSchedule /></RoleGuard>; }
