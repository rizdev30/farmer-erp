"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  UserCog,
  ClipboardList,
  X,
  LogOut,
  Sprout,
  ChevronRight,
  FileText,
  PlusCircle,
  ArrowLeft,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/farmers", label: "Farmers", icon: Users },
  { href: "/dashboard/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/dashboard/history", label: "Records", icon: ClipboardList },
];

const adminItems = [
  { href: "/dashboard/agents", label: "Agents", icon: UserCog },
];

function NavigationWrapper({ isMobile, setSidebarOpen, sidebarOpen }: { isMobile: boolean, setSidebarOpen?: any, sidebarOpen?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true;
  const isL4Admin = (session?.user as any)?.roles?.includes("L4_ADMIN") === true;
  const isL3Maker = (session?.user as any)?.roles?.includes("L3_PO_MAKER") === true;
  
  const isPOEnvironment = pathname.startsWith("/dashboard/po-") || searchParams.get("env") === "po";

  let allNavItems = [...navItems];
  
  if (isL3Maker && !isL4Admin && !isSuperAdmin) {
    allNavItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/po-maker", label: "Create PO", icon: PlusCircle },
      { href: "/dashboard/history", label: "Records", icon: ClipboardList },
      { href: "/dashboard/po-records", label: "PO List", icon: FileText },
    ];
  } else {
    if (isPOEnvironment && (isL3Maker || isL4Admin || isSuperAdmin)) {
      allNavItems = [
        { href: "/dashboard", label: "Exit PO Maker", icon: ArrowLeft, isExitItem: true } as any,
        { href: "/dashboard?env=po", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/po-maker", label: "Create PO", icon: PlusCircle },
        { href: "/dashboard/history?env=po", label: "Records", icon: ClipboardList },
        { href: "/dashboard/po-records", label: "PO List", icon: FileText },
      ];
    } else {
      if (isL3Maker || isL4Admin || isSuperAdmin) {
        allNavItems.push({ href: "/dashboard/po-maker", label: "PO Maker", icon: PlusCircle });
      }
      if (isSuperAdmin) {
        allNavItems.push(...adminItems);
      }
    }
  }

  if (isMobile) {
    return (
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-[8px] border-t border-slate-200/80 z-40 print:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.04)] ${sidebarOpen ? "hidden" : "block"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-[52px] px-2">
          {allNavItems.map((item: any) => {
            const itemPath = item.href.split('?')[0];
            const isActive = !item.isExitItem && pathname === itemPath;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center w-full h-full space-y-0.5
                  transition-all duration-100 active:scale-95 touch-manipulation
                  ${
                    isActive
                      ? "text-forest-600 font-bold"
                      : "text-slate-400 hover:text-slate-600 active:text-slate-800"
                  }
                `}
              >
                <item.icon size={20} className={isActive ? "text-forest-600 animate-pulse" : ""} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
      {allNavItems.map((item: any) => {
        const itemPath = item.href.split('?')[0];
        const isActive = !item.isExitItem && pathname === itemPath;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={() => setSidebarOpen && setSidebarOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-100 group relative active:scale-98 touch-manipulation
              ${
                isActive
                  ? "bg-white/15 text-white shadow-sm font-semibold"
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
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [navState, setNavState] = useState<"idle" | "loading" | "complete">("idle");

  useEffect(() => {
    if (navState === "loading") {
      setNavState("complete");
      const timer = setTimeout(() => setNavState("idle"), 400);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (
          href &&
          href.startsWith("/") &&
          !href.startsWith("#") &&
          anchor.target !== "_blank" &&
          !e.defaultPrevented &&
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          const currentUrl = window.location.pathname + window.location.search;
          if (currentUrl !== href) {
            setNavState("loading");
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "unauthenticated" || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center shadow-inner animate-pulse">
            <Sprout className="w-8 h-8 text-forest-300" strokeWidth={2.5} />
          </div>
          {status === "unauthenticated" && (
             <div className="text-forest-600 font-semibold bg-forest-50 px-6 py-2 rounded-full shadow-sm">
               Redirecting...
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      {navState !== "idle" && (
        <div 
          className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-forest-500 via-emerald-400 to-forest-600 z-[9999]"
          style={{
            transform: navState === "loading" ? "scaleX(0.75)" : "scaleX(1)",
            transformOrigin: "left",
            opacity: navState === "complete" ? 0 : 1,
            transitionProperty: "transform, opacity",
            transitionDuration: navState === "loading" ? "8000ms" : "300ms",
            transitionTimingFunction: navState === "loading" ? "cubic-bezier(0.05, 0.8, 0.1, 1)" : "ease-out",
          }}
        />
      )}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-fade md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 flex flex-col
          glass-dark
          transform transition-transform duration-300 ease-out print:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
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
            className="md:hidden p-2 -mr-2 text-forest-300 hover:text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all rounded-lg touch-manipulation"
          >
            <X size={20} />
          </button>
        </div>

        <Suspense fallback={<nav className="flex-1 px-4 py-6" />}>
          <NavigationWrapper isMobile={false} setSidebarOpen={setSidebarOpen} />
        </Suspense>

        <div className="hidden md:block px-4 pb-4">
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
                  {(session?.user as any)?.roles?.join(", ") || "Agent"}
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-200/50 print:hidden z-30 shrink-0" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-3">
            {/* Desktop logo context */}
            <div className="hidden md:block">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workspace</span>
              <h2 className="text-base font-bold text-slate-800 -mt-0.5">Farmer ERP</h2>
            </div>
            {/* Mobile Header Logo */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-forest-500 to-forest-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">
                Farmer ERP
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div id="mobile-filter-portal" className="flex md:hidden items-center" />
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className={pathname.startsWith("/dashboard/po-maker") ? "w-full h-full" : "max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8"}>
            {children}
          </div>
        </div>

        <Suspense fallback={null}>
          <NavigationWrapper isMobile={true} sidebarOpen={sidebarOpen} />
        </Suspense>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
