import { prisma } from "../../db/prisma";
import { enqueueNotification } from "../../queues";

interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  channel?: "IN_APP" | "EMAIL";
  metadata?: unknown;
}

interface BroadcastInput {
  companyId: string;
  title: string;
  body: string;
  channel?: "IN_APP" | "EMAIL";
  metadata?: unknown;
}

export const notificationService = {
  notify: async (data: NotifyInput): Promise<void> => {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        channel: data.channel ?? "IN_APP",
        metadata: (data.metadata as object) ?? undefined
      }
    });
    await enqueueNotification("dispatch-notification", data);
  },
  broadcastToCompany: async (data: BroadcastInput): Promise<number> => {
    const users = await prisma.user.findMany({
      where: { companyId: data.companyId, isActive: true },
      select: { id: true }
    });

    for (const user of users) {
      await notificationService.notify({
        userId: user.id,
        title: data.title,
        body: data.body,
        channel: data.channel ?? "IN_APP",
        metadata: data.metadata
      });
    }

    return users.length;
  }
};
