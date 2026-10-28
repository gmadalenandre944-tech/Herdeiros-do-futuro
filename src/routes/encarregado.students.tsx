import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoStudents from "@/screens/EncarregadoStudents";

export const Route = createFileRoute("/encarregado/students")({
  head: () => ({ meta: [
    { title: "Encarregado · Students | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Students." },
    { property: "og:title", content: "Encarregado · Students | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Students." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoStudents /></RoleGuard>; }
