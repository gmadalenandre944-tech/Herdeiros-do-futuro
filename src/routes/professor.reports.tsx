import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorReports from "@/screens/ProfessorReports";

export const Route = createFileRoute("/professor/reports")({
  head: () => ({ meta: [
    { title: "Professor · Reports | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Reports." },
    { property: "og:title", content: "Professor · Reports | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Reports." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorReports /></RoleGuard>; }
