"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutGrid, Users, UserCheck, DollarSign, KanbanSquare, LogOut, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/tripulacao", label: "Operadores", icon: UserCheck },
  { href: "/admin/boards", label: "Boards", icon: KanbanSquare },
  { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign, adminBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] flex-shrink-0 bg-canvas border-r border-line flex flex-col justify-between h-screen sticky top-0 py-7 px-5">
      <div>
        <div className="pb-5 mb-5 border-b border-line">
          <Logo subtitle="Painel de Performance" />
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map(({ href, label, icon: Icon, adminBadge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center justify-between px-4 py-3.5 rounded-[10px] text-[15px] transition-all group",
                  active
                    ? "bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 text-ink font-semibold"
                    : "text-dim hover:bg-surface-hover hover:text-ink border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={active ? "text-brand-soft" : "text-dim group-hover:text-ink"} />
                  <span>{label}</span>
                  {adminBadge && (
                    <span className="text-[10.5px] font-bold tracking-[0.04em] text-brand-soft bg-[#7C1EFB]/[0.22] rounded-[5px] px-1.5 py-0.5">
                      ADMIN
                    </span>
                  )}
                </div>
                {active && <ChevronRight size={14} className="text-brand-soft" strokeWidth={2.5} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-line pt-2 flex flex-col gap-0.5">
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] text-dim hover:text-ink hover:bg-surface-hover border border-transparent transition-all"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </aside>
  );
}
