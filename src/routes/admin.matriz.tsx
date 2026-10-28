import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminMatriz from "@/screens/AdminMatriz";

export const Route = createFileRoute("/admin/matriz")({
  head: () => ({ meta: [
    { title: "Admin · Matriz | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Matriz." },
    { property: "og:title", content: "Admin · Matriz | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Matriz." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminMatriz /></RoleGuard>; }
