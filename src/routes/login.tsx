import { createFileRoute } from "@tanstack/react-router";
import AuthRedirect from "@/components/AuthRedirect";
import Login from "@/screens/Login";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Login | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Login." },
    { property: "og:title", content: "Login | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Login." },
  ] }),
  component: Page,
});

function Page() { return <AuthRedirect><Login /></AuthRedirect>; }
