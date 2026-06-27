// Shared crop variety list — safe to import in both client and server components
export const CROP_VARIETIES = [
  "PB-1",
  "Pusa-1121",
  "Non Basmati",
  "Sarbati",
  "T.Basmati",
  "Type-3",
] as const;

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
