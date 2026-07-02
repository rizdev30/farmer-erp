import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stateMap: Record<string, string> = {
  "UTTAR PRADESH": "UP", "MADHYA PRADESH": "MP", "ANDHRA PRADESH": "AP",
  "ARUNACHAL PRADESH": "AR", "ASSAM": "AS", "BIHAR": "BR", "CHHATTISGARH": "CG",
  "GOA": "GA", "GUJARAT": "GJ", "HARYANA": "HR", "HIMACHAL PRADESH": "HP",
  "JHARKHAND": "JH", "KARNATAKA": "KA", "KERALA": "KL", "MAHARASHTRA": "MH",
  "MANIPUR": "MN", "MEGHALAYA": "ML", "MIZORAM": "MZ", "NAGALAND": "NL",
  "ODISHA": "OD", "PUNJAB": "PB", "RAJASTHAN": "RJ", "SIKKIM": "SK",
  "TAMIL NADU": "TN", "TELANGANA": "TG", "TRIPURA": "TR", "UTTARAKHAND": "UK",
  "WEST BENGAL": "WB", "ANDAMAN AND NICOBAR ISLANDS": "AN", "CHANDIGARH": "CH",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DH", "DELHI": "DL",
  "JAMMU AND KASHMIR": "JK", "JAMMU": "JK", "LADAKH": "LA", "LAKSHADWEEP": "LD",
  "PUDUCHERRY": "PY"
};

function getPrefix(state?: string): string {
  if (!state) return "FE";
  const upper = state.trim().toUpperCase();
  if (stateMap[upper]) {
    return stateMap[upper];
  }
  return upper.slice(0, 2) || "FE";
}

async function main() {
  console.log("Starting slipId migration...");
  const procurements = await prisma.procurement.findMany({
    where: { slipId: { startsWith: "FE-" } },
    include: { farmer: true }
  });
  
  console.log(`Found ${procurements.length} procurements with FE- prefix.`);
  
  let successCount = 0;
  
  for (const proc of procurements) {
    const state = proc.farmer?.state;
    const correctPrefix = getPrefix(state);
    
    if (correctPrefix !== "FE") {
      const newSlipId = proc.slipId.replace("FE-", `${correctPrefix}-`);
      try {
        await prisma.procurement.update({
          where: { id: proc.id },
          data: { slipId: newSlipId }
        });
        console.log(`Updated ${proc.slipId} -> ${newSlipId}`);
        successCount++;
      } catch (err) {
        console.error(`Failed to update ${proc.slipId}:`, err);
      }
    } else {
      console.log(`Skipped ${proc.slipId}, state resolved to FE (state: ${state})`);
    }
  }
  
  console.log(`Migration complete! Successfully updated ${successCount} records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
