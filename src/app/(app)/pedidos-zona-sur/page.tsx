import { ListaPedidosZonaSur } from "@/components/zona-sur/lista-pedidos-zona-sur";

export default function PedidosZonaSurPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  return <ListaPedidosZonaSur canal="ZONA_SUR" searchParams={searchParams} />;
}
