import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminReports from "@/screens/AdminReports";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [
    { title: "Admin · Reports | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Reports." },
    { property: "og:title", content: "Admin · Reports | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Reports." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminReports /></RoleGuard>; }
