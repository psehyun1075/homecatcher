import { Inject, Injectable } from "@nestjs/common";
import { ActivityType, FamilyRole, NotificationType, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type Tx = Prisma.TransactionClient;

interface ActivityInput {
  familyId: string;
  actorMemberId?: string | null;
  activityType: ActivityType;
  sourceType: string;
  sourceId: string;
  dedupeKey: string;
  title: string;
  message?: string | null;
  deepLink?: string | null;
  occurredAt?: Date;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityWriterService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async recordTodoCompleted(tx: Tx, input: { completionId: string; todoId: string; actorMemberId: string | null; occurredAt: Date }) {
    const todo = await tx.todoTask.findUnique({
      where: { id: input.todoId },
      include: {
        createdByMember: true,
        plannerMember: true,
        assigneeMember: true,
      },
    });
    if (!todo) return null;
    const actor = input.actorMemberId ? await tx.familyMember.findUnique({ where: { id: input.actorMemberId } }) : null;
    const actorName = this.memberName(actor);
    const activity = await this.createActivity(tx, {
      familyId: todo.familyId,
      actorMemberId: input.actorMemberId,
      activityType: ActivityType.TODO_COMPLETED,
      sourceType: "TODO",
      sourceId: todo.id,
      dedupeKey: `TODO_COMPLETED:${input.completionId}`,
      title: `${todo.title}를 완료했어요.`,
      message: `${actorName}님이 할 일을 완료했어요.`,
      deepLink: `/todos/${todo.id}`,
      occurredAt: input.occurredAt,
      payload: { todoTitle: todo.title },
    });
    await this.createActivityNotifications(tx, activity, [
      todo.createdByMember,
      todo.plannerMember,
      todo.assigneeMember,
    ], input.actorMemberId, "할 일이 완료됐어요.", `${todo.title} 완료를 확인해 주세요.`);
    return activity;
  }

  async recordHouseholdItemPurchased(
    tx: Tx,
    input: { purchaseId: string; householdItemId: string; actorMemberId: string | null; occurredAt: Date },
  ) {
    const item = await tx.householdItem.findUnique({ where: { id: input.householdItemId } });
    if (!item) return null;
    const actor = input.actorMemberId ? await tx.familyMember.findUnique({ where: { id: input.actorMemberId } }) : null;
    const activity = await this.createActivity(tx, {
      familyId: item.familyId,
      actorMemberId: input.actorMemberId,
      activityType: ActivityType.HOUSEHOLD_ITEM_PURCHASED,
      sourceType: "HOUSEHOLD_ITEM",
      sourceId: item.id,
      dedupeKey: `HOUSEHOLD_ITEM_PURCHASED:${input.purchaseId}`,
      title: `${item.name}을 주문했어요.`,
      message: `${this.memberName(actor)}님이 ${item.name}을 주문했어요.`,
      deepLink: `/household-items/${item.id}`,
      occurredAt: input.occurredAt,
      payload: { itemName: item.name },
    });
    const members = await tx.familyMember.findMany({ where: { familyId: item.familyId, deletedAt: null } });
    await this.createActivityNotifications(tx, activity, members, input.actorMemberId, `${item.name} 주문이 완료됐어요.`, "생필품 주문이 완료됐어요.");
    return activity;
  }

  async recordFixedExpensePaid(
    tx: Tx,
    input: { paymentId: string; fixedExpenseId: string; actorMemberId: string | null; occurredAt: Date },
  ) {
    const fixedExpense = await tx.fixedExpense.findUnique({ where: { id: input.fixedExpenseId } });
    if (!fixedExpense) return null;
    const actor = input.actorMemberId ? await tx.familyMember.findUnique({ where: { id: input.actorMemberId } }) : null;
    const activity = await this.createActivity(tx, {
      familyId: fixedExpense.familyId,
      actorMemberId: input.actorMemberId,
      activityType: ActivityType.FIXED_EXPENSE_PAID,
      sourceType: "FIXED_EXPENSE",
      sourceId: fixedExpense.id,
      dedupeKey: `FIXED_EXPENSE_PAID:${input.paymentId}`,
      title: `${fixedExpense.title} 납부를 기록했어요.`,
      message: `${this.memberName(actor)}님이 ${fixedExpense.title} 납부를 기록했어요.`,
      deepLink: `/fixed-expenses/${fixedExpense.id}`,
      occurredAt: input.occurredAt,
      payload: { fixedExpenseTitle: fixedExpense.title },
    });
    const members = await tx.familyMember.findMany({
      where: { familyId: fixedExpense.familyId, deletedAt: null, role: { in: [FamilyRole.OWNER, FamilyRole.ADMIN] } },
    });
    await this.createActivityNotifications(tx, activity, members, input.actorMemberId, `${fixedExpense.title} 납부가 기록됐어요.`, "고정지출 납부가 기록됐어요.");
    return activity;
  }

  async recordFamilyEventCreated(tx: Tx, input: { eventId: string; actorMemberId: string | null; occurredAt: Date }) {
    const event = await tx.familyEvent.findUnique({
      where: { id: input.eventId },
      include: { participants: { where: { deletedAt: null }, include: { familyMember: true } } },
    });
    if (!event) return null;
    const actor = input.actorMemberId ? await tx.familyMember.findUnique({ where: { id: input.actorMemberId } }) : null;
    const activity = await this.createActivity(tx, {
      familyId: event.familyId,
      actorMemberId: input.actorMemberId,
      activityType: ActivityType.FAMILY_EVENT_CREATED,
      sourceType: "FAMILY_EVENT",
      sourceId: event.id,
      dedupeKey: `FAMILY_EVENT_CREATED:${event.id}`,
      title: `${event.title} 일정을 등록했어요.`,
      message: `${this.memberName(actor)}님이 가족 일정을 등록했어요.`,
      deepLink: `/events/${event.id}`,
      occurredAt: input.occurredAt,
      payload: { eventTitle: event.title, eventType: event.eventType },
    });
    const targets =
      event.participants.length > 0
        ? event.participants.map((participant) => participant.familyMember).filter(Boolean)
        : await tx.familyMember.findMany({ where: { familyId: event.familyId, deletedAt: null } });
    await this.createActivityNotifications(tx, activity, targets, input.actorMemberId, "가족 일정이 등록됐어요.", `${event.title} 일정을 확인해 주세요.`);
    return activity;
  }

  async recordHomeManualCreated(tx: Tx, input: { manualId: string; actorMemberId: string | null; occurredAt: Date }) {
    const manual = await tx.homeManual.findUnique({ where: { id: input.manualId } });
    if (!manual) return null;
    const actor = input.actorMemberId ? await tx.familyMember.findUnique({ where: { id: input.actorMemberId } }) : null;
    return this.createActivity(tx, {
      familyId: manual.familyId,
      actorMemberId: input.actorMemberId,
      activityType: ActivityType.HOME_MANUAL_CREATED,
      sourceType: "HOME_MANUAL",
      sourceId: manual.id,
      dedupeKey: `HOME_MANUAL_CREATED:${manual.id}`,
      title: `${manual.title}을 우리집 매뉴얼에 추가했어요.`,
      message: `${this.memberName(actor)}님이 우리집 매뉴얼을 추가했어요.`,
      deepLink: `/home-manuals/${manual.id}`,
      occurredAt: input.occurredAt,
      payload: { manualTitle: manual.title },
    });
  }

  async recordTemplateApplied(tx: Tx, input: { applicationId: string; familyId: string; templateName: string; actorMemberId?: string | null; occurredAt: Date }) {
    return this.createActivity(tx, {
      familyId: input.familyId,
      actorMemberId: input.actorMemberId ?? null,
      activityType: ActivityType.TEMPLATE_APPLIED,
      sourceType: "TEMPLATE_APPLICATION",
      sourceId: input.applicationId,
      dedupeKey: `TEMPLATE_APPLIED:${input.applicationId}`,
      title: `${input.templateName} 템플릿을 우리집에 적용했어요.`,
      message: `${input.templateName} 템플릿을 우리집에 적용했어요.`,
      deepLink: `/families/${input.familyId}/feed`,
      occurredAt: input.occurredAt,
      payload: { templateName: input.templateName },
    });
  }

  async createNotification(
    tx: Tx,
    input: {
      userId: string;
      familyId?: string | null;
      notificationType: NotificationType;
      title: string;
      message: string;
      sourceType?: string | null;
      sourceId?: string | null;
      deepLink?: string | null;
      dedupeKey: string;
      availableAt?: Date;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    return tx.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {
        title: input.title,
        message: input.message,
        availableAt: input.availableAt ?? new Date(),
        status: "PENDING",
        archivedAt: null,
        deletedAt: null,
      },
      create: {
        userId: input.userId,
        familyId: input.familyId ?? null,
        notificationType: input.notificationType,
        title: input.title,
        message: input.message,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        deepLink: input.deepLink ?? null,
        dedupeKey: input.dedupeKey,
        availableAt: input.availableAt ?? new Date(),
        scheduledAt: input.availableAt ?? new Date(),
        payload: input.payload ?? Prisma.JsonNull,
      },
    });
  }

  private async createActivity(tx: Tx, input: ActivityInput) {
    return tx.activityLog.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        familyId: input.familyId,
        actorMemberId: input.actorMemberId ?? null,
        activityType: input.activityType,
        entityType: input.sourceType,
        entityId: input.sourceId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        dedupeKey: input.dedupeKey,
        title: input.title,
        message: input.message ?? null,
        deepLink: input.deepLink ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        payload: input.payload ?? Prisma.JsonNull,
      },
    });
  }

  private async createActivityNotifications(
    tx: Tx,
    activity: { id: string; familyId: string; deepLink: string | null; sourceType: string | null; sourceId: string | null },
    members: Array<{ id: string; userId: string | null } | null>,
    actorMemberId: string | null,
    title: string,
    message: string,
  ) {
    const userIds = new Set<string>();
    for (const member of members) {
      if (!member || member.id === actorMemberId || !member.userId) continue;
      userIds.add(member.userId);
    }

    if (userIds.size === 0) return;

    await tx.notification.createMany({
      data: [...userIds].map((userId) => ({
        userId,
        familyId: activity.familyId,
        notificationType: NotificationType.ACTIVITY,
        title,
        message,
        sourceType: activity.sourceType,
        sourceId: activity.sourceId,
        deepLink: activity.deepLink,
        dedupeKey: `ACTIVITY:${activity.id}:${userId}`,
        availableAt: new Date(),
        scheduledAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  private memberName(member: { displayName: string | null } | null) {
    return member?.displayName?.trim() || "가족";
  }
}
