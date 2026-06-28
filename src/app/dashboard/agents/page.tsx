"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  UserCog,
  Plus,
  X,
  Loader2,
  Shield,
  ToggleLeft,
  ToggleRight,
  Edit,
  RefreshCw,
} from "lucide-react";
import { useSWRCache, invalidateCache } from "@/lib/swr-cache";
import { getMandis } from "@/app/actions/mandis";

interface Agent {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isSuperAdmin: boolean;
  assignedStates: string[];
  assignedMandis: string[];
  active: boolean;
  createdAt: string;
}

const AVAILABLE_ROLES = ["L1_AGENT", "L2_APPROVAL", "L3_PO_MAKER", "L4_ADMIN"];

function MultiSelectCombobox({
  options,
  selectedValues,
  onChange,
  placeholder
}: {
  options: string[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-forest-500/30 focus-within:border-forest-500 transition-all"
        onClick={() => setIsOpen(true)}
      >
        {selectedValues.map(val => (
           <span key={val} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium break-all">
             {val}
             <button type="button" onClick={(e) => { e.stopPropagation(); toggleOption(val); }} className="hover:text-indigo-900 shrink-0">
               <X size={12} />
             </button>
           </span>
        ))}
        <input 
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedValues.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">No results found</div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = selectedValues.includes(opt);
              return (
                <div 
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between
                    ${isSelected ? "bg-indigo-50 text-indigo-700 font-medium" : "hover:bg-slate-50 text-slate-700"}`}
                >
                  <span className="truncate pr-2">{opt}</span>
                  {isSelected && <span className="text-indigo-600 shrink-0">✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const {
    data: agents = [],
    isLoading: loading,
    isValidating,
    refetch: fetchAgents,
  } = useSWRCache<Agent[]>(
    "agents-list",
    async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return await res.json();
    },
    { ttl: 60000 }
  );

  const { data: mandis = [] } = useSWRCache<any[]>("mandis-list", async () => {
    return await getMandis();
  }, { ttl: 300000 });

  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    mandis.forEach(m => states.add(m.state));
    return ["ALL", ...Array.from(states).sort()];
  }, [mandis]);

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>(["L1_AGENT"]);
  const [formIsSuperAdmin, setFormIsSuperAdmin] = useState(false);
  const [formAssignedStates, setFormAssignedStates] = useState<string[]>([]);
  const [formAssignedMandis, setFormAssignedMandis] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editAssignedStates, setEditAssignedStates] = useState<string[]>([]);
  const [editAssignedMandis, setEditAssignedMandis] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Super Admin Confirmation State
  const [showSuperAdminConfirm, setShowSuperAdminConfirm] = useState(false);
  const [superAdminConfirmWord, setSuperAdminConfirmWord] = useState("");
  const [superAdminConfirmInput, setSuperAdminConfirmInput] = useState("");
  const [superAdminTargetState, setSuperAdminTargetState] = useState<"form" | "edit">("form");

  const handleSuperAdminToggle = (checked: boolean, target: "form" | "edit") => {
    if (checked) {
      setSuperAdminConfirmWord(Math.random().toString(36).substring(2, 8).toUpperCase());
      setSuperAdminConfirmInput("");
      setSuperAdminTargetState(target);
      setShowSuperAdminConfirm(true);
    } else {
      if (target === "form") setFormIsSuperAdmin(false);
      if (target === "edit") setEditIsSuperAdmin(false);
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          roles: formRoles,
          isSuperAdmin: formIsSuperAdmin,
          assignedStates: formAssignedStates,
          assignedMandis: formAssignedMandis,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormName("");
        setFormEmail("");
        setFormPassword("");
        setFormRoles(["L1_AGENT"]);
        setFormIsSuperAdmin(false);
        setFormAssignedStates([]);
        setFormAssignedMandis([]);
        invalidateCache("agents-list");
        fetchAgents();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create agent");
      }
    } catch {
      setError("Failed to create agent");
    }
    setCreating(false);
  }

  function openEditModal(agent: Agent) {
    setEditingAgent(agent);
    setEditName(agent.name);
    setEditEmail(agent.email);
    setEditRoles(agent.roles || []);
    setEditIsSuperAdmin(agent.isSuperAdmin || false);
    setEditAssignedStates(agent.assignedStates || []);
    setEditAssignedMandis(agent.assignedMandis || []);
    setEditPassword("");
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAgent) return;
    setSavingEdit(true);
    setError("");

    try {
      const body: any = {
        name: editName,
        email: editEmail,
        roles: editRoles,
        isSuperAdmin: editIsSuperAdmin,
        assignedStates: editAssignedStates,
        assignedMandis: editAssignedMandis,
      };
      if (editPassword) {
        body.password = editPassword;
      }

      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingAgent(null);
        invalidateCache("agents-list");
        fetchAgents();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update agent");
      }
    } catch {
      setError("Failed to update agent");
    }
    setSavingEdit(false);
  }

  async function toggleAgent(id: string, active: boolean) {
    try {
      await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      invalidateCache("agents-list");
      fetchAgents();
    } catch {
      console.error("Failed to toggle agent");
    }
  }

  const toggleRole = (roles: string[], setRoles: (r: string[]) => void, role: string) => {
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Agent Management
            </h1>
            <p className="text-slate-500 mt-0.5 flex items-center gap-2">
              {agents.length} agents registered
              {isValidating && (
                <RefreshCw size={12} className="animate-spin text-purple-500" />
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl 
            bg-gradient-to-r from-forest-800 to-forest-700 text-white text-sm font-semibold
            hover:from-forest-700 hover:to-forest-600 
            shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          Create Agent
        </button>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton w-40 h-4" />
                  <div className="skeleton w-28 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                      ${agent.active
                        ? "bg-gradient-to-br from-forest-100 to-forest-200 text-forest-700"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {agent.name?.[0] || "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {agent.name}
                      </p>
                      {agent.isSuperAdmin && (
                         <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                          Super Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 break-all">{agent.email}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {agent.roles?.map(r => (
                    <span
                      key={r}
                      className={`text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-lg shrink-0
                        ${r === "L4_ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : r === "L3_PO_MAKER"
                          ? "bg-blue-100 text-blue-700"
                          : r === "L2_APPROVAL"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-forest-100 text-forest-700"
                        }`}
                    >
                      {r.replace("_", " ")}
                    </span>
                  ))}
                  
                  <div className="ml-0 sm:ml-2 flex items-center gap-2 shrink-0">
                    {!agent.roles?.includes("L4_ADMIN") && !agent.isSuperAdmin && (
                      <button
                        onClick={() => toggleAgent(agent.id, agent.active)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title={agent.active ? "Deactivate" : "Activate"}
                      >
                        {agent.active ? (
                          <ToggleRight
                            size={24}
                            className="text-forest-500"
                          />
                        ) : (
                          <ToggleLeft size={24} className="text-slate-300" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(agent)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                      title="Edit Agent"
                    >
                      <Edit size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Assignment info */}
              {(agent.assignedStates?.length > 0 || agent.assignedMandis?.length > 0) && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2 text-[11px] sm:text-xs text-slate-500">
                  {agent.assignedStates?.length > 0 && (
                    <p><span className="font-semibold text-slate-600">States:</span> {agent.assignedStates.join(", ")}</p>
                  )}
                  {agent.assignedMandis?.length > 0 && (
                    <p><span className="font-semibold text-slate-600">Mandis:</span> {agent.assignedMandis.join(", ")}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg modal-spring my-8">
            <div className="glass rounded-3xl shadow-2xl overflow-hidden bg-white">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <UserCog size={20} className="text-forest-600" />
                  <h2 className="text-lg font-bold text-slate-800">
                    Create New Agent
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      placeholder="Agent name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                        text-sm text-slate-800 placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                        transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                      placeholder="agent@farmererp.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                        text-sm text-slate-800 placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                        transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                      text-sm text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Roles (Multiple selectable)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formRoles.includes(role)} 
                          onChange={() => toggleRole(formRoles, setFormRoles, role)} 
                          className="w-4 h-4 text-forest-600 rounded border-slate-300 focus:ring-forest-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{role.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Assigned States
                    </label>
                    <MultiSelectCombobox 
                      options={stateOptions}
                      selectedValues={formAssignedStates}
                      onChange={setFormAssignedStates}
                      placeholder="Search and select states..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Assigned Mandis
                    </label>
                    <MultiSelectCombobox 
                      options={useMemo(() => {
                        const names = new Set<string>();
                        const isAllStates = formAssignedStates.includes("ALL");
                        mandis.forEach(m => {
                          if (isAllStates || formAssignedStates.length === 0 || formAssignedStates.includes(m.state)) {
                            names.add(m.mandiName);
                          }
                        });
                        return ["ALL", ...Array.from(names).sort()];
                      }, [mandis, formAssignedStates])}
                      selectedValues={formAssignedMandis}
                      onChange={setFormAssignedMandis}
                      placeholder="Search and select mandis..."
                    />
                  </div>
                </div>
                
                <label className="flex items-center gap-2 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    checked={formIsSuperAdmin} 
                    onChange={(e) => handleSuperAdminToggle(e.target.checked, "form")} 
                    className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 shrink-0"
                  />
                  <span className="text-sm font-bold">Grant Super Admin Access</span>
                </label>

                <button
                  type="submit"
                  disabled={creating || formRoles.length === 0}
                  className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-forest-800 to-forest-700 
                    text-white font-semibold text-sm
                    hover:from-forest-700 hover:to-forest-600 
                    disabled:opacity-50 transition-all shadow-sm"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                       <Loader2 size={16} className="animate-spin" />
                       Creating...
                    </span>
                  ) : (
                    "Create Agent Account"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
            onClick={() => setEditingAgent(null)}
          />
          <div className="relative w-full max-w-lg modal-spring my-8">
            <div className="glass rounded-3xl shadow-2xl overflow-hidden bg-white">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <Edit size={20} className="text-forest-600" />
                  <h2 className="text-lg font-bold text-slate-800">
                    Edit Agent Details
                  </h2>
                </div>
                <button
                  onClick={() => setEditingAgent(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      placeholder="Agent name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                        text-sm text-slate-800 placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                        transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      placeholder="agent@farmererp.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                        text-sm text-slate-800 placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                        transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Roles (Multiple selectable)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editRoles.includes(role)} 
                          onChange={() => toggleRole(editRoles, setEditRoles, role)} 
                          className="w-4 h-4 text-forest-600 rounded border-slate-300 focus:ring-forest-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{role.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Assigned States
                    </label>
                    <MultiSelectCombobox 
                      options={stateOptions}
                      selectedValues={editAssignedStates}
                      onChange={setEditAssignedStates}
                      placeholder="Search and select states..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Assigned Mandis
                    </label>
                    <MultiSelectCombobox 
                      options={useMemo(() => {
                        const names = new Set<string>();
                        const isAllStates = editAssignedStates.includes("ALL");
                        mandis.forEach(m => {
                          if (isAllStates || editAssignedStates.length === 0 || editAssignedStates.includes(m.state)) {
                            names.add(m.mandiName);
                          }
                        });
                        return ["ALL", ...Array.from(names).sort()];
                      }, [mandis, editAssignedStates])}
                      selectedValues={editAssignedMandis}
                      onChange={setEditAssignedMandis}
                      placeholder="Search and select mandis..."
                    />
                  </div>
                </div>
                
                <label className="flex items-center gap-2 p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    checked={editIsSuperAdmin} 
                    onChange={(e) => handleSuperAdminToggle(e.target.checked, "edit")} 
                    className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 shrink-0"
                  />
                  <span className="text-sm font-bold">Grant Super Admin Access</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 mt-2">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Type new password or leave blank"
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 
                      text-sm text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leaves as [Encrypted] if unchanged.</p>
                </div>

                <button
                  type="submit"
                  disabled={savingEdit || editRoles.length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-forest-800 to-forest-700 
                    text-white font-semibold text-sm
                    hover:from-forest-700 hover:to-forest-600 
                    disabled:opacity-50 transition-all shadow-sm mt-4"
                >
                  {savingEdit ? (
                    <span className="flex items-center justify-center gap-2">
                       <Loader2 size={16} className="animate-spin" />
                       Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Confirmation Modal */}
      {showSuperAdminConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuperAdminConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl modal-spring overflow-hidden">
            <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
              <Shield size={20} />
              Warning: Super Admin
            </h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              You are about to grant Super Admin access. This gives the user <span className="font-bold text-red-600">complete control</span> over the system, including deleting data and managing other admins.
            </p>
            <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">Type the exact code below to confirm</p>
            <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-center font-mono font-black tracking-[0.25em] text-2xl mb-5 select-none shadow-inner relative overflow-hidden">
              {superAdminConfirmWord}
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
            </div>
            <input
              type="text"
              value={superAdminConfirmInput}
              onChange={(e) => setSuperAdminConfirmInput(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="w-full px-4 py-3.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:ring-0 focus:border-red-500 mb-6 font-mono text-center tracking-widest outline-none transition-all uppercase placeholder:tracking-normal placeholder:text-slate-300 text-lg font-bold text-slate-800"
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSuperAdminConfirm(false)} 
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (superAdminConfirmInput === superAdminConfirmWord) {
                    if (superAdminTargetState === "form") setFormIsSuperAdmin(true);
                    if (superAdminTargetState === "edit") setEditIsSuperAdmin(true);
                    setShowSuperAdminConfirm(false);
                  }
                }}
                disabled={superAdminConfirmInput !== superAdminConfirmWord}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                Confirm Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
