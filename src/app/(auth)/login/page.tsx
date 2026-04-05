"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sprout, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-forest-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-forest-400 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-forest-300 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-forest-400/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Login Card */}
      <div
        className={`relative w-full max-w-md ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
      >
        <div className="glass rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/20">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-forest-500 to-forest-600 rounded-2xl flex items-center justify-center shadow-lg shadow-forest-500/30 mb-4">
              <Sprout className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-forest-900 tracking-tight">
              Farmer ERP
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Premium Procurement Management
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@farmererp.com"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white/60 
                  text-slate-800 placeholder:text-slate-400 
                  focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                  transition-all duration-200 text-base"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white/60 
                    text-slate-800 placeholder:text-slate-400 
                    focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                    transition-all duration-200 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-forest-800 to-forest-700 
                text-white font-semibold text-base
                hover:from-forest-700 hover:to-forest-600 
                focus:outline-none focus:ring-2 focus:ring-forest-500/50 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 
                shadow-lg shadow-forest-900/20 hover:shadow-xl hover:shadow-forest-900/30
                active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Contact your administrator for account access
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-20px) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
