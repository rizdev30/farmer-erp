import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If there's no session or the user is NOT a Super Admin or L4_ADMIN, instantly redirect them to the dashboard homepage
  const user = session?.user as any;
  if (!user || (!user.isSuperAdmin && !user.roles?.includes("L4_ADMIN"))) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
