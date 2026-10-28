import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminSettings from "@/screens/AdminSettings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [
    { title: "Admin · Settings | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Settings." },
    { property: "og:title", content: "Admin · Settings | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Settings." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminSettings /></RoleGuard>; }
