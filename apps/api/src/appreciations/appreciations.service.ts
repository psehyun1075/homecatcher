import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AppreciationType, NotificationType, Prisma } from "@prisma/client";

import { ActivityWriterService } from "../activity-feed/activity-writer.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppreciationDto } from "./dto/create-appreciation.dto";

const appreciationInclude = {
  fromMember: true,
  toMember: true,
  activity: true,
} satisfies Prisma.AppreciationInclude;

type AppreciationWithRelations = Prisma.AppreciationGetPayload<{ include: typeof appreciationInclude }>;

@Injectable()
export class AppreciationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityWriterService) private readonly activityWriter: ActivityWriterService,
  ) {}

  async createAppreciation(user: CurrentUserPayload, activityId: string, dto: CreateAppreciationDto) {
    const activity = await this.findActivity(activityId);
    const membership = await this.ensureFamilyMember(user.userId, activity.familyId);

    if (!activity.actorMemberId || !activity.actorMember?.userId) {
      throw new ConflictException("이 활동에는 고마워요를 남길 수 없어요.");
    }

    if (activity.actorMemberId === membership.id) {
      throw new ConflictException("내 활동에는 고마워요를 남길 수 없어요.");
    }

    const existing = await this.prisma.appreciation.findUnique({
      where: { activityId_fromMemberId: { activityId, fromMemberId: membership.id } },
      include: appreciationInclude,
    });

    if (existing && !existing.deletedAt) {
      return { appreciation: this.serializeAppreciation(existing), idempotent: true };
    }

    const message = this.trimOptional(dto.message);
    const appreciation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appreciation.upsert({
        where: { activityId_fromMemberId: { activityId, fromMemberId: membership.id } },
        update: { deletedAt: null, message },
        create: {
          activityId,
          fromMemberId: membership.id,
          toMemberId: activity.actorMemberId!,
          appreciationType: AppreciationType.THANKS,
          message,
        },
      });

      await this.activityWriter.createNotification(tx, {
        userId: activity.actorMember!.userId!,
        familyId: activity.familyId,
        notificationType: NotificationType.APPRECIATION_RECEIVED,
        title: "고마워요를 받았어요",
        message: `${membership.displayName?.trim() || user.name}님이 고마워요를 남겼어요.`,
        sourceType: "ACTIVITY",
        sourceId: activity.id,
        deepLink: `/activities/${activity.id}`,
        dedupeKey: `APPRECIATION:${created.id}:${activity.actorMember!.userId!}`,
        availableAt: new Date(),
        payload: { activityId: activity.id },
      });

      return tx.appreciation.findUniqueOrThrow({
        where: { id: created.id },
        include: appreciationInclude,
      });
    });

    return { appreciation: this.serializeAppreciation(appreciation), idempotent: false };
  }

  async listAppreciations(user: CurrentUserPayload, activityId: string) {
    const activity = await this.findActivity(activityId);
    await this.ensureFamilyMember(user.userId, activity.familyId);
    const appreciations = await this.prisma.appreciation.findMany({
      where: { activityId, deletedAt: null },
      include: appreciationInclude,
      orderBy: { createdAt: "asc" },
    });

    return { appreciations: appreciations.map((appreciation) => this.serializeAppreciation(appreciation)) };
  }

  async deleteAppreciation(user: CurrentUserPayload, appreciationId: string) {
    const appreciation = await this.prisma.appreciation.findFirst({
      where: { id: appreciationId, deletedAt: null },
      include: appreciationInclude,
    });

    if (!appreciation) {
      throw new NotFoundException("고마워요를 찾을 수 없어요.");
    }

    const membership = await this.ensureFamilyMember(user.userId, appreciation.activity.familyId);
    if (membership.id !== appreciation.fromMemberId) {
      throw new ForbiddenException("내가 남긴 고마워요만 지울 수 있어요.");
    }

    const deleted = await this.prisma.appreciation.update({
      where: { id: appreciation.id },
      data: { deletedAt: new Date() },
      include: appreciationInclude,
    });

    return { appreciation: this.serializeAppreciation(deleted) };
  }

  private async findActivity(activityId: string) {
    const activity = await this.prisma.activityLog.findFirst({
      where: { id: activityId, deletedAt: null },
      include: { actorMember: true },
    });

    if (!activity) {
      throw new NotFoundException("이 활동을 찾을 수 없어요.");
    }

    return activity;
  }

  private serializeAppreciation(appreciation: AppreciationWithRelations) {
    return {
      id: appreciation.id,
      activityId: appreciation.activityId,
      fromMember: {
        memberId: appreciation.fromMemberId,
        displayName: appreciation.fromMember.displayName,
      },
      toMember: {
        memberId: appreciation.toMemberId,
        displayName: appreciation.toMember.displayName,
      },
      message: appreciation.message,
      createdAt: appreciation.createdAt,
      deletedAt: appreciation.deletedAt,
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

  private trimOptional(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
