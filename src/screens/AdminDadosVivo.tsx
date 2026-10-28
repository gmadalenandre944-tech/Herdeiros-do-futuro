import RoleLayout from "@/components/RoleLayout";
import { adminNav } from "@/lib/nav";
import ListaOficialPainel from "@/components/ListaOficialPainel";

const AdminDadosVivo = () => (
  <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Listas Oficiais" navItems={adminNav}>
    <ListaOficialPainel titulo="Listas Oficiais — Iniciação à 9ª Classe" />
  </RoleLayout>
);

export default AdminDadosVivo;
