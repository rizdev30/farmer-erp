"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return {
    userId: session.user.id,
    userName: session.user.name || "Unknown",
    roles: (session.user as any).roles || ["L1_AGENT"],
    isSuperAdmin: (session.user as any).isSuperAdmin || false,
  };
}

export async function createNotification(data: {
  title: string;
  message: string;
  type: string;
  link?: string;
  userId?: string;
  targetRole?: string;
  senderName: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || null,
        userId: data.userId || null,
        targetRole: data.targetRole || null,
        senderName: data.senderName,
      },
    });
    revalidatePath("/dashboard");
    return { success: true, data: notification };
  } catch (error: any) {
    console.error("Failed to create notification:", error);
    return { success: false, error: error.message };
  }
}

export async function getNotifications() {
  try {
    const user = await getSessionUser();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours

    const isAdmin = user.roles.includes("L4_ADMIN") || user.isSuperAdmin;

    // Build the query conditions
    const where: any = {
      createdAt: { gte: cutoff },
    };

    if (!isAdmin) {
      // Non-admin users see notifications that are:
      // 1. Directly assigned to them (userId matches)
      // 2. Targeted at ANY role they possess (targetRole matches one of their roles)
      // 3. Broadcast to everyone (both userId and targetRole are null)
      where.OR = [
        { userId: user.userId },                        // directly assigned to user
        { targetRole: { in: user.roles } },             // targeted at a role they possess
        { AND: [{ userId: null }, { targetRole: null }] } // broadcast to everyone
      ];
    }
    // Admins see all notifications (no additional filter)

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, notifications };
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return { success: false, error: error.message, notifications: [] };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const user = await getSessionUser();
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { readBy: true },
    });

    if (!notification) throw new Error("Notification not found");

    if (!notification.readBy.includes(user.userId)) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          readBy: {
            set: [...notification.readBy, user.userId],
          },
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: error.message };
  }
}

export async function markAllAsRead() {
  try {
    const user = await getSessionUser();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const isAdmin = user.roles.includes("L4_ADMIN") || user.isSuperAdmin;

    const where: any = {
      createdAt: { gte: cutoff },
      NOT: { readBy: { has: user.userId } },
    };

    if (!isAdmin) {
      where.OR = [
        { userId: user.userId },
        { targetRole: { in: user.roles } },
        { AND: [{ userId: null }, { targetRole: null }] }
      ];
    }

    const unreadNotifications = await prisma.notification.findMany({
      where,
      select: { id: true, readBy: true },
    });

    // Use Promise.all for faster batch update
    if (unreadNotifications.length > 0) {
      await Promise.all(
        unreadNotifications.map((notif) =>
          prisma.notification.update({
            where: { id: notif.id },
            data: {
              readBy: {
                set: [...notif.readBy, user.userId],
              },
            },
          })
        )
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false, error: error.message };
  }
}
