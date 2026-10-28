import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { NavSidebar } from "@/components/nav-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <NavSidebar userName={session.user.name ?? session.user.email ?? ""} role={session.user.role} />
      <main className="min-w-0 flex-1 overflow-x-auto p-4 md:overflow-y-auto md:p-6">{children}</main>
    </div>
  );
}
