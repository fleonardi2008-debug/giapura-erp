"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/plan", label: "Plan de acción" },
  { href: "/insumos", label: "Insumos" },
  { href: "/skus", label: "Productos (SKU)" },
  { href: "/lotes", label: "Lotes de producción" },
  { href: "/stock", label: "Stock" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/gastos", label: "Gastos" },
  { href: "/resultados", label: "Estado de resultados" },
  { href: "/club", label: "Club Fundadores" },
  { href: "/integraciones", label: "Integraciones" },
];

export function NavSidebar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">giapura</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {userName} · {role}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
