import { createFileRoute } from "@tanstack/react-router";
import AuthRedirect from "@/components/AuthRedirect";
import Index from "@/screens/Index";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Início | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Início." },
    { property: "og:title", content: "Início | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Início." },
  ] }),
  component: Page,
});

function Page() { return <AuthRedirect><Index /></AuthRedirect>; }
