import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorAttendance from "@/screens/ProfessorAttendance";

export const Route = createFileRoute("/professor/attendance")({
  head: () => ({ meta: [
    { title: "Professor · Attendance | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Attendance." },
    { property: "og:title", content: "Professor · Attendance | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Attendance." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorAttendance /></RoleGuard>; }
