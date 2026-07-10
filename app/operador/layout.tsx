import { OperadorSidebar } from "@/components/operador/Sidebar";

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0E17] flex">
      <OperadorSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
