import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoStudents from "@/screens/EncarregadoStudents";

export const Route = createFileRoute("/encarregado/students")({
  head: () => ({ meta: [
    { title: "Encarregado · Students | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Encarregado · Students." },
    { property: "og:title", content: "Encarregado · Students | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Encarregado · Students." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoStudents /></RoleGuard>; }
