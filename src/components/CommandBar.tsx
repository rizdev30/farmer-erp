"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, ArrowRight } from "lucide-react";
import { searchFarmers } from "@/app/actions/farmers";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";

interface SearchResult {
  id: number;
  name: string;
  phone: string;
  district: string;
  block: string;
  farmerCode: string;
  category?: string;
}

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search — 400ms wait after user stops typing, min 2 chars
  const debouncedQuery = useDebounce(query, 400, 2);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    searchFarmers(debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data as SearchResult[]);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      const res = results[selectedIndex];
      router.push(`/dashboard/farmers/${res.category === "TRADER" ? 't' : 'f'}${res.id}`);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full max-w-md px-4 py-3 rounded-xl 
          glass-card text-slate-400 text-sm cursor-pointer
          hover:border-forest-200 transition-all duration-200"
      >
        <Search size={18} />
        <span>Search farmers...</span>
        <kbd className="hidden md:flex ml-auto px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-400 font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={() => setOpen(false)}
      />

      {/* Command Bar */}
      <div className="relative w-full max-w-lg modal-spring">
        <div className="glass rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-white/30">
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/50">
            <Search size={20} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search farmers by name, unique id, or phone..."
              className="flex-1 bg-transparent text-slate-800 placeholder:text-slate-400 
                outline-none text-base"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setSelectedIndex(0);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-5 py-8 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-forest-500/30 border-t-forest-500 rounded-full animate-spin" />
                  Searching...
                </div>
              </div>
            )}

            {!loading && results.length === 0 && query.length >= 2 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                No farmers found for &ldquo;{query}&rdquo;
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="px-5 py-6 text-center text-sm text-slate-400">
                Type at least 2 characters to search
              </div>
            )}

            {!loading &&
              results.map((farmer, i) => (
                <button
                  key={farmer.id}
                  onClick={() => {
                    router.push(`/dashboard/farmers/${farmer.category === "TRADER" ? 't' : 'f'}${farmer.id}`);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left
                    transition-colors duration-100 
                    ${i === selectedIndex ? (farmer.category === "TRADER" ? "bg-blue-50 border-l-2 border-blue-500" : "bg-forest-50 border-l-2 border-forest-500") : "hover:bg-slate-50 border-l-2 border-transparent"}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${farmer.category === "TRADER" ? "bg-blue-100 text-blue-600" : "bg-forest-100 text-forest-600"}`}>
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-2">
                      {farmer.name} 
                      {farmer.category === "TRADER" && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">Trader</span>
                      )}
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{farmer.farmerCode || "—"}</span>
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {farmer.phone} • {[farmer.district, farmer.block]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-slate-300 shrink-0"
                  />
                </button>
              ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200/50 flex items-center justify-between text-xs text-slate-400">
            <span>
              {results.length > 0
                ? `${results.length} results`
                : "Search farmers"}
            </span>
            <div className="hidden md:flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                ↑↓
              </kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                ↵
              </kbd>
              <span>select</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                esc
              </kbd>
              <span>close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
