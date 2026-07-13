"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutGrid, Users, UserCheck, DollarSign, LogOut, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/tripulacao", label: "Operadores", icon: UserCheck },
  { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign, adminBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] flex-shrink-0 bg-[#0B0E17] border-r border-white/[0.08] flex flex-col justify-between h-screen sticky top-0 py-7 px-5">
      <div>
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/[0.08]">
          <div className="w-10 h-10 rounded-xl bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 16L10 10L14 14L20 6" stroke="#A970FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 6H20V12" stroke="#A970FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-extrabold text-[17px] leading-tight tracking-[-0.01em]">ROI Tracker</p>
            <p className="text-[#8A8FA3] text-[12.5px] leading-tight">Painel de Performance</p>
          </div>
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
                    ? "bg-[#7C1EFB]/[0.16] border border-[#7C1EFB]/40 text-white font-semibold"
                    : "text-[#9BA0B4] hover:bg-white/[0.05] hover:text-white border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={active ? "text-[#A970FF]" : "text-[#9BA0B4] group-hover:text-white"} />
                  <span>{label}</span>
                  {adminBadge && (
                    <span className="text-[10.5px] font-bold tracking-[0.04em] text-[#8B6BFF] bg-[#7C1EFB]/[0.22] rounded-[5px] px-1.5 py-0.5">
                      ADMIN
                    </span>
                  )}
                </div>
                {active && <ChevronRight size={14} className="text-[#A970FF]" strokeWidth={2.5} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] text-[15px] text-[#9BA0B4] hover:text-white hover:bg-white/[0.05] border-t border-white/[0.08] transition-all"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}
