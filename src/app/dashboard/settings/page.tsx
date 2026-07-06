"use client";

import { useSession, signOut } from "next-auth/react";
import { User, Mail, LogOut, Settings as SettingsIcon, Sprout } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  // Redirect to login if session is invalid or missing user data
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center shadow-inner animate-pulse">
            <Sprout className="w-8 h-8 text-forest-300" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated or no user data, show redirect message
  if (status === "unauthenticated" || !session?.user?.name) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center shadow-inner animate-pulse">
            <Sprout className="w-8 h-8 text-forest-300" strokeWidth={2.5} />
          </div>
          <div className="text-forest-600 font-semibold bg-forest-50 px-6 py-2 rounded-full shadow-sm">
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto md:max-w-2xl md:mx-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
            <SettingsIcon size={20} className="text-forest-700" />
          </div>
          Settings
        </h1>
        <p className="text-slate-500 mt-2">Manage your account and app preferences</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Account Information</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-forest-500 to-forest-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
              {session.user.name[0]}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1.5"><User size={12}/> Full Name</p>
              <p className="font-semibold text-slate-800 text-lg">{session.user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1.5"><Mail size={12}/> Email Address</p>
              <p className="font-semibold text-slate-800">{session.user.email || "No email provided"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Session</h2>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors border border-red-100"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm font-medium text-red-800 mb-3 text-center">Are you sure you want to sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white text-slate-600 font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

