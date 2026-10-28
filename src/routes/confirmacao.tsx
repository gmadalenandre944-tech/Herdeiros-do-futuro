import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Confirmacao from "@/screens/Confirmacao";

export const Route = createFileRoute("/confirmacao")({
  head: () => ({ meta: [
    { title: "Confirmacao | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Confirmacao." },
    { property: "og:title", content: "Confirmacao | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Confirmacao." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><Confirmacao /></RoleGuard>; }
