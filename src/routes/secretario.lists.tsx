import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioLists from "@/screens/SecretarioLists";

export const Route = createFileRoute("/secretario/lists")({
  head: () => ({ meta: [
    { title: "Secretario · Lists | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Lists." },
    { property: "og:title", content: "Secretario · Lists | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Lists." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioLists /></RoleGuard>; }
