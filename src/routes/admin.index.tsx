import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Dashboard from "@/screens/Dashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: "Admin | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin." },
    { property: "og:title", content: "Admin | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Dashboard /></RoleGuard>; }
