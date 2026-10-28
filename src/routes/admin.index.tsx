import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Dashboard from "@/screens/Dashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: "Admin | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin." },
    { property: "og:title", content: "Admin | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Dashboard /></RoleGuard>; }
