"use server";

import prisma from "@/lib/prisma";

import { auth } from "@/auth";

export async function getMandis() {
  const mandis = await prisma.mandi.findMany({
    orderBy: [
      { state: "asc" },
      { district: "asc" },
      { mandiName: "asc" }
    ],
  });
  return mandis;
}

export async function addMandi(state: string, district: string, mandiName: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Not authenticated" };
  }
  const roles = (session.user as any).roles || ["L1_AGENT"];
  if (!roles.includes("L4_ADMIN")) {
    return { success: false, error: "Only administrators can add mandis" };
  }
  
  if (!state || !state.trim() || state.length > 100) {
    return { success: false, error: "Invalid state" };
  }
  if (!district || !district.trim() || district.length > 100) {
    return { success: false, error: "Invalid district" };
  }
  if (!mandiName || !mandiName.trim() || mandiName.length > 100) {
    return { success: false, error: "Invalid mandi name" };
  }

  try {
    const newMandi = await prisma.mandi.create({
      data: {
        state: state.trim(),
        district: district.trim(),
        mandiName: mandiName.trim(),
      },
    });
    return { success: true, data: newMandi };
  } catch (error: any) {
    console.error("Failed to add mandi:", error);
    return { success: false, error: error.message || "Failed to add mandi" };
  }
}
