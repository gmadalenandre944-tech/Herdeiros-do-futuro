import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminReports from "@/screens/AdminReports";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [
    { title: "Admin · Reports | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Reports." },
    { property: "og:title", content: "Admin · Reports | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Reports." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminReports /></RoleGuard>; }
