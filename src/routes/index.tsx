import { createFileRoute } from "@tanstack/react-router";
import AuthRedirect from "@/components/AuthRedirect";
import Index from "@/screens/Index";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Início | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Início." },
    { property: "og:title", content: "Início | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Início." },
  ] }),
  component: Page,
});

function Page() { return <AuthRedirect><Index /></AuthRedirect>; }
