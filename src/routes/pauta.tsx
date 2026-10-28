import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import MiniPauta from "@/screens/MiniPauta";

export const Route = createFileRoute("/pauta")({
  head: () => ({ meta: [
    { title: "Pauta | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Pauta." },
    { property: "og:title", content: "Pauta | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Pauta." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><MiniPauta /></RoleGuard>; }
