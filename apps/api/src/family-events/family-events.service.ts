import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyRole, Prisma, RecurrenceType } from "@prisma/client";

import { ActivityWriterService } from "../activity-feed/activity-writer.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { assertValidDateKey, assertValidTimezone } from "../common/calendar-date.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFamilyEventDto } from "./dto/create-family-event.dto";
import { ListFamilyEventsQueryDto } from "./dto/list-family-events-query.dto";
import { UpdateFamilyEventDto } from "./dto/update-family-event.dto";

export const familyEventInclude = {
  createdByMember: true,
  participants: {
    where: {
      deletedAt: null,
    },
    include: {
      familyMember: true,
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.FamilyEventInclude;

export type FamilyEventWithRelations = Prisma.FamilyEventGetPayload<{ include: typeof familyEventInclude }>;

@Injectable()
export class FamilyEventsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityWriterService) private readonly activityWriter: ActivityWriterService,
  ) {}

  async listEvents(user: CurrentUserPayload, familyId: string, query: ListFamilyEventsQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);

    if (query.participantMemberId) {
      await this.ensureMemberIdsInFamily(familyId, [query.participantMemberId]);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rangeStart = query.from ? new Date(query.from) : null;
    const rangeEnd = query.to ? new Date(query.to) : null;
    const rangeWhere =
      rangeStart || rangeEnd
        ? {
            OR: [
              {
                recurrenceType: {
                  not: RecurrenceType.ONCE,
                },
              },
              {
                startAt: rangeEnd ? { lt: rangeEnd } : undefined,
                OR: [
                  {
                    endAt: rangeStart ? { gte: rangeStart } : undefined,
                  },
                  {
                    endAt: null,
                    startAt: rangeStart ? { gte: rangeStart } : undefined,
                  },
                ],
              },
            ],
          }
        : {};
    const where: Prisma.FamilyEventWhereInput = {
      familyId,
      deletedAt: null,
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...rangeWhere,
      ...(query.participantMemberId
        ? {
            participants: {
              some: {
                familyMemberId: query.participantMemberId,
                deletedAt: null,
              },
            },
          }
        : {}),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.familyEvent.findMany({
        where,
        include: familyEventInclude,
        orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.familyEvent.count({ where }),
    ]);

    return {
      events: events.map((event) => this.serializeEvent(event)),
      page,
      limit,
      total,
    };
  }

  async createEvent(user: CurrentUserPayload, familyId: string, dto: CreateFamilyEventDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);
    const participantMemberIds = dto.participantMemberIds ?? [];
    await this.ensureMemberIdsInFamily(familyId, participantMemberIds);
    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt ? new Date(dto.endAt) : null;
    const timezone = dto.timezone ?? "Asia/Seoul";
    assertValidTimezone(timezone);
    this.ensureDateOrder(startAt, endAt);
    this.ensureAllowedRecurrenceType(dto.recurrenceType ?? RecurrenceType.ONCE);
    this.ensureValidRecurrenceRule(dto.recurrenceRule);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.familyEvent.create({
        data: {
          familyId,
          createdByMemberId: membership.id,
          title: dto.title.trim(),
          description: this.trimOptional(dto.description),
          eventType: dto.eventType,
          location: this.trimOptional(dto.location),
          startAt,
          endAt,
          allDay: dto.allDay ?? false,
          timezone,
          displayColor: dto.displayColor ?? null,
          recurrenceType: dto.recurrenceType ?? RecurrenceType.ONCE,
          recurrenceRule: this.toJson(dto.recurrenceRule),
          participants: {
            create: participantMemberIds.map((memberId, index) => ({
              familyMemberId: memberId,
              isPrimary: index === 0,
            })),
          },
        },
      });
      await this.activityWriter.recordFamilyEventCreated(tx, {
        eventId: created.id,
        actorMemberId: membership.id,
        occurredAt: created.createdAt,
      });
      return tx.familyEvent.findUniqueOrThrow({ where: { id: created.id }, include: familyEventInclude });
    });

    return {
      event: this.serializeEvent(event),
    };
  }

  async getEvent(user: CurrentUserPayload, eventId: string) {
    const event = await this.findEvent(eventId);
    await this.ensureFamilyMember(user.userId, event.familyId);

    return {
      event: this.serializeEvent(event),
    };
  }

  async updateEvent(user: CurrentUserPayload, eventId: string, dto: UpdateFamilyEventDto) {
    const event = await this.findEvent(eventId);
    const membership = await this.ensureFamilyMember(user.userId, event.familyId);
    this.ensureCanMutate(membership, event);

    if (dto.participantMemberIds) {
      await this.ensureMemberIdsInFamily(event.familyId, dto.participantMemberIds);
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const endAt = dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : event.endAt;
    const timezone = dto.timezone ?? event.timezone;
    assertValidTimezone(timezone);
    this.ensureDateOrder(startAt, endAt);
    if (dto.recurrenceType !== undefined) {
      this.ensureAllowedRecurrenceType(dto.recurrenceType);
    }
    if (dto.recurrenceRule !== undefined) {
      this.ensureValidRecurrenceRule(dto.recurrenceRule);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.participantMemberIds) {
        await tx.eventParticipant.updateMany({
          where: {
            familyEventId: event.id,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });

        for (const [index, memberId] of dto.participantMemberIds.entries()) {
          await tx.eventParticipant.create({
            data: {
              familyEventId: event.id,
              familyMemberId: memberId,
              isPrimary: index === 0,
            },
          });
        }
      }

      await tx.familyEvent.update({
        where: {
          id: event.id,
        },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: this.trimOptional(dto.description) } : {}),
          ...(dto.eventType !== undefined ? { eventType: dto.eventType } : {}),
          ...(dto.location !== undefined ? { location: this.trimOptional(dto.location) } : {}),
          ...(dto.startAt !== undefined ? { startAt } : {}),
          ...(dto.endAt !== undefined ? { endAt } : {}),
          ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
          ...(dto.timezone !== undefined ? { timezone } : {}),
          ...(dto.displayColor !== undefined ? { displayColor: dto.displayColor } : {}),
          ...(dto.recurrenceType !== undefined ? { recurrenceType: dto.recurrenceType } : {}),
          ...(dto.recurrenceRule !== undefined ? { recurrenceRule: this.toJson(dto.recurrenceRule) } : {}),
        },
      });
    });
    const updated = await this.findEvent(event.id);

    return {
      event: this.serializeEvent(updated),
    };
  }

  async deleteEvent(user: CurrentUserPayload, eventId: string) {
    const event = await this.findEvent(eventId);
    const membership = await this.ensureFamilyMember(user.userId, event.familyId);
    this.ensureCanMutate(membership, event);

    const deleted = await this.prisma.familyEvent.update({
      where: {
        id: event.id,
      },
      data: {
        deletedAt: new Date(),
        participants: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
            },
          },
        },
      },
      include: familyEventInclude,
    });

    return {
      event: this.serializeEvent(deleted),
    };
  }

  async findEvent(eventId: string) {
    const event = await this.prisma.familyEvent.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
      },
      include: familyEventInclude,
    });

    if (!event) {
      throw new NotFoundException("가족 일정을 찾을 수 없어요.");
    }

    return event;
  }

  async ensureFamilyMember(userId: string, familyId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
      include: {
        family: true,
      },
    });

    if (!membership || membership.deletedAt || !membership.family || membership.family.deletedAt) {
      throw new ForbiddenException("가족 캘린더에 접근할 수 없어요.");
    }

    return membership;
  }

  private async ensureMemberIdsInFamily(familyId: string, memberIds: string[]) {
    if (new Set(memberIds).size !== memberIds.length) {
      throw new BadRequestException("참여자가 중복됐어요.");
    }

    if (memberIds.length === 0) {
      return;
    }

    const count = await this.prisma.familyMember.count({
      where: {
        id: {
          in: memberIds,
        },
        familyId,
        deletedAt: null,
      },
    });

    if (count !== memberIds.length) {
      throw new ForbiddenException("참여자는 우리 가족 구성원만 선택할 수 있어요.");
    }
  }

  private ensureDateOrder(startAt: Date, endAt: Date | null) {
    if (endAt && endAt < startAt) {
      throw new BadRequestException("일정 종료 시간은 시작 시간보다 빠를 수 없어요.");
    }
  }

  private ensureCanMutate(membership: { id: string; role: FamilyRole }, event: { createdByMemberId: string | null }) {
    if (membership.role === FamilyRole.OWNER || membership.role === FamilyRole.ADMIN) {
      return;
    }

    if (event.createdByMemberId === membership.id) {
      return;
    }

    throw new ForbiddenException("이 가족 일정은 수정할 수 없어요.");
  }

  private serializeEvent(event: FamilyEventWithRelations) {
    return {
      id: event.id,
      familyId: event.familyId,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      timezone: event.timezone,
      displayColor: event.displayColor,
      recurrenceType: event.recurrenceType,
      recurrenceRule: event.recurrenceRule,
      createdByMember: event.createdByMember ? this.serializeMember(event.createdByMember) : null,
      participants: event.participants.map((participant) => ({
        id: participant.id,
        familyMemberId: participant.familyMemberId,
        isPrimary: participant.isPrimary,
        member: participant.familyMember ? this.serializeMember(participant.familyMember) : null,
      })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      deletedAt: event.deletedAt,
    };
  }

  private serializeMember(member: { id: string; familyId: string; userId: string | null; role: FamilyRole; displayName: string | null }) {
    return {
      id: member.id,
      familyId: member.familyId,
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
    };
  }

  private trimOptional(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toJson(value: Record<string, unknown> | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private ensureValidRecurrenceRule(value: Record<string, unknown> | null | undefined) {
    if (!value || value.endDate === undefined || value.endDate === null) {
      return;
    }

    if (typeof value.endDate !== "string") {
      throw new BadRequestException("날짜를 확인해 주세요.");
    }

    assertValidDateKey(value.endDate);
  }

  private ensureAllowedRecurrenceType(recurrenceType: RecurrenceType) {
    if (
      recurrenceType !== RecurrenceType.ONCE &&
      recurrenceType !== RecurrenceType.WEEKLY &&
      recurrenceType !== RecurrenceType.MONTHLY &&
      recurrenceType !== RecurrenceType.YEARLY
    ) {
      throw new BadRequestException("반복 설정을 다시 확인해 주세요.");
    }
  }
}
