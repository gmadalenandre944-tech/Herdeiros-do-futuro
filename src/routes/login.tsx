import { createFileRoute } from "@tanstack/react-router";
import AuthRedirect from "@/components/AuthRedirect";
import Login from "@/screens/Login";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Login | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Login." },
    { property: "og:title", content: "Login | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Login." },
  ] }),
  component: Page,
});

function Page() { return <AuthRedirect><Login /></AuthRedirect>; }
