import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoVinculo from "@/screens/EncarregadoVinculo";

export const Route = createFileRoute("/encarregado/vinculo")({
  head: () => ({ meta: [
    { title: "Encarregado · Vinculo | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Encarregado · Vinculo." },
    { property: "og:title", content: "Encarregado · Vinculo | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Encarregado · Vinculo." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoVinculo /></RoleGuard>; }
