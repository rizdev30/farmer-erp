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
  const user = await getSessionUser();
  const isAdmin = user.role === "L4_ADMIN";
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
      name: data.name,
      fatherName: data.fatherName || "",
      phone: data.phone,
      address: data.address,
      town: data.town || data.village,
      district: data.district,
      block: data.block,
      village: data.village,
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
}
