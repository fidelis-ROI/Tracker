import { SessionProvider } from "@/components/SessionProvider";
import { Sidebar } from "@/components/admin/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Rota de login não tem sidebar
  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        {session && <Sidebar />}
        <main className="flex-1 overflow-auto bg-[#00020A]">{children}</main>
      </div>
    </SessionProvider>
  );
}
