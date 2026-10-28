import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminMatriz from "@/screens/AdminMatriz";

export const Route = createFileRoute("/admin/matriz")({
  head: () => ({ meta: [
    { title: "Admin · Matriz | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Matriz." },
    { property: "og:title", content: "Admin · Matriz | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Matriz." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminMatriz /></RoleGuard>; }
