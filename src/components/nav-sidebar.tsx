"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const linksDueno = [
  { href: "/", label: "Inicio" },
  { href: "/insumos", label: "Insumos" },
  { href: "/compras", label: "Compras" },
  { href: "/produccion", label: "Producción" },
  { href: "/mi-zona", label: "Mi zona" },
  { href: "/reposicion", label: "Reposición" },
  { href: "/skus", label: "Productos (SKU)" },
  { href: "/lotes", label: "Lotes de producción" },
  { href: "/stock", label: "Stock" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/pedidos-zona-sur", label: "Pedidos Zona Sur" },
  { href: "/etiquetas", label: "Etiquetas Zona Sur" },
  { href: "/gastos", label: "Gastos" },
  { href: "/resultados", label: "Estado de resultados" },
  { href: "/club", label: "Club Fundadores" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/usuarios", label: "Usuarios" },
];

// El operador de fábrica entra con un login propio y limitado: solo ve Producción y las etiquetas
// (también es quien arma los pedidos de Zona Sur).
const linksFabrica = [
  { href: "/produccion", label: "Producción" },
  { href: "/etiquetas", label: "Etiquetas Zona Sur" },
];

export function NavSidebar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();
  const links = role === "OWNER" ? linksDueno : linksFabrica;
  const [abierto, setAbierto] = useState(false);
  const actual = links.find((l) => (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)))?.label;

  // Con el menú abierto en el celular: no se mueve la página de atrás y Escape lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const cerrarConEscape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", cerrarConEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      {/* Celular: barra de arriba con el botón del menú */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-2 py-1.5 md:hidden">
        <button
          type="button"
          aria-label="Abrir el menú"
          aria-expanded={abierto}
          aria-controls="menu-principal"
          onClick={() => setAbierto(true)}
          className="grid size-11 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">giapura</p>
        {actual && <span className="ml-auto truncate pr-2 text-sm text-sidebar-foreground/70">{actual}</span>}
      </header>

      {abierto && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setAbierto(false)} aria-hidden />}

      <aside
        id="menu-principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out",
          "md:static md:z-auto md:h-auto md:w-56 md:max-w-none md:translate-x-0 md:overflow-visible",
          abierto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-start justify-between border-b border-sidebar-border px-4 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">giapura</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {userName} · {role}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setAbierto(false)}
            className="grid size-9 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setAbierto(false)}
              className={cn(
                "block rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:py-2",
                pathname === link.href &&
                  "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className="h-11 w-full justify-start md:h-8"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
