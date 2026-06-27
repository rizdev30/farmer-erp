"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFarmerById } from "@/app/actions/farmers";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Home,
  Building2,
  Map,
  Landmark,
  CreditCard,
  Hash,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { useSWRCache } from "@/lib/swr-cache";

interface FarmerProfile {
  id: number;
  name: string;
  phone: string;
  address: string;
  town: string;
  district: string;
  block: string;
  fatherName: string;
  farmerCode: string;
  village: string;
  registeredByName: string;
  createdByAdmin?: boolean;
  createdAt: string;
  category: string;
  gender: string;
  pinCode: string;
  projectName: string;
  state?: string;
  panGst?: string;
  company?: string;
  promoterName?: string;
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
}

export default function FarmerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const {
    data: farmer,
    isLoading: loading,
    error: swrError,
  } = useSWRCache<FarmerProfile>(
    isNaN(id) ? null : `farmer-${id}`,
    async () => {
      const data = await getFarmerById(id);
      return data as FarmerProfile;
    },
    { ttl: 60000 }
  );

  const error = isNaN(id) ? "Invalid farmer ID" : swrError?.message || "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-forest-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
          <User className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Profile Not Available</h2>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => router.push("/dashboard/farmers")}
          className="mt-4 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back navigation */}
      <Link
        href="/dashboard/farmers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Directory
      </Link>

      {/* Main Profile Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        {/* Background Decoration */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${farmer.category === "TRADER" ? "from-blue-100/50" : "from-forest-100/50"} to-transparent rounded-bl-full -z-10`} />
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Avatar & Core Identity */}
          <div className="flex flex-col items-center text-center shrink-0 w-full md:w-auto">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-xl mb-4 ${farmer.category === "TRADER" ? "from-blue-500 to-blue-600 shadow-blue-500/30" : "from-forest-500 to-forest-600 shadow-forest-500/30"}`}>
              <span className="text-4xl font-bold">{farmer.name[0]}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{farmer.name}</h1>
              {farmer.category === "TRADER" ? (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Trader</span>
              ) : (
                <span className="text-[10px] bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Farmer</span>
              )}
            </div>
            {farmer.fatherName && (
              <p className="text-sm text-slate-500 mt-1">S/o {farmer.fatherName}</p>
            )}
            {farmer.gender && (
              <p className="text-xs text-slate-400 mt-0.5">{farmer.gender}</p>
            )}
            
            <div className="mt-4 inline-flex flex-col items-center justify-center bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{farmer.category === "TRADER" ? "Trader Code" : "Farmer Code"}</span>
              <span className={`font-mono font-bold text-lg tracking-widest ${farmer.category === "TRADER" ? "text-blue-700" : "text-forest-700"}`}>{farmer.farmerCode}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Contact Details</h3>
              
              {farmer.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-800">{farmer.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Registration Date</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(farmer.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Registered By</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{farmer.registeredByName || "Unknown Agent"}</p>
                    {farmer.createdByAdmin && (
                      <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Saved by Admin</span>
                    )}
                  </div>
                </div>
              </div>
              
              {farmer.projectName && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <User size={14} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Project Name</p>
                    <p className="text-sm font-semibold text-slate-800">{farmer.projectName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Location Details</h3>
              
              {(farmer.village || farmer.address) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <Home size={14} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Village / Address</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {farmer.village}
                      {farmer.address && farmer.address !== farmer.village ? `${farmer.village ? ", " : ""}${farmer.address}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {farmer.block && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Map size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Block / Taluka</p>
                    <p className="text-sm font-semibold text-slate-800">{farmer.block}</p>
                  </div>
                </div>
              )}

              {farmer.district && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-pink-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">District</p>
                    <p className="text-sm font-semibold text-slate-800">{farmer.district}</p>
                  </div>
                </div>
              )}

              {farmer.pinCode && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Pin Code</p>
                    <p className="text-sm font-semibold text-slate-800">{farmer.pinCode}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Business & Bank Details (Row 2) */}
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pt-6 border-t border-slate-100">
              
              {/* Business / Trader Details */}
              {(farmer.company || farmer.panGst || farmer.promoterName) && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Business Details</h3>
                  
                  {farmer.company && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Briefcase size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Company Name</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.company}</p>
                      </div>
                    </div>
                  )}

                  {farmer.promoterName && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <User size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Promoter Name</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.promoterName}</p>
                      </div>
                    </div>
                  )}

                  {farmer.panGst && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <ShieldCheck size={14} className="text-slate-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">PAN / GST Number</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.panGst}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Details */}
              {(farmer.bankName || farmer.accountNumber || farmer.ifscCode) && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Bank Details</h3>
                  
                  {farmer.bankName && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <Landmark size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Bank Name</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.bankName}</p>
                      </div>
                    </div>
                  )}

                  {farmer.accountNumber && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                        <CreditCard size={14} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Account Number</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.accountNumber}</p>
                      </div>
                    </div>
                  )}

                  {farmer.ifscCode && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                        <Hash size={14} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">IFSC Code</p>
                        <p className="text-sm font-semibold text-slate-800">{farmer.ifscCode}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
