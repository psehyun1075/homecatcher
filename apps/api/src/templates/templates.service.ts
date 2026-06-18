import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyRole, Prisma, TemplateItemType, TodoScheduleType } from "@prisma/client";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

interface HouseholdItemPayload {
  category?: string;
  memo?: string;
  minStock?: number;
  cycleDays?: number;
}

interface TodoPayload {
  description?: string;
  schedule?: {
    scheduleType?: TodoScheduleType;
    repeatRule?: Prisma.InputJsonValue;
    nextDueAt?: string;
  };
}

interface HomeManualPayload {
  category?: string;
  description?: string;
  isPinned?: boolean;
  steps?: Array<{
    title: string;
    description?: string;
    warning?: string;
  }>;
}

type TemplateItemWithContent = {
  id: string;
  itemType: TemplateItemType;
  title: string;
  content: Prisma.JsonValue | null;
  sortOrder: number;
};

const APPLICABLE_ITEM_TYPES = [TemplateItemType.HOUSEHOLD_ITEM, TemplateItemType.TODO_TASK, TemplateItemType.HOME_MANUAL];

@Injectable()
export class TemplatesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTemplates() {
    const templates = await this.prisma.templateSet.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        targetType: "FAMILY",
      },
      include: {
        items: {
          where: {
            deletedAt: null,
            itemType: {
              in: APPLICABLE_ITEM_TYPES,
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      templates: templates.map((template) => this.serializeTemplateSummary(template)),
    };
  }

  async getTemplate(templateSetId: string) {
    const template = await this.prisma.templateSet.findFirst({
      where: {
        id: templateSetId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        items: {
          where: {
            deletedAt: null,
            itemType: {
              in: APPLICABLE_ITEM_TYPES,
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException("템플릿을 찾을 수 없어요.");
    }

    return {
      template: {
        ...this.serializeTemplateSummary(template),
        items: template.items.map((item) => this.serializeTemplateItem(item)),
      },
    };
  }

  async applyTemplate(user: CurrentUserPayload, familyId: string, templateSetId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: user.userId,
        },
      },
      include: {
        family: true,
      },
    });

    if (!membership || membership.deletedAt || !membership.family || membership.family.deletedAt) {
      throw new ForbiddenException("이 가족에 접근할 수 없어요.");
    }

    if (membership.role !== FamilyRole.OWNER && membership.role !== FamilyRole.ADMIN) {
      throw new ForbiddenException("가족 관리자만 템플릿을 적용할 수 있어요.");
    }

    const template = await this.prisma.templateSet.findFirst({
      where: {
        id: templateSetId,
        deletedAt: null,
      },
      include: {
        items: {
          where: {
            deletedAt: null,
            itemType: {
              in: APPLICABLE_ITEM_TYPES,
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException("템플릿을 찾을 수 없어요.");
    }

    if (!template.isActive) {
      throw new ConflictException("지금은 사용할 수 없는 템플릿이에요.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingApplication = await tx.familyTemplateApplication.findUnique({
        where: {
          familyId_templateSetId: {
            familyId,
            templateSetId,
          },
        },
      });

      if (existingApplication) {
        throw new ConflictException("이미 우리집에 적용한 템플릿이에요.");
      }

      const createdCounts = {
        householdItems: 0,
        todoTasks: 0,
        todoSchedules: 0,
        homeManuals: 0,
        manualSteps: 0,
      };

      for (const item of template.items) {
        if (item.itemType === TemplateItemType.HOUSEHOLD_ITEM) {
          const payload = this.toHouseholdItemPayload(item.content);

          await tx.householdItem.create({
            data: {
              familyId,
              name: item.title,
              category: payload.category,
              memo: payload.memo,
              minStock: payload.minStock,
              cycleDays: payload.cycleDays,
            },
          });
          createdCounts.householdItems += 1;
        }

        if (item.itemType === TemplateItemType.TODO_TASK) {
          const payload = this.toTodoPayload(item.content);
          const todoTask = await tx.todoTask.create({
            data: {
              familyId,
              title: item.title,
              description: payload.description,
            },
          });
          createdCounts.todoTasks += 1;

          if (payload.schedule) {
            await tx.todoSchedule.create({
              data: {
                todoTaskId: todoTask.id,
                scheduleType: payload.schedule.scheduleType ?? TodoScheduleType.WEEKLY,
                repeatRule: payload.schedule.repeatRule ?? Prisma.JsonNull,
                nextDueAt: payload.schedule.nextDueAt ? new Date(payload.schedule.nextDueAt) : null,
              },
            });
            createdCounts.todoSchedules += 1;
          }
        }

        if (item.itemType === TemplateItemType.HOME_MANUAL) {
          const payload = this.toHomeManualPayload(item.content);
          const homeManual = await tx.homeManual.create({
            data: {
              familyId,
              title: item.title,
              category: payload.category,
              description: payload.description,
              isPinned: payload.isPinned ?? false,
            },
          });
          createdCounts.homeManuals += 1;

          for (const [index, step] of (payload.steps ?? []).entries()) {
            await tx.manualStep.create({
              data: {
                homeManualId: homeManual.id,
                stepNo: index + 1,
                title: step.title,
                description: step.description,
                warning: step.warning,
              },
            });
            createdCounts.manualSteps += 1;
          }
        }
      }

      const application = await tx.familyTemplateApplication.create({
        data: {
          familyId,
          templateSetId,
          appliedByUserId: user.userId,
        },
      });

      return {
        application,
        createdCounts,
      };
    });

    return {
      application: {
        id: result.application.id,
        familyId: result.application.familyId,
        templateSetId: result.application.templateSetId,
        appliedByUserId: result.application.appliedByUserId,
        appliedAt: result.application.appliedAt,
      },
      createdCounts: result.createdCounts,
    };
  }

  private serializeTemplateSummary(template: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    items: TemplateItemWithContent[];
  }) {
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      description: template.description,
      itemCounts: this.getItemCounts(template.items),
    };
  }

  private serializeTemplateItem(item: TemplateItemWithContent) {
    return {
      id: item.id,
      itemType: item.itemType,
      title: item.title,
      content: item.content,
      sortOrder: item.sortOrder,
    };
  }

  private getItemCounts(items: TemplateItemWithContent[]) {
    return {
      householdItems: items.filter((item) => item.itemType === TemplateItemType.HOUSEHOLD_ITEM).length,
      todos: items.filter((item) => item.itemType === TemplateItemType.TODO_TASK).length,
      manuals: items.filter((item) => item.itemType === TemplateItemType.HOME_MANUAL).length,
    };
  }

  private toHouseholdItemPayload(content: Prisma.JsonValue | null): HouseholdItemPayload {
    const value = this.asRecord(content);

    return {
      category: this.asString(value.category),
      memo: this.asString(value.memo),
      minStock: this.asNumber(value.minStock),
      cycleDays: this.asNumber(value.cycleDays),
    };
  }

  private toTodoPayload(content: Prisma.JsonValue | null): TodoPayload {
    const value = this.asRecord(content);
    const schedule = this.asRecord(value.schedule);
    const scheduleType = this.asString(schedule.scheduleType);

    return {
      description: this.asString(value.description),
      schedule:
        Object.keys(schedule).length > 0
          ? {
              scheduleType: this.isTodoScheduleType(scheduleType) ? scheduleType : undefined,
              repeatRule: this.toJsonInput(schedule.repeatRule),
              nextDueAt: this.asString(schedule.nextDueAt),
            }
          : undefined,
    };
  }

  private toHomeManualPayload(content: Prisma.JsonValue | null): HomeManualPayload {
    const value = this.asRecord(content);
    const steps = Array.isArray(value.steps)
      ? value.steps
          .map((step) => this.asRecord(step))
          .map((step) => ({
            title: this.asString(step.title) ?? "",
            description: this.asString(step.description),
            warning: this.asString(step.warning),
          }))
          .filter((step) => step.title.length > 0)
      : [];

    return {
      category: this.asString(value.category),
      description: this.asString(value.description),
      isPinned: typeof value.isPinned === "boolean" ? value.isPinned : undefined,
      steps,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private asString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  }

  private asNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private isTodoScheduleType(value: string | undefined): value is TodoScheduleType {
    return Boolean(value && Object.values(TodoScheduleType).includes(value as TodoScheduleType));
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }
}
