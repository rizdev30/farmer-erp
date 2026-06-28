"use server";

import prisma from "@/lib/prisma";
import { generateFarmerCode, getSessionUser } from "./farmers";

export async function registerTrader(data: {
  name: string;
  fatherName?: string;
  phone: string;
  address: string;
  town?: string;
  district: string;
  block: string;
  village: string;
  gender?: string;
  pinCode?: string;

  projectName?: string;
  state?: string;
  panGst?: string;
  company?: string;
  promoterName?: string;
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
  traderCode?: string;
  agentId?: string;
}) {
  let user;
  try {
    user = await getSessionUser();
  } catch (e) {
    return { success: false, error: "Not authenticated" };
  }

  // Role authorization check (only L1 agents can register traders)
  if (!user.roles.includes("L1_AGENT")) {
    return { success: false, error: "Only L1 agents are authorized to register traders" };
  }

  // Input Validation
  if (!data.name || typeof data.name !== "string" || !data.name.trim() || data.name.length > 100) {
    return { success: false, error: "Invalid name (must be 1-100 characters)" };
  }
  if (!data.phone || typeof data.phone !== "string" || !/^\+?[0-9]{10,15}$/.test(data.phone.trim())) {
    return { success: false, error: "Invalid phone number (must be 10-15 digits)" };
  }
  if (!data.address || typeof data.address !== "string" || !data.address.trim() || data.address.length > 500) {
    return { success: false, error: "Invalid address (must be 1-500 characters)" };
  }
  if (!data.district || typeof data.district !== "string" || !data.district.trim() || data.district.length > 100) {
    return { success: false, error: "Invalid district (must be 1-100 characters)" };
  }
  if (!data.block || typeof data.block !== "string" || !data.block.trim() || data.block.length > 100) {
    return { success: false, error: "Invalid block (must be 1-100 characters)" };
  }
  if (!data.village || typeof data.village !== "string" || !data.village.trim() || data.village.length > 100) {
    return { success: false, error: "Invalid village (must be 1-100 characters)" };
  }

  // Optional string fields length limits to prevent buffer/DB size attack
  if (data.fatherName && data.fatherName.length > 100) return { success: false, error: "Father's name is too long" };
  if (data.town && data.town.length > 100) return { success: false, error: "Town is too long" };
  if (data.state && data.state.length > 100) return { success: false, error: "State is too long" };
  if (data.gender && data.gender.length > 20) return { success: false, error: "Gender is too long" };
  if (data.pinCode && data.pinCode.length > 10) return { success: false, error: "Pin code is too long" };
  if (data.projectName && data.projectName.length > 100) return { success: false, error: "Project name is too long" };
  if (data.panGst && data.panGst.length > 30) return { success: false, error: "PAN/GST is too long" };
  if (data.company && data.company.length > 100) return { success: false, error: "Company name is too long" };
  if (data.promoterName && data.promoterName.length > 100) return { success: false, error: "Promoter name is too long" };
  if (data.bankName && data.bankName.length > 100) return { success: false, error: "Bank name is too long" };
  if (data.ifscCode && data.ifscCode.length > 20) return { success: false, error: "IFSC code is too long" };
  if (data.accountNumber && data.accountNumber.length > 30) return { success: false, error: "Account number is too long" };

  try {
    const isAdmin = user.roles.includes("L4_ADMIN");
    const code = data.traderCode || (await generateFarmerCode("TRADER"));

    let registeredById = user.userId;
    let registeredByName = user.userName;

    if (isAdmin && data.agentId && data.agentId !== user.userId) {
      // Admin is assigning to another agent
      const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
      if (agent) {
        registeredById = agent.id;
        registeredByName = agent.name;
      }
    }

    const trader = await prisma.trader.create({
      data: {
        name: data.name.trim(),
        fatherName: (data.fatherName || "").trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        town: (data.town || data.village).trim(),
        district: data.district.trim(),
        block: data.block.trim(),
        village: data.village.trim(),
        gender: data.gender || "",
        pinCode: data.pinCode || "",

        projectName: data.projectName || "",
        state: data.state || "",
        panGst: data.panGst || "",
        company: data.company || "",
        promoterName: data.promoterName || "",
        bankName: data.bankName || "",
        ifscCode: data.ifscCode || "",
        accountNumber: data.accountNumber || "",
        traderCode: code,
        registeredBy: registeredById,
        registeredByName: registeredByName,
      },
    });

    return {
      success: true,
      id: trader.id,
      trader: {
        id: trader.id,
        name: trader.name,
        phone: trader.phone,
        address: trader.address,
        town: trader.town,
        district: trader.district,
        block: trader.block,
        fatherName: trader.fatherName,
        farmerCode: trader.traderCode, // map back to farmerCode for frontend compatibility if needed
        traderCode: trader.traderCode,
        village: trader.village,
        registeredByName: trader.registeredByName,
        category: "TRADER",
        gender: trader.gender,
        pinCode: trader.pinCode,
        projectName: trader.projectName,
        state: trader.state,
        panGst: trader.panGst,
        company: trader.company,
        promoterName: trader.promoterName,
        bankName: trader.bankName,
        ifscCode: trader.ifscCode,
        accountNumber: trader.accountNumber,
      },
    };
  } catch (error: any) {
    console.error("Failed to register trader:", error);
    return { success: false, error: error.message || "Failed to register trader" };
  }
}
