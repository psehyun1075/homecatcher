import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationStatus, Prisma } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { ReadAllNotificationsDto } from "./dto/read-all-notifications.dto";

type NotificationPayload = Prisma.NotificationGetPayload<object>;

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listNotifications(user: CurrentUserPayload, query: ListNotificationsQueryDto) {
    const limit = Number(query.limit ?? 20);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const now = new Date();
    const where: Prisma.NotificationWhereInput = {
      userId: user.userId,
      deletedAt: null,
      archivedAt: null,
      availableAt: { lte: now },
      status: { notIn: [NotificationStatus.CANCELED, NotificationStatus.CANCELLED] },
      ...(query.familyId ? { familyId: query.familyId } : {}),
      ...(query.notificationType ? { notificationType: query.notificationType } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(cursor
        ? {
            OR: [
              { availableAt: { lt: cursor.availableAt } },
              { availableAt: cursor.availableAt, createdAt: { lt: cursor.createdAt } },
              { availableAt: cursor.availableAt, createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: [{ availableAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const page = notifications.slice(0, limit);
    const next = notifications.length > limit ? page[page.length - 1] : null;

    return {
      notifications: page.map((notification) => this.serializeNotification(notification)),
      nextCursor: next ? this.encodeCursor(next.availableAt, next.createdAt, next.id) : null,
    };
  }

  async getUnreadCount(user: CurrentUserPayload, familyId?: string) {
    if (familyId) {
      await this.ensureFamilyMember(user.userId, familyId);
    }

    const count = await this.prisma.notification.count({
      where: {
        userId: user.userId,
        ...(familyId ? { familyId } : {}),
        deletedAt: null,
        archivedAt: null,
        readAt: null,
        availableAt: { lte: new Date() },
        status: { notIn: [NotificationStatus.CANCELED, NotificationStatus.CANCELLED] },
      },
    });

    return { unreadCount: count };
  }

  async getNotification(user: CurrentUserPayload, notificationId: string) {
    const notification = await this.findOwnedNotification(user.userId, notificationId);
    return { notification: this.serializeNotification(notification) };
  }

  async markRead(user: CurrentUserPayload, notificationId: string) {
    const notification = await this.findOwnedNotification(user.userId, notificationId);
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt ?? new Date() },
    });
    return { notification: this.serializeNotification(updated) };
  }

  async readAll(user: CurrentUserPayload, dto: ReadAllNotificationsDto) {
    if (dto.familyId) {
      await this.ensureFamilyMember(user.userId, dto.familyId);
    }

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.userId,
        ...(dto.familyId ? { familyId: dto.familyId } : {}),
        deletedAt: null,
        archivedAt: null,
        readAt: null,
        availableAt: { lte: new Date() },
        status: { notIn: [NotificationStatus.CANCELED, NotificationStatus.CANCELLED] },
      },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }

  async archive(user: CurrentUserPayload, notificationId: string) {
    const notification = await this.findOwnedNotification(user.userId, notificationId);
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { archivedAt: notification.archivedAt ?? new Date() },
    });
    return { notification: this.serializeNotification(updated) };
  }

  private async findOwnedNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException("이 알림에 접근할 수 없어요.");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException("이 알림에 접근할 수 없어요.");
    }

    return notification;
  }

  private async ensureFamilyMember(userId: string, familyId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
      include: { family: true },
    });

    if (!membership || membership.deletedAt || membership.family.deletedAt) {
      throw new ForbiddenException("이 알림에 접근할 수 없어요.");
    }

    return membership;
  }

  private serializeNotification(notification: NotificationPayload) {
    return {
      id: notification.id,
      notificationType: notification.notificationType,
      status: notification.status,
      title: notification.title,
      message: notification.message,
      familyId: notification.familyId,
      sourceType: notification.sourceType,
      sourceId: notification.sourceId,
      deepLink: notification.deepLink,
      availableAt: notification.availableAt,
      readAt: notification.readAt,
      archivedAt: notification.archivedAt,
      createdAt: notification.createdAt,
    };
  }

  private encodeCursor(availableAt: Date, createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify({ availableAt: availableAt.toISOString(), createdAt: createdAt.toISOString(), id })).toString("base64url");
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        availableAt?: string;
        createdAt?: string;
        id?: string;
      };
      if (!parsed.availableAt || !parsed.createdAt || !parsed.id) throw new Error("invalid cursor");
      return { availableAt: new Date(parsed.availableAt), createdAt: new Date(parsed.createdAt), id: parsed.id };
    } catch {
      throw new ForbiddenException("커서를 다시 확인해 주세요.");
    }
  }
}
