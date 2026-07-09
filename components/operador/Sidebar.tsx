"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BarChart3, User, LogOut, ChevronRight, Gauge } from "lucide-react";

const navItems = [
  { href: "/operador/dashboard", label: "Carteira", icon: LayoutDashboard },
  { href: "/operador/clientes", label: "Clientes", icon: Users },
  { href: "/operador/perfil", label: "Painel Pessoal", icon: User },
];

export function OperadorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0A0F1E] border-r border-[#1A2140] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#1A2140]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1440FF] rounded-lg flex items-center justify-center">
            <Gauge size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold font-titillium text-sm leading-tight">NitroADS</p>
            <p className="text-[#8892A4] text-xs font-manrope leading-tight">Portal do Operador</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-manrope transition-all group",
                active
                  ? "bg-[#1440FF]/15 text-white border border-[#1440FF]/30"
                  : "text-[#8892A4] hover:bg-[#1A2140] hover:text-white"
              )}
            >
              <Icon size={16} className={active ? "text-[#1440FF]" : "text-[#8892A4] group-hover:text-white"} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-[#1440FF]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1A2140]">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-manrope text-[#8892A4] hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
