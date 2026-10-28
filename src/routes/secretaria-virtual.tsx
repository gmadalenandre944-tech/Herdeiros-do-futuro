import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretariaVirtual from "@/screens/SecretariaVirtual";

export const Route = createFileRoute("/secretaria-virtual")({
  head: () => ({ meta: [
    { title: "Secretaria Virtual | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretaria Virtual." },
    { property: "og:title", content: "Secretaria Virtual | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretaria Virtual." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado"]}><SecretariaVirtual /></RoleGuard>; }
