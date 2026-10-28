import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ChatHub from "@/screens/ChatHub";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "Chat | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Chat." },
    { property: "og:title", content: "Chat | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Chat." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin","professor","secretario","aluno","encarregado"]}><ChatHub /></RoleGuard>; }
