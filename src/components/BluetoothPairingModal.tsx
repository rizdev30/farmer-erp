"use client";

import { Bluetooth, Printer, X, ShieldCheck } from "lucide-react";

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
        <p className="text-xs text-forest-700 font-semibold mb-3 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-forest-600" />
          Farmer ERP Request
        </p>

        <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100 text-left space-y-2">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            Farmer ERP wants to pair with your <strong>58mm Bluetooth Thermal Printer</strong> for instant wireless receipt printing.
          </p>
          <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside pt-1">
            <li>Ensure printer is turned <strong>ON</strong></li>
            <li>Enable Bluetooth on your mobile phone</li>
          </ul>
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
