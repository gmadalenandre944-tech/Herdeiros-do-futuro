import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorAnnouncements from "@/screens/ProfessorAnnouncements";

export const Route = createFileRoute("/professor/announcements")({
  head: () => ({ meta: [
    { title: "Professor · Comunicados | Herdeiros do Futuro" },
    { name: "description", content: "Comunicados publicados pela Administração para a comunidade escolar." },
    { property: "og:title", content: "Professor · Comunicados | Herdeiros do Futuro" },
    { property: "og:description", content: "Comunicados publicados pela Administração para a comunidade escolar." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorAnnouncements /></RoleGuard>; }
