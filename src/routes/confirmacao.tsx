import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Confirmacao from "@/screens/Confirmacao";

export const Route = createFileRoute("/confirmacao")({
  head: () => ({ meta: [
    { title: "Confirmacao | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Confirmacao." },
    { property: "og:title", content: "Confirmacao | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Confirmacao." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><Confirmacao /></RoleGuard>; }
