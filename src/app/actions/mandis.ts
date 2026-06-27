"use server";

import prisma from "@/lib/prisma";

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
  return await prisma.mandi.create({
    data: { state, district, mandiName },
  });
}
