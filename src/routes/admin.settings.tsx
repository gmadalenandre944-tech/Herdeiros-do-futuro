import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminSettings from "@/screens/AdminSettings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [
    { title: "Admin · Settings | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Settings." },
    { property: "og:title", content: "Admin · Settings | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Settings." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminSettings /></RoleGuard>; }
