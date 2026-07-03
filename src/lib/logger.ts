import prisma from "./prisma";

export async function logAuditAction(
  userId: string | null,
  action: string,
  details: string = "",
  ipAddress: string = "unknown"
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
