"use client";

import { Bluetooth, Printer, X, ShieldCheck, Globe, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPrinting?: boolean;
}

export default function BluetoothPairingModal({ isOpen, onClose, onConfirm, isPrinting }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm relative">
          <Bluetooth size={32} className="animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-forest-600 text-white rounded-full flex items-center justify-center text-xs">
            <Printer size={12} />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Bluetooth Printer Connection
        </h3>
        <p className="text-xs text-forest-700 font-semibold mb-4 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-forest-600" />
          Farmer ERP Secure Pair
        </p>

        {/* Instructions Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 mb-3 border border-slate-100 text-left space-y-2">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            Pair with your <strong>58mm Bluetooth Thermal Printer</strong> for instant receipt printing.
          </p>
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <CheckCircle2 size={13} className="text-forest-600 shrink-0" />
              <span>Ensure thermal printer is turned <strong>ON</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <CheckCircle2 size={13} className="text-forest-600 shrink-0" />
              <span>Turn on <strong>Bluetooth</strong> on your phone</span>
            </div>
          </div>
        </div>

        {/* Premium Browser Notice Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 rounded-2xl p-3.5 mb-5 border border-blue-100 text-left relative overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Globe size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-950 flex items-center gap-1">
                Chrome & Edge Only
              </p>
              <p className="text-[11px] text-blue-800/90 mt-0.5 leading-snug font-medium">
                Web Bluetooth is only supported on <strong>Google Chrome</strong> and <strong>Microsoft Edge</strong>. If you are using another browser, please switch to Chrome.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            disabled={isPrinting}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Bluetooth size={14} />
            Pair & Print
          </button>
        </div>
      </div>
    </div>
  );
}
