import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Matricula from "@/screens/Matricula";

export const Route = createFileRoute("/matricula")({
  head: () => ({ meta: [
    { title: "Matricula | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Matricula." },
    { property: "og:title", content: "Matricula | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Matricula." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><Matricula /></RoleGuard>; }
