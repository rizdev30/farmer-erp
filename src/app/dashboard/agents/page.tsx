"use client";

import { useState, useEffect } from "react";
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

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
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

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("L1_AGENT");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
          role: formRole,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormName("");
        setFormEmail("");
        setFormPassword("");
        setFormRole("L1_AGENT");
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
    setEditRole(agent.role);
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
        role: editRole,
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

  return (
    <div className="space-y-6">
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
          className="flex items-center gap-2 px-5 py-3 rounded-xl 
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
              <div className="flex items-center justify-between">
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
                    <p className="font-semibold text-slate-800">
                      {agent.name}
                    </p>
                    <p className="text-sm text-slate-500">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg
                      ${agent.role === "L4_ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : agent.role === "L3_PO_MAKER"
                        ? "bg-blue-100 text-blue-700"
                        : agent.role === "L2_APPROVAL"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-forest-100 text-forest-700"
                      }`}
                  >
                    {agent.role.replace("_", " ")}
                  </span>
                  {agent.role !== "L4_ADMIN" && (
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
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md modal-spring">
            <div className="glass rounded-3xl shadow-2xl overflow-hidden">
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

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Agent name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 outline-none focus:ring-2 focus:ring-forest-500/30
                      transition-all appearance-none"
                  >
                    <option value="L1_AGENT">Level 1 - Agent</option>
                    <option value="L2_APPROVAL">Level 2 - Approval</option>
                    <option value="L3_PO_MAKER">Level 3 - PO Maker</option>
                    <option value="L4_ADMIN">Level 4 - Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-forest-800 to-forest-700 
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
            onClick={() => setEditingAgent(null)}
          />
          <div className="relative w-full max-w-md modal-spring">
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

              <form onSubmit={handleEdit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Agent name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 outline-none focus:ring-2 focus:ring-forest-500/30
                      transition-all appearance-none"
                  >
                    <option value="L1_AGENT">Level 1 - Agent</option>
                    <option value="L2_APPROVAL">Level 2 - Approval</option>
                    <option value="L3_PO_MAKER">Level 3 - PO Maker</option>
                    <option value="L4_ADMIN">Level 4 - Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Type new password or leave blank"
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-base text-slate-800 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500
                      transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leaves as [Encrypted] if unchanged. Type to update.</p>
                </div>

                <button
                  type="submit"
                  disabled={savingEdit}
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
    </div>
  );
}
