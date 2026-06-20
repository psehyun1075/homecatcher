import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ListFeedQueryDto } from "./dto/list-feed-query.dto";

const activityInclude = {
  actorMember: true,
  appreciations: {
    where: { deletedAt: null },
    include: { fromMember: true, toMember: true },
  },
} satisfies Prisma.ActivityLogInclude;

type ActivityWithRelations = Prisma.ActivityLogGetPayload<{ include: typeof activityInclude }>;

@Injectable()
export class ActivityFeedService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listFeed(user: CurrentUserPayload, familyId: string, query: ListFeedQueryDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);
    const limit = Number(query.limit ?? 20);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const where: Prisma.ActivityLogWhereInput = {
      familyId,
      deletedAt: null,
      ...(query.activityType ? { activityType: query.activityType } : {}),
      ...(query.actorMemberId ? { actorMemberId: query.actorMemberId } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(cursor
        ? {
            OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }],
          }
        : {}),
    };

    const activities = await this.prisma.activityLog.findMany({
      where,
      include: activityInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const page = activities.slice(0, limit);
    const next = activities.length > limit ? page[page.length - 1] : null;

    return {
      activities: page.map((activity) => this.serializeActivity(activity, membership.id)),
      nextCursor: next ? this.encodeCursor(next.createdAt, next.id) : null,
    };
  }

  async getActivity(user: CurrentUserPayload, activityId: string) {
    const activity = await this.prisma.activityLog.findFirst({
      where: { id: activityId, deletedAt: null },
      include: activityInclude,
    });

    if (!activity) {
      throw new NotFoundException("이 활동을 찾을 수 없어요.");
    }

    const membership = await this.ensureFamilyMember(user.userId, activity.familyId);

    return {
      activity: this.serializeActivity(activity, membership.id),
    };
  }

  private serializeActivity(activity: ActivityWithRelations, currentMemberId: string) {
    return {
      id: activity.id,
      activityType: activity.activityType,
      title: activity.title,
      message: activity.message,
      actor: activity.actorMember
        ? {
            memberId: activity.actorMember.id,
            displayName: activity.actorMember.displayName,
          }
        : null,
      sourceType: activity.sourceType ?? activity.entityType,
      sourceId: activity.sourceId ?? activity.entityId,
      deepLink: activity.deepLink,
      payload: activity.payload,
      appreciationCount: activity.appreciations.length,
      appreciatedByMe: activity.appreciations.some((appreciation) => appreciation.fromMemberId === currentMemberId),
      occurredAt: activity.occurredAt,
      createdAt: activity.createdAt,
    };
  }

  private async ensureFamilyMember(userId: string, familyId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
      include: { family: true },
    });

    if (!membership || membership.deletedAt || membership.family.deletedAt) {
      throw new ForbiddenException("가족 피드에 접근할 수 없어요.");
    }

    return membership;
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString("base64url");
  }

  private decodeCursor(cursor: string) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { createdAt?: string; id?: string };
      if (!parsed.createdAt || !parsed.id) throw new Error("invalid cursor");
      return { createdAt: new Date(parsed.createdAt), id: parsed.id };
    } catch {
      throw new ForbiddenException("커서를 다시 확인해 주세요.");
    }
  }
}
