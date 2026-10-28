import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminDadosVivo from "@/screens/AdminDadosVivo";

export const Route = createFileRoute("/admin/dados")({
  head: () => ({ meta: [
    { title: "Dados em Tempo Real | Herdeiros do Futuro" },
    { name: "description", content: "Estudantes e turmas em tempo real no painel do administrador." },
    { property: "og:title", content: "Dados em Tempo Real | Herdeiros do Futuro" },
    { property: "og:description", content: "Estudantes e turmas em tempo real no painel do administrador." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminDadosVivo />
    </RoleGuard>
  );
}
