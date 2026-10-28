import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import MiniPauta from "@/screens/MiniPauta";

export const Route = createFileRoute("/pauta")({
  head: () => ({ meta: [
    { title: "Pauta | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Pauta." },
    { property: "og:title", content: "Pauta | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Pauta." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><MiniPauta /></RoleGuard>; }
