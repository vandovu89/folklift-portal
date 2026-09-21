import { prisma } from "./prisma";

export async function logActivity({
  action,
  entityType,
  entityId,
  userId,
  details,
}: {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
