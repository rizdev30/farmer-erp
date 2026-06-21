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
  Map
} from "lucide-react";
import Link from "next/link";

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
}

export default function FarmerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNaN(id)) {
      setError("Invalid farmer ID");
      setLoading(false);
      return;
    }

    async function loadProfile() {
      try {
        const data = await getFarmerById(id);
        setFarmer(data as FarmerProfile);
      } catch (err: any) {
        setError(err.message || "Failed to load farmer profile");
      }
      setLoading(false);
    }

    loadProfile();
  }, [id]);

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
        Back to Farmers List
      </Link>

      {/* Main Profile Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-forest-100/50 to-transparent rounded-bl-full -z-10" />
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Avatar & Core Identity */}
          <div className="flex flex-col items-center text-center shrink-0 w-full md:w-auto">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-forest-500 to-forest-600 flex items-center justify-center text-white shadow-xl shadow-forest-500/30 mb-4">
              <span className="text-4xl font-bold">{farmer.name[0]}</span>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{farmer.name}</h1>
            {farmer.fatherName && (
              <p className="text-sm text-slate-500 mt-1">S/o {farmer.fatherName}</p>
            )}
            
            <div className="mt-4 inline-flex flex-col items-center justify-center bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Farmer Code</span>
              <span className="font-mono font-bold text-forest-700 text-lg tracking-widest">{farmer.farmerCode}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Contact Details</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Phone Number</p>
                  <p className="text-sm font-semibold text-slate-800">{farmer.phone || "Not provided"}</p>
                </div>
              </div>

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
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Location Details</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <Home size={14} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Village / Address</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {farmer.village}
                    {farmer.address && farmer.address !== farmer.village ? `, ${farmer.address}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Map size={14} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Block / Tehsil</p>
                  <p className="text-sm font-semibold text-slate-800">{farmer.block}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-pink-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">District</p>
                  <p className="text-sm font-semibold text-slate-800">{farmer.district}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
