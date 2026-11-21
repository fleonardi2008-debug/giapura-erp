import { ListaPedidosZonaSur } from "@/components/zona-sur/lista-pedidos-zona-sur";

export default function PedidosEcoYpfPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  return <ListaPedidosZonaSur canal="ECOYPF" searchParams={searchParams} />;
}
