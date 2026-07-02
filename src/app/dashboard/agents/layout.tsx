import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If there's no session or the user is NOT a Super Admin, instantly redirect them to the dashboard homepage
  const user = session?.user as any;
  if (!user || !user.isSuperAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
