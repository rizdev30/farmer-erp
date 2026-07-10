// Shared crop variety list — safe to import in both client and server components

export const CROP_TYPES = ["Basmati Paddy", "Non-Basmati Paddy"] as const;

export const BASMATI_VARIETIES = [
  "Pusa Basmati 1121",
  "Pusa Basmati 1509",
  "Pusa Basmati 1718",
  "Pusa Basmati 1847",
  "Pusa Basmati 1885",
  "Pusa Basmati 1886",
  "Taraori Basmati (HBC 19)",
  "Dehraduni Basmati (Type 3)",
  "Basmati 370",
  "Basmati CSR 30",
  "Punjab Basmati 1",
  "Punjab Basmati 7",
  "Haryana Basmati 1",
  "Kasturi Basmati",
  "Mahi Sugandha",
  "Pant Basmati 1",
  "Ranbir Basmati",
  "Basmati 386",
  "Pusa Basmati 1",
  "Vallabh Basmati 22"
] as const;

export const NON_BASMATI_VARIETIES = [
  "IR 64",
  "Sona Masoori",
  "Swarna (MTU 7029)",
  "Ponni Rice",
  "Jaya",
  "MTU 1010",
  "Gobindobhog",
  "Kalanamak",
  "Kolam Rice",
  "Jeera Samba",
  "Matta Rice",
  "Ambemohar",
  "Sharbati",
  "Sugandha",
  "IR 8",
  "PR 126",
  "Samba Mahsuri (BPT 5204)",
  "HMT Rice",
  "Joha Rice",
  "Kranti"
] as const;

export const CROP_VARIETIES = [...BASMATI_VARIETIES, ...NON_BASMATI_VARIETIES] as const;

export type CropVariety = (typeof CROP_VARIETIES)[number];

export interface VarietyStat {
  variety: string;
  bags: number;
  weightQtl: string;
  value: string;
  avgCost: string;
}

export interface DashboardStats {
  totalPurchase: number;
  todayProcurements: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  totalPurchaseQtl: string;
  todaysPurchaseQtl: string;
  todaysAveragePrice: string;
  totalBags: number;
  todaysBags: number;
  totalAveragePrice: string;
  todaysValue?: string;
  totalValue?: string;
  todaysTotalSlips?: number;
  todaysApprovedSlips?: number;
  todaysPendingSlips?: number;
  todaysCancelSlips?: number;
  totalApprovedSlips?: number;
  totalPendingSlips?: number;
  totalCancelSlips?: number;
}

export interface VarietyRecord {
  id: number;
  slipId: string;
  farmerName: string;
  farmerCode: string;
  village: string;
  bags: number;
  weightQtl: number;
  rate: number;
  total: number;
  status: string;
  agentName: string;
  createdAt: string;
}

export interface SlipRecord {
  id: number;
  slipId: string;
  farmerName: string;
  farmerCode: string;
  village: string;
  crop: string;
  variety: string;
  bags: number;
  weightQtl: number;
  rate: number;
  total: number;
  status: string;
  agentName: string;
  createdAt: string;
}

export interface SlipStats {
  total: number;
  approved: number;
  awaiting: number;
  cancelled: number;
  totalBags: number;
  totalWeightQtl: string;
  totalValue: string;
}

// Helpers for classifying variety category
export function isBasmatiVariety(variety: string): boolean {
  if (!variety) return false;
  const v = variety.toLowerCase().trim();
  const oldBasmati = ["pb-1", "pusa-1121", "t.basmati", "type-3", "basmati", "sarbati"];
  if (oldBasmati.includes(v)) return true;
  return BASMATI_VARIETIES.some(bv => bv.toLowerCase().trim() === v);
}

export function isNonBasmatiVariety(variety: string): boolean {
  if (!variety) return false;
  const v = variety.toLowerCase().trim();
  const oldNonBasmati = ["non basmati"];
  if (oldNonBasmati.includes(v)) return true;
  return NON_BASMATI_VARIETIES.some(nbv => nbv.toLowerCase().trim() === v);
}
