"use server";

import dolibarr from "@/lib/dolibarr";
import prisma from "@/lib/prisma";

async function generateFarmerCode(): Promise<string> {
  const now = new Date();
  
  // YY: Year
  const yearStr = now.getFullYear().toString().slice(-2);
  
  // MM: Month
  const monthStr = (now.getMonth() + 1).toString().padStart(2, "0");
  
  // W: Week of month (1 to 5)
  const weekNum = Math.ceil(now.getDate() / 7);
  const weekStr = weekNum.toString();
  
  // NNN: sequence from DB
  const monthKey = `${yearStr}${monthStr}`;
  
  const seq = await prisma.farmerSequence.upsert({
    where: { monthKey },
    create: { monthKey, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });

  const nnnStr = seq.lastSeq.toString().padStart(3, "0");
  
  return `${yearStr}${monthStr}${weekStr}${nnnStr}`;
}

export async function searchFarmers(query: string) {
  if (!query || query.length < 2) return [];

  const results = await dolibarr.searchThirdParties(query);
  return results.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone || "",
    address: f.address || "",
    town: f.town || "",
    district: f.array_options?.options_district || "",
    block: f.array_options?.options_block || "",
    fatherName: f.array_options?.options_father_name || "",
    farmerCode: f.array_options?.options_farmer_code || "",
    village: f.array_options?.options_village || "",
  }));
}

export async function getFarmers(filters?: {
  district?: string;
  block?: string;
  page?: number;
}) {
  const params: Record<string, string> = {
    limit: "50",
    sortfield: "t.nom",
    sortorder: "ASC",
  };

  const sqlParts: string[] = [];
  if (filters?.district) {
    sqlParts.push(
      `(t.array_options->>'options_district':like:'%${filters.district}%')`
    );
  }
  if (filters?.block) {
    sqlParts.push(
      `(t.array_options->>'options_block':like:'%${filters.block}%')`
    );
  }
  if (sqlParts.length > 0) {
    params.sqlfilters = sqlParts.join(" AND ");
  }
  if (filters?.page) {
    params.page = String(filters.page);
  }

  const results = await dolibarr.getThirdParties(params);
  return results.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone || "",
    address: f.address || "",
    town: f.town || "",
    district: f.array_options?.options_district || "",
    block: f.array_options?.options_block || "",
    fatherName: f.array_options?.options_father_name || "",
    farmerCode: f.array_options?.options_farmer_code || "",
    village: f.array_options?.options_village || "",
  }));
}

export async function getFarmerById(id: number) {
  const f = await dolibarr.getThirdParty(id);
  return {
    id: f.id,
    name: f.name,
    phone: f.phone || "",
    address: f.address || "",
    town: f.town || "",
    district: f.array_options?.options_district || "",
    block: f.array_options?.options_block || "",
    fatherName: f.array_options?.options_father_name || "",
    farmerCode: f.array_options?.options_farmer_code || "",
    village: f.array_options?.options_village || "",
  };
}

export async function registerFarmer(data: {
  name: string;
  phone: string;
  address: string;
  town?: string;
  district: string;
  block: string;
  fatherName: string;
  village: string;
  farmerCode?: string; // Optional: If not provided, we generate it
}) {
  const code = data.farmerCode || await generateFarmerCode();

  const newId = await dolibarr.createThirdParty({
    name: data.name,
    phone: data.phone,
    address: data.address,
    town: data.town || data.village,
    district: data.district,
    block: data.block,
    fatherName: data.fatherName,
    farmerCode: code,
    village: data.village,
  });

  return {
    success: true,
    id: newId,
    farmer: {
      id: newId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      town: data.town || data.village,
      district: data.district,
      block: data.block,
      fatherName: data.fatherName,
      farmerCode: code,
      village: data.village,
    },
  };
}
