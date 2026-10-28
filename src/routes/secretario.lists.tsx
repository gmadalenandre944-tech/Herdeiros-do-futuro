import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioLists from "@/screens/SecretarioLists";

export const Route = createFileRoute("/secretario/lists")({
  head: () => ({ meta: [
    { title: "Secretario · Lists | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Lists." },
    { property: "og:title", content: "Secretario · Lists | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Lists." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioLists /></RoleGuard>; }
