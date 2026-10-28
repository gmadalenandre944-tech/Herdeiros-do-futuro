import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoVinculo from "@/screens/EncarregadoVinculo";

export const Route = createFileRoute("/encarregado/vinculo")({
  head: () => ({ meta: [
    { title: "Encarregado · Vinculo | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Vinculo." },
    { property: "og:title", content: "Encarregado · Vinculo | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Vinculo." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoVinculo /></RoleGuard>; }
