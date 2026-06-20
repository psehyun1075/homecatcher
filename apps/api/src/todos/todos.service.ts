import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyRole, Prisma, TodoScheduleType } from "@prisma/client";
import { createHash } from "crypto";

import { ActivityWriterService } from "../activity-feed/activity-writer.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import {
  addLocalDays,
  assertValidTimezone,
  getZonedParts,
  lastDayOfMonth,
  zonedTimeToUtc,
} from "../common/calendar-date.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTodoCompletionDto } from "./dto/create-todo-completion.dto";
import { CreateTodoDto } from "./dto/create-todo.dto";
import { ListTodosQueryDto } from "./dto/list-todos-query.dto";
import { TodoScheduleDto } from "./dto/todo-schedule.dto";
import { UpdateTodoDto } from "./dto/update-todo.dto";

const todoInclude = {
  createdByMember: true,
  plannerMember: true,
  assigneeMember: true,
  schedules: {
    where: {
      deletedAt: null,
      isEnabled: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  completions: {
    where: {
      deletedAt: null,
    },
    include: {
      completedByMember: true,
    },
    orderBy: {
      completedAt: "desc" as const,
    },
  },
};

const completionInclude = {
  todoTask: true,
  completedByMember: true,
} satisfies Prisma.TodoCompletionInclude;

type TodoWithRelations = Prisma.TodoTaskGetPayload<{ include: typeof todoInclude }>;
type CompletionWithRelations = Prisma.TodoCompletionGetPayload<{ include: typeof completionInclude }>;
type SchedulePayload = {
  intervalValue?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startAt?: string | null;
  endAt?: string | null;
};

@Injectable()
export class TodosService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityWriterService) private readonly activityWriter: ActivityWriterService,
  ) {}

  async listTodos(user: CurrentUserPayload, familyId: string, query: ListTodosQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where: Prisma.TodoTaskWhereInput = {
      familyId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.assigneeMemberId ? { assigneeMemberId: query.assigneeMemberId } : {}),
      ...(query.plannerMemberId ? { plannerMemberId: query.plannerMemberId } : {}),
      ...(query.completed === true ? { completedAt: { not: null } } : {}),
      ...(query.completed === false ? { completedAt: null } : {}),
      ...(query.dueFrom || query.dueTo
        ? {
            schedules: {
              some: {
                deletedAt: null,
                isEnabled: true,
                nextDueAt: {
                  ...(query.dueFrom ? { gte: new Date(query.dueFrom) } : {}),
                  ...(query.dueTo ? { lte: new Date(query.dueTo) } : {}),
                },
              },
            },
          }
        : {}),
    };

    const [todos, total] = await this.prisma.$transaction([
      this.prisma.todoTask.findMany({
        where,
        include: todoInclude,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.todoTask.count({ where }),
    ]);

    return {
      todos: todos.map((todo) => this.serializeTodo(todo)),
      page,
      limit,
      total,
    };
  }

  async createTodo(user: CurrentUserPayload, familyId: string, dto: CreateTodoDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);
    await this.ensureOptionalFamilyMember(familyId, dto.plannerMemberId);
    await this.ensureOptionalFamilyMember(familyId, dto.assigneeMemberId);

    const todo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.todoTask.create({
        data: {
          familyId,
          createdByMemberId: membership.id,
          title: dto.title.trim(),
          description: this.trimOptional(dto.description),
          category: this.trimOptional(dto.category),
          priority: dto.priority,
          estimatedMinutes: dto.estimatedMinutes,
          plannerMemberId: dto.plannerMemberId ?? null,
          assigneeMemberId: dto.assigneeMemberId ?? null,
        },
      });

      if (dto.schedule) {
        await tx.todoSchedule.create({
          data: this.toScheduleCreateData(created.id, dto.schedule, new Date()),
        });
      }

      return tx.todoTask.findUniqueOrThrow({
        where: {
          id: created.id,
        },
        include: todoInclude,
      });
    });

    return {
      todo: this.serializeTodo(todo),
    };
  }

  async getTodo(user: CurrentUserPayload, todoId: string) {
    const todo = await this.findTodo(todoId);
    await this.ensureFamilyMember(user.userId, todo.familyId);

    return {
      todo: this.serializeTodo(todo),
    };
  }

  async updateTodo(user: CurrentUserPayload, todoId: string, dto: UpdateTodoDto) {
    const todo = await this.findTodo(todoId);
    const membership = await this.ensureFamilyMember(user.userId, todo.familyId);
    this.ensureCanMutate(membership, todo);
    await this.ensureOptionalFamilyMember(todo.familyId, dto.plannerMemberId);
    await this.ensureOptionalFamilyMember(todo.familyId, dto.assigneeMemberId);

    const updated = await this.prisma.todoTask.update({
      where: {
        id: todo.id,
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: this.trimOptional(dto.description) } : {}),
        ...(dto.category !== undefined ? { category: this.trimOptional(dto.category) } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.estimatedMinutes !== undefined ? { estimatedMinutes: dto.estimatedMinutes } : {}),
        ...(dto.plannerMemberId !== undefined ? { plannerMemberId: dto.plannerMemberId } : {}),
        ...(dto.assigneeMemberId !== undefined ? { assigneeMemberId: dto.assigneeMemberId } : {}),
      },
      include: todoInclude,
    });

    return {
      todo: this.serializeTodo(updated),
    };
  }

  async deleteTodo(user: CurrentUserPayload, todoId: string) {
    const todo = await this.findTodo(todoId);
    const membership = await this.ensureFamilyMember(user.userId, todo.familyId);
    this.ensureCanMutate(membership, todo);

    const deleted = await this.prisma.todoTask.update({
      where: {
        id: todo.id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
        schedules: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
              isEnabled: false,
            },
          },
        },
      },
      include: todoInclude,
    });

    return {
      todo: this.serializeTodo(deleted),
    };
  }

  async getSchedule(user: CurrentUserPayload, todoId: string) {
    const todo = await this.findTodo(todoId);
    await this.ensureFamilyMember(user.userId, todo.familyId);

    return {
      schedule: todo.schedules[0] ? this.serializeSchedule(todo.schedules[0]) : null,
    };
  }

  async upsertSchedule(user: CurrentUserPayload, todoId: string, dto: TodoScheduleDto) {
    const todo = await this.findTodo(todoId);
    const membership = await this.ensureFamilyMember(user.userId, todo.familyId);
    this.ensureCanMutate(membership, todo);

    const schedule = await this.prisma.$transaction(async (tx) => {
      await tx.todoSchedule.updateMany({
        where: {
          todoTaskId: todo.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          isEnabled: false,
        },
      });

      return tx.todoSchedule.create({
        data: this.toScheduleCreateData(todo.id, dto, new Date()),
      });
    });

    return {
      schedule: this.serializeSchedule(schedule),
    };
  }

  async deleteSchedule(user: CurrentUserPayload, todoId: string) {
    const todo = await this.findTodo(todoId);
    const membership = await this.ensureFamilyMember(user.userId, todo.familyId);
    this.ensureCanMutate(membership, todo);

    await this.prisma.todoSchedule.updateMany({
      where: {
        todoTaskId: todo.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isEnabled: false,
      },
    });

    return {
      schedule: null,
    };
  }

  async createCompletion(user: CurrentUserPayload, todoId: string, dto: CreateTodoCompletionDto) {
    const requestPayloadHash = this.createCompletionPayloadHash(todoId, dto);
    const existing = await this.prisma.todoCompletion.findUnique({
      where: {
        requestId: dto.requestId,
      },
      include: completionInclude,
    });

    if (existing) {
      if (existing.todoTask.deletedAt) {
        throw new NotFoundException("할 일을 찾을 수 없어요.");
      }

      await this.ensureFamilyMember(user.userId, existing.todoTask.familyId);
      this.assertSameCompletionPayload(existing, todoId, dto, requestPayloadHash);

      return {
        completion: this.serializeCompletion(existing),
        idempotent: true,
      };
    }

    const todo = await this.findTodo(todoId);
    const membership = await this.ensureFamilyMember(user.userId, todo.familyId);
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();

    try {
      const completion = await this.prisma.$transaction(async (tx) => {
        const created = await tx.todoCompletion.create({
          data: {
            requestId: dto.requestId,
            requestPayloadHash,
            todoTaskId: todo.id,
            completedByMemberId: membership.id,
            completedAt,
            note: this.trimOptional(dto.note),
          },
        });

        const activeSchedule = todo.schedules[0] ?? null;
        const nextDueAt = activeSchedule
          ? this.calculateNextDueAt(
              activeSchedule.scheduleType,
              this.toSchedulePayload(activeSchedule.repeatRule),
              completedAt,
              true,
              activeSchedule.timezone,
            )
          : null;
        const shouldMarkCompleted = !activeSchedule || activeSchedule.scheduleType === TodoScheduleType.ONCE;

        if (activeSchedule) {
          await tx.todoSchedule.update({
            where: {
              id: activeSchedule.id,
            },
            data: {
              nextDueAt,
            },
          });
        }

        await tx.todoTask.update({
          where: {
            id: todo.id,
          },
          data: {
            completedAt: shouldMarkCompleted ? completedAt : null,
          },
        });

        await this.activityWriter.recordTodoCompleted(tx, {
          completionId: created.id,
          todoId: todo.id,
          actorMemberId: membership.id,
          occurredAt: completedAt,
        });

        return tx.todoCompletion.findUniqueOrThrow({
          where: {
            id: created.id,
          },
          include: completionInclude,
        });
      });

      return {
        completion: this.serializeCompletion(completion),
        idempotent: false,
      };
    } catch (error) {
      if (this.isUniqueRequestIdError(error)) {
        const retried = await this.prisma.todoCompletion.findUnique({
          where: {
            requestId: dto.requestId,
          },
          include: completionInclude,
        });

        if (retried) {
          if (retried.todoTask.deletedAt) {
            throw new NotFoundException("할 일을 찾을 수 없어요.");
          }

          await this.ensureFamilyMember(user.userId, retried.todoTask.familyId);
          this.assertSameCompletionPayload(retried, todoId, dto, requestPayloadHash);

          return {
            completion: this.serializeCompletion(retried),
            idempotent: true,
          };
        }
      }

      throw error;
    }
  }

  async listCompletions(user: CurrentUserPayload, todoId: string) {
    const todo = await this.findTodo(todoId);
    await this.ensureFamilyMember(user.userId, todo.familyId);

    const completions = await this.prisma.todoCompletion.findMany({
      where: {
        todoTaskId: todo.id,
        deletedAt: null,
      },
      include: completionInclude,
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      completions: completions.map((completion) => this.serializeCompletion(completion)),
    };
  }

  async getCompletion(user: CurrentUserPayload, completionId: string) {
    const completion = await this.prisma.todoCompletion.findFirst({
      where: {
        id: completionId,
        deletedAt: null,
        todoTask: {
          deletedAt: null,
        },
      },
      include: completionInclude,
    });

    if (!completion) {
      throw new NotFoundException("완료 기록을 찾을 수 없어요.");
    }

    await this.ensureFamilyMember(user.userId, completion.todoTask.familyId);

    return {
      completion: this.serializeCompletion(completion),
    };
  }

  private async findTodo(todoId: string) {
    const todo = await this.prisma.todoTask.findFirst({
      where: {
        id: todoId,
        deletedAt: null,
      },
      include: todoInclude,
    });

    if (!todo) {
      throw new NotFoundException("할 일을 찾을 수 없어요.");
    }

    return todo;
  }

  private toScheduleCreateData(todoTaskId: string, dto: TodoScheduleDto, baseDate: Date): Prisma.TodoScheduleUncheckedCreateInput {
    const payload: SchedulePayload = {
      intervalValue: dto.intervalValue ?? 1,
      daysOfWeek: dto.daysOfWeek,
      dayOfMonth: dto.dayOfMonth,
      startAt: dto.startAt ?? null,
      endAt: dto.endAt ?? null,
    };

    if (dto.scheduleType === TodoScheduleType.WEEKLY && payload.daysOfWeek && new Set(payload.daysOfWeek).size !== payload.daysOfWeek.length) {
      throw new BadRequestException("반복 주기를 확인해 주세요.");
    }

    return {
      todoTaskId,
      scheduleType: dto.scheduleType,
      repeatRule: payload as Prisma.InputJsonObject,
      nextDueAt: this.calculateNextDueAt(
        dto.scheduleType,
        payload,
        dto.startAt ? new Date(dto.startAt) : baseDate,
        false,
        dto.timezone ?? "Asia/Seoul",
      ),
      timezone: dto.timezone ?? "Asia/Seoul",
      isEnabled: true,
    };
  }

  private calculateNextDueAt(
    scheduleType: TodoScheduleType,
    payload: SchedulePayload,
    baseDate: Date,
    afterCompletion: boolean,
    timezone: string,
  ) {
    this.assertValidTimezone(timezone);
    const endAt = payload.endAt ? new Date(payload.endAt) : null;
    let next: Date | null = null;
    const interval = payload.intervalValue ?? 1;

    if (scheduleType === TodoScheduleType.ONCE) {
      next = afterCompletion ? null : payload.startAt ? new Date(payload.startAt) : baseDate;
    } else if (scheduleType === TodoScheduleType.DAILY) {
      next = this.addLocalDays(baseDate, interval, timezone);
    } else if (scheduleType === TodoScheduleType.INTERVAL_DAYS) {
      next = this.addLocalDays(baseDate, interval, timezone);
    } else if (scheduleType === TodoScheduleType.WEEKLY) {
      next = this.nextWeeklyDate(baseDate, payload.daysOfWeek ?? [this.getZonedParts(baseDate, timezone).dayOfWeek], afterCompletion, timezone);
    } else if (scheduleType === TodoScheduleType.MONTHLY) {
      next = this.nextMonthlyDate(baseDate, payload.dayOfMonth ?? this.getZonedParts(baseDate, timezone).day, afterCompletion, timezone);
    } else {
      next = payload.startAt ? new Date(payload.startAt) : null;
    }

    if (next && endAt && next > endAt) {
      return null;
    }

    return next;
  }

  private nextWeeklyDate(baseDate: Date, daysOfWeek: number[], afterCompletion: boolean, timezone: string) {
    const uniqueDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const baseParts = this.getZonedParts(baseDate, timezone);
    const baseDay = baseParts.dayOfWeek;
    let bestOffset: number | null = null;

    for (const day of uniqueDays) {
      let offset = day - baseDay;
      if (offset < 0 || (offset === 0 && afterCompletion)) {
        offset += 7;
      }

      if (bestOffset === null || offset < bestOffset) {
        bestOffset = offset;
      }
    }

    return this.addLocalDays(baseDate, bestOffset ?? 7, timezone);
  }

  private nextMonthlyDate(baseDate: Date, dayOfMonth: number, afterCompletion: boolean, timezone: string) {
    const baseParts = this.getZonedParts(baseDate, timezone);
    let year = baseParts.year;
    let month = baseParts.month;
    const candidate = this.dateInMonth(year, month, dayOfMonth, baseParts, timezone);

    if (candidate < baseDate || (afterCompletion && candidate.getTime() === baseDate.getTime())) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    return this.dateInMonth(year, month, dayOfMonth, baseParts, timezone);
  }

  private dateInMonth(
    year: number,
    month: number,
    dayOfMonth: number,
    baseParts: { hour: number; minute: number; second: number; millisecond: number },
    timezone: string,
  ) {
    const lastDay = lastDayOfMonth(year, month);
    const day = Math.min(dayOfMonth, lastDay);

    return this.zonedTimeToUtc(
      {
        year,
        month,
        day,
        hour: baseParts.hour,
        minute: baseParts.minute,
        second: baseParts.second,
        millisecond: baseParts.millisecond,
      },
      timezone,
    );
  }

  private addLocalDays(date: Date, days: number, timezone: string) {
    return addLocalDays(date, days, timezone);
  }

  private assertValidTimezone(timezone: string) {
    assertValidTimezone(timezone);
  }

  private getZonedParts(date: Date, timezone: string) {
    return getZonedParts(date, timezone);
  }

  private zonedTimeToUtc(
    localTime: { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number },
    timezone: string,
  ) {
    return zonedTimeToUtc(localTime, timezone);
  }

  private createCompletionPayloadHash(todoId: string, dto: CreateTodoCompletionDto) {
    return createHash("sha256")
      .update(
        JSON.stringify({
          todoId,
          completedAt: dto.completedAt ? new Date(dto.completedAt).toISOString() : null,
          note: this.normalizeOptionalText(dto.note),
        }),
      )
      .digest("hex");
  }

  private assertSameCompletionPayload(
    completion: CompletionWithRelations,
    todoId: string,
    dto: CreateTodoCompletionDto,
    requestPayloadHash: string,
  ) {
    if (completion.requestPayloadHash) {
      if (completion.requestPayloadHash !== requestPayloadHash) {
        throw new ConflictException("같은 요청 ID로 다른 완료 정보가 전달됐어요.");
      }

      return;
    }

    if (
      completion.todoTaskId !== todoId ||
      (dto.completedAt && completion.completedAt.getTime() !== new Date(dto.completedAt).getTime()) ||
      (completion.note ?? null) !== this.normalizeOptionalText(dto.note)
    ) {
      throw new ConflictException("같은 요청 ID로 다른 완료 정보가 전달됐어요.");
    }
  }

  private toSchedulePayload(value: Prisma.JsonValue | null): SchedulePayload {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as SchedulePayload;
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
      throw new ForbiddenException("이 할 일에 접근할 수 없어요.");
    }

    return membership;
  }

  private async ensureOptionalFamilyMember(familyId: string, memberId: string | null | undefined) {
    if (memberId === undefined || memberId === null) {
      return;
    }

    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        familyId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException("담당자는 우리 가족 구성원만 선택할 수 있어요.");
    }
  }

  private ensureCanMutate(membership: { id: string; role: FamilyRole }, todo: { createdByMemberId: string | null }) {
    if (membership.role === FamilyRole.OWNER || membership.role === FamilyRole.ADMIN) {
      return;
    }

    if (todo.createdByMemberId === membership.id) {
      return;
    }

    throw new ForbiddenException("이 할 일은 수정할 수 없어요.");
  }

  private serializeTodo(todo: TodoWithRelations) {
    const activeSchedule = todo.schedules[0] ?? null;
    const latestCompletion = todo.completions[0] ?? null;

    return {
      id: todo.id,
      familyId: todo.familyId,
      title: todo.title,
      description: todo.description,
      category: todo.category,
      priority: todo.priority,
      estimatedMinutes: todo.estimatedMinutes,
      isActive: todo.isActive,
      completedAt: todo.completedAt,
      createdByMember: this.serializeMember(todo.createdByMember),
      plannerMember: this.serializeMember(todo.plannerMember),
      assigneeMember: this.serializeMember(todo.assigneeMember),
      schedule: activeSchedule ? this.serializeSchedule(activeSchedule) : null,
      nextDueAt: activeSchedule?.nextDueAt ?? null,
      latestCompletion: latestCompletion ? this.serializeCompletion(latestCompletion) : null,
      completionCount: todo.completions.length,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      deletedAt: todo.deletedAt,
    };
  }

  private serializeSchedule(schedule: {
    id: string;
    todoTaskId: string;
    scheduleType: TodoScheduleType;
    repeatRule: Prisma.JsonValue | null;
    nextDueAt: Date | null;
    timezone: string;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const payload = this.toSchedulePayload(schedule.repeatRule);

    return {
      id: schedule.id,
      todoTaskId: schedule.todoTaskId,
      scheduleType: schedule.scheduleType,
      intervalValue: payload.intervalValue ?? null,
      daysOfWeek: payload.daysOfWeek ?? null,
      dayOfMonth: payload.dayOfMonth ?? null,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      timezone: schedule.timezone,
      nextDueAt: schedule.nextDueAt,
      isEnabled: schedule.isEnabled,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  private serializeCompletion(completion: {
    id: string;
    requestId: string;
    todoTaskId: string;
    completedByMember: { id: string; familyId: string; userId: string | null; role: FamilyRole; displayName: string | null } | null;
    completedAt: Date;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: completion.id,
      requestId: completion.requestId,
      todoId: completion.todoTaskId,
      completedByMember: this.serializeMember(completion.completedByMember),
      completedAt: completion.completedAt,
      note: completion.note,
      createdAt: completion.createdAt,
      updatedAt: completion.updatedAt,
    };
  }

  private serializeMember(member: { id: string; familyId: string; userId: string | null; role: FamilyRole; displayName: string | null } | null) {
    if (!member) {
      return null;
    }

    return {
      id: member.id,
      familyId: member.familyId,
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
    };
  }

  private normalizeOptionalText(value: string | undefined | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private trimOptional(value: string | undefined | null) {
    return this.normalizeOptionalText(value);
  }

  private isUniqueRequestIdError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("requestId")
    );
  }
}
