import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoDashboard from "@/screens/EncarregadoDashboard";

export const Route = createFileRoute("/encarregado/")({
  head: () => ({ meta: [
    { title: "Encarregado | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Encarregado." },
    { property: "og:title", content: "Encarregado | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Encarregado." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoDashboard /></RoleGuard>; }
