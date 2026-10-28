import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ChatHub from "@/screens/ChatHub";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "Chat | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Chat." },
    { property: "og:title", content: "Chat | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Chat." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin","professor","secretario","aluno","encarregado"]}><ChatHub /></RoleGuard>; }
