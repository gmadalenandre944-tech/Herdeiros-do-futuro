import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Documentos from "@/screens/Documentos";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [
    { title: "Documentos | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Documentos." },
    { property: "og:title", content: "Documentos | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Documentos." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Documentos /></RoleGuard>; }
