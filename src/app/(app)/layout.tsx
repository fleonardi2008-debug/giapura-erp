import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { NavSidebar } from "@/components/nav-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <NavSidebar userName={session.user.name ?? session.user.email ?? ""} role={session.user.role} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
