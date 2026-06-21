"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronRight, ChevronLeft, User, MapPin, Shield } from "lucide-react";
import { registerFarmer } from "@/app/actions/farmers";
import { getAgentsList } from "@/app/actions/procurement";
import { useSession } from "next-auth/react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (farmer: {
    id: number;
    name: string;
    phone: string;
    address: string;
    village: string;
    district: string;
    block: string;
    fatherName: string;
    farmerCode: string;
  }) => void;
}

export default function FarmerRegistrationModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  // Fetch agents if admin
  useEffect(() => {
    if (isAdmin && open) {
      getAgentsList().then(setAgents).catch(console.error);
    }
  }, [isAdmin, open]);

  // Form data
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");

  function reset() {
    setStep(1);
    setName("");
    setFatherName("");
    setPhone("");
    setAddress("");
    setVillage("");
    setDistrict("");
    setBlock("");
    setSelectedAgentId("");
    setError("");
    setLoading(false);
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const result = await registerFarmer({
        name,
        fatherName,
        phone,
        address,
        village,
        district,
        block,
        agentId: selectedAgentId || undefined,
      });

      if (result.success) {
        onSuccess(result.farmer as {
          id: number;
          name: string;
          phone: string;
          address: string;
          village: string;
          district: string;
          block: string;
          fatherName: string;
          farmerCode: string;
        });
        reset();
        onClose();
      }
    } catch {
      setError("Failed to register farmer. Please try again.");
    }

    setLoading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-fade"
        onClick={() => {
          reset();
          onClose();
        }}
      />

      <div className="relative w-full max-w-lg modal-spring">
        <div className="glass rounded-3xl shadow-2xl shadow-black/15 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Register New Farmer
              </h2>
              <p className="text-sm text-slate-500">
                Step {step} of 2 —{" "}
                {step === 1 ? "Identity" : "Location"}
              </p>
            </div>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= 1 ? "bg-forest-500" : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= 2 ? "bg-forest-500" : "bg-slate-200"
                }`}
              />
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 flex items-center justify-center">
                    <User size={18} className="text-forest-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Farmer Identity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter farmer's full name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all duration-200 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Father&apos;s Name *
                  </label>
                  <input
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Enter father's name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all duration-200 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all duration-200 text-base"
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Shield size={14} className="text-purple-600" />
                      Assign to Agent (Admin Only)
                    </label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-500/30 
                        focus:border-forest-500 transition-all duration-200 text-base appearance-none"
                    >
                      <option value="">Assign to myself</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <MapPin size={18} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Location Details
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Village / Street address"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all duration-200 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Village *
                    </label>
                    <input
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="Village name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                        transition-all duration-200 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      District *
                    </label>
                    <input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="District"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                        text-slate-800 placeholder:text-slate-400 
                        focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                        transition-all duration-200 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Block *
                  </label>
                  <input
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Block / Tehsil"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/60 
                      text-slate-800 placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 
                      transition-all duration-200 text-base"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-6">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium 
                  text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                onClick={() => {
                  if (!name.trim() || !fatherName.trim() || !phone.trim()) {
                    setError("Name, Father's Name, and Phone are required");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold 
                  bg-forest-800 text-white hover:bg-forest-700 
                  transition-colors shadow-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !village.trim() || !district.trim() || !block.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold 
                  bg-gradient-to-r from-forest-800 to-forest-700 text-white 
                  hover:from-forest-700 hover:to-forest-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Farmer"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
