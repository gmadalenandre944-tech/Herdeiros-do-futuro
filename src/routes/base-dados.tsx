import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import BaseDados from "@/screens/BaseDados";

export const Route = createFileRoute("/base-dados")({
  head: () => ({ meta: [
    { title: "Base Dados | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Base Dados." },
    { property: "og:title", content: "Base Dados | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Base Dados." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin","secretario","professor"]}><BaseDados /></RoleGuard>; }
