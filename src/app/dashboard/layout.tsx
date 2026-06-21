"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  UserCog,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Sprout,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/farmers", label: "Farmers", icon: Users },
  { href: "/dashboard/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/dashboard/history", label: "Records", icon: ClipboardList },
];

const adminItems = [
  { href: "/dashboard/agents", label: "Agents", icon: UserCog },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const allNavItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-fade md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 flex flex-col
          glass-dark
          transform transition-transform duration-300 ease-out print:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-forest-400 to-forest-500 rounded-xl flex items-center justify-center shadow-lg shadow-forest-500/25">
              <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Farmer ERP
              </h1>
              <p className="text-[11px] text-forest-300/70 -mt-0.5">
                Procurement System
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-forest-300 hover:text-white transition-colors rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group relative
                  ${
                    isActive
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-forest-200/70 hover:text-white hover:bg-white/8"
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-forest-400 rounded-r-full" />
                )}
                <item.icon
                  size={20}
                  className={
                    isActive
                      ? "text-forest-400"
                      : "text-forest-300/50 group-hover:text-forest-400/70"
                  }
                />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight
                    size={14}
                    className="ml-auto text-forest-400/50"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="px-4 pb-8 md:pb-4">
          <div className="p-4 rounded-2xl bg-white/8 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest-400 to-forest-500 flex items-center justify-center text-white text-sm font-bold">
                {session?.user?.name?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[11px] text-forest-300/60 truncate">
                  {session?.user?.role || "Agent"}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl 
                text-sm text-forest-200/60 hover:text-white hover:bg-white/10 
                transition-all duration-200 border border-white/5 hover:border-white/10"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass border-b border-slate-200/50 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-forest-500 to-forest-600 rounded-lg flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-forest-900 text-sm">
              Farmer ERP
            </span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200/50 z-40 print:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.04)] ${sidebarOpen ? "hidden" : "block"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-around h-16 px-2">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center w-full h-full space-y-1
                    transition-colors duration-200
                    ${
                      isActive
                        ? "text-forest-600"
                        : "text-slate-400 hover:text-slate-600 active:text-slate-800"
                    }
                  `}
                >
                  <item.icon
                    size={20}
                    className={isActive ? "text-forest-600" : ""}
                  />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
