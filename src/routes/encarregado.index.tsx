import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoDashboard from "@/screens/EncarregadoDashboard";

export const Route = createFileRoute("/encarregado/")({
  head: () => ({ meta: [
    { title: "Encarregado | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado." },
    { property: "og:title", content: "Encarregado | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoDashboard /></RoleGuard>; }
