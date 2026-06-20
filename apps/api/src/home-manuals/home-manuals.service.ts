import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyRole, Prisma } from "@prisma/client";

import { ActivityWriterService } from "../activity-feed/activity-writer.service";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHomeManualDto } from "./dto/create-home-manual.dto";
import { CreateManualRelationDto } from "./dto/create-manual-relation.dto";
import { ListHomeManualsQueryDto } from "./dto/list-home-manuals-query.dto";
import { ManualStepDto } from "./dto/manual-step.dto";
import { ReorderManualStepsDto } from "./dto/reorder-manual-steps.dto";
import { UpdateHomeManualDto } from "./dto/update-home-manual.dto";

const manualInclude = {
  createdByMember: true,
  steps: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      stepNo: "asc" as const,
    },
  },
  relations: {
    where: {
      deletedAt: null,
      targetType: {
        in: ["HOUSEHOLD_ITEM", "TODO"],
      },
    },
    include: {
      householdItem: true,
      todoTask: true,
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.HomeManualInclude;

type ManualWithRelations = Prisma.HomeManualGetPayload<{ include: typeof manualInclude }>;

@Injectable()
export class HomeManualsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActivityWriterService) private readonly activityWriter: ActivityWriterService,
  ) {}

  async listManuals(user: CurrentUserPayload, familyId: string, query: ListHomeManualsQueryDto) {
    await this.ensureFamilyMember(user.userId, familyId);

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where: Prisma.HomeManualWhereInput = {
      familyId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.isPinned !== undefined ? { isPinned: query.isPinned } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [manuals, total] = await this.prisma.$transaction([
      this.prisma.homeManual.findMany({
        where,
        include: manualInclude,
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.homeManual.count({ where }),
    ]);

    return {
      homeManuals: manuals.map((manual) => this.serializeManual(manual)),
      page,
      limit,
      total,
    };
  }

  async createManual(user: CurrentUserPayload, familyId: string, dto: CreateHomeManualDto) {
    const membership = await this.ensureFamilyMember(user.userId, familyId);

    const manual = await this.prisma.$transaction(async (tx) => {
      const created = await tx.homeManual.create({
        data: {
          familyId,
          createdByMemberId: membership.id,
          title: dto.title.trim(),
          category: this.trimOptional(dto.category),
          description: this.trimOptional(dto.description),
          isPinned: dto.isPinned ?? false,
        },
      });

      for (const [index, step] of (dto.steps ?? []).entries()) {
        await tx.manualStep.create({
          data: {
            homeManualId: created.id,
            stepNo: step.sortOrder ?? index + 1,
            title: step.title.trim(),
            description: this.trimOptional(step.description),
            warning: this.trimOptional(step.warning),
            imageUrl: this.trimOptional(step.mediaUrl),
          },
        });
      }

      await this.activityWriter.recordHomeManualCreated(tx, {
        manualId: created.id,
        actorMemberId: membership.id,
        occurredAt: created.createdAt,
      });

      return tx.homeManual.findUniqueOrThrow({
        where: {
          id: created.id,
        },
        include: manualInclude,
      });
    });

    return {
      homeManual: this.serializeManual(manual),
    };
  }

  async getManual(user: CurrentUserPayload, manualId: string) {
    const manual = await this.findManual(manualId);
    await this.ensureFamilyMember(user.userId, manual.familyId);

    return {
      homeManual: this.serializeManual(manual),
    };
  }

  async updateManual(user: CurrentUserPayload, manualId: string, dto: UpdateHomeManualDto) {
    const manual = await this.findManual(manualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);

    const updated = await this.prisma.homeManual.update({
      where: {
        id: manual.id,
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: this.trimOptional(dto.category) } : {}),
        ...(dto.description !== undefined ? { description: this.trimOptional(dto.description) } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
      },
      include: manualInclude,
    });

    return {
      homeManual: this.serializeManual(updated),
    };
  }

  async deleteManual(user: CurrentUserPayload, manualId: string) {
    const manual = await this.findManual(manualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);
    const now = new Date();

    const deleted = await this.prisma.homeManual.update({
      where: {
        id: manual.id,
      },
      data: {
        deletedAt: now,
        steps: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: now,
            },
          },
        },
        relations: {
          updateMany: {
            where: {
              deletedAt: null,
            },
            data: {
              deletedAt: now,
            },
          },
        },
      },
      include: manualInclude,
    });

    return {
      homeManual: this.serializeManual(deleted),
    };
  }

  async listSteps(user: CurrentUserPayload, manualId: string) {
    const manual = await this.findManual(manualId);
    await this.ensureFamilyMember(user.userId, manual.familyId);

    return {
      steps: manual.steps.map((step) => this.serializeStep(step)),
    };
  }

  async createStep(user: CurrentUserPayload, manualId: string, dto: ManualStepDto) {
    const manual = await this.findManual(manualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);
    const maxStepNo = await this.prisma.manualStep.aggregate({
      where: {
        homeManualId: manual.id,
        deletedAt: null,
      },
      _max: {
        stepNo: true,
      },
    });

    const stepNo = dto.sortOrder ?? (maxStepNo._max.stepNo ?? 0) + 1;

    await this.ensureStepNoAvailable(manual.id, stepNo);

    const step = await this.createStepOrThrowConflict({
      homeManualId: manual.id,
      stepNo,
      title: dto.title.trim(),
      description: this.trimOptional(dto.description),
      warning: this.trimOptional(dto.warning),
      imageUrl: this.trimOptional(dto.mediaUrl),
    });

    return {
      step: this.serializeStep(step),
    };
  }

  async updateStep(user: CurrentUserPayload, stepId: string, dto: ManualStepDto) {
    const step = await this.findStep(stepId);
    const manual = await this.findManual(step.homeManualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);

    if (dto.sortOrder !== undefined && dto.sortOrder !== step.stepNo) {
      await this.ensureStepNoAvailable(manual.id, dto.sortOrder);
    }

    const updated = await this.updateStepOrThrowConflict(step.id, {
      title: dto.title.trim(),
      description: this.trimOptional(dto.description),
      warning: this.trimOptional(dto.warning),
      imageUrl: this.trimOptional(dto.mediaUrl),
      ...(dto.sortOrder !== undefined ? { stepNo: dto.sortOrder } : {}),
    });

    return {
      step: this.serializeStep(updated),
    };
  }

  async deleteStep(user: CurrentUserPayload, stepId: string) {
    const step = await this.findStep(stepId);
    const manual = await this.findManual(step.homeManualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);

    const deleted = await this.prisma.manualStep.update({
      where: {
        id: step.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      step: this.serializeStep(deleted),
    };
  }

  async reorderSteps(user: CurrentUserPayload, manualId: string, dto: ReorderManualStepsDto) {
    const manual = await this.findManual(manualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);
    const activeStepIds = manual.steps.map((step) => step.id).sort();
    const requestedStepIds = [...dto.stepIds].sort();

    if (activeStepIds.length !== requestedStepIds.length || activeStepIds.some((id, index) => id !== requestedStepIds[index])) {
      throw new BadRequestException("매뉴얼 단계 순서를 확인해 주세요.");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [index, stepId] of dto.stepIds.entries()) {
        await tx.manualStep.update({
          where: {
            id: stepId,
          },
          data: {
            stepNo: 10000 + index,
          },
        });
      }

      for (const [index, stepId] of dto.stepIds.entries()) {
        await tx.manualStep.update({
          where: {
            id: stepId,
          },
          data: {
            stepNo: index + 1,
          },
        });
      }
    });

    return this.listSteps(user, manualId);
  }

  async createRelation(user: CurrentUserPayload, manualId: string, dto: CreateManualRelationDto) {
    const manual = await this.findManual(manualId);
    const membership = await this.ensureFamilyMember(user.userId, manual.familyId);
    this.ensureCanMutate(membership, manual);
    const target = await this.validateRelationTarget(manual.familyId, dto);

    const existing = await this.prisma.manualRelation.findFirst({
      where: {
        homeManualId: manual.id,
        deletedAt: null,
        targetType: dto.targetType,
        householdItemId: target.householdItemId,
        todoTaskId: target.todoTaskId,
      },
    });

    if (existing) {
      throw new ConflictException("이미 이 매뉴얼에 연결되어 있어요.");
    }

    const relation = await this.createRelationOrThrowConflict({
      homeManualId: manual.id,
      targetType: dto.targetType,
      householdItemId: target.householdItemId,
      todoTaskId: target.todoTaskId,
      note: this.trimOptional(dto.note),
    });

    return {
      relation: this.serializeRelation(relation),
    };
  }

  async listRelations(user: CurrentUserPayload, manualId: string) {
    const manual = await this.findManual(manualId);
    await this.ensureFamilyMember(user.userId, manual.familyId);

    return {
      relations: manual.relations.map((relation) => this.serializeRelation(relation)),
    };
  }

  async deleteRelation(user: CurrentUserPayload, relationId: string) {
    const relation = await this.prisma.manualRelation.findFirst({
      where: {
        id: relationId,
      },
      include: {
        homeManual: true,
        householdItem: true,
        todoTask: true,
      },
    });

    if (!relation) {
      throw new NotFoundException("매뉴얼 연결 정보를 찾을 수 없어요.");
    }

    if (relation.homeManual.deletedAt) {
      throw new NotFoundException("우리집 매뉴얼을 찾을 수 없어요.");
    }

    if (relation.deletedAt) {
      throw new NotFoundException("매뉴얼 연결 정보를 찾을 수 없어요.");
    }

    const membership = await this.ensureFamilyMember(user.userId, relation.homeManual.familyId);
    this.ensureCanMutate(membership, relation.homeManual);

    const deleted = await this.prisma.manualRelation.update({
      where: {
        id: relation.id,
      },
      data: {
        deletedAt: new Date(),
      },
      include: {
        householdItem: true,
        todoTask: true,
      },
    });

    return {
      relation: this.serializeRelation(deleted),
    };
  }

  private async findManual(manualId: string) {
    const manual = await this.prisma.homeManual.findFirst({
      where: {
        id: manualId,
        deletedAt: null,
      },
      include: manualInclude,
    });

    if (!manual) {
      throw new NotFoundException("우리집 매뉴얼을 찾을 수 없어요.");
    }

    return manual;
  }

  private async findStep(stepId: string) {
    const step = await this.prisma.manualStep.findFirst({
      where: {
        id: stepId,
      },
      include: {
        homeManual: true,
      },
    });

    if (!step) {
      throw new NotFoundException("매뉴얼 단계를 찾을 수 없어요.");
    }

    if (step.homeManual.deletedAt) {
      throw new NotFoundException("우리집 매뉴얼을 찾을 수 없어요.");
    }

    if (step.deletedAt) {
      throw new NotFoundException("매뉴얼 단계를 찾을 수 없어요.");
    }

    return step;
  }

  private async validateRelationTarget(familyId: string, dto: CreateManualRelationDto) {
    if (dto.targetType === "HOUSEHOLD_ITEM") {
      if (!dto.householdItemId || dto.todoTaskId) {
        throw new BadRequestException("매뉴얼 연결 대상을 다시 확인해 주세요.");
      }

      const item = await this.prisma.householdItem.findFirst({
        where: {
          id: dto.householdItemId,
          familyId,
          deletedAt: null,
        },
      });

      if (!item) {
        throw new ForbiddenException("이 가족의 데이터만 연결할 수 있어요.");
      }

      return {
        householdItemId: item.id,
        todoTaskId: null,
      };
    }

    if (!dto.todoTaskId || dto.householdItemId) {
      throw new BadRequestException("매뉴얼 연결 대상을 다시 확인해 주세요.");
    }

    const todo = await this.prisma.todoTask.findFirst({
      where: {
        id: dto.todoTaskId,
        familyId,
        deletedAt: null,
      },
    });

    if (!todo) {
      throw new ForbiddenException("이 가족의 데이터만 연결할 수 있어요.");
    }

    return {
      householdItemId: null,
      todoTaskId: todo.id,
    };
  }

  private async ensureStepNoAvailable(homeManualId: string, stepNo: number) {
    const existing = await this.prisma.manualStep.findFirst({
      where: {
        homeManualId,
        stepNo,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException("이미 사용 중인 단계 순서예요.");
    }
  }

  private async createStepOrThrowConflict(data: Prisma.ManualStepUncheckedCreateInput) {
    try {
      return await this.prisma.manualStep.create({
        data,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("이미 사용 중인 단계 순서예요.");
      }

      throw error;
    }
  }

  private async updateStepOrThrowConflict(id: string, data: Prisma.ManualStepUncheckedUpdateInput) {
    try {
      return await this.prisma.manualStep.update({
        where: {
          id,
        },
        data,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("이미 사용 중인 단계 순서예요.");
      }

      throw error;
    }
  }

  private async createRelationOrThrowConflict(data: {
    homeManualId: string;
    targetType: "HOUSEHOLD_ITEM" | "TODO";
    householdItemId: string | null;
    todoTaskId: string | null;
    note: string | null;
  }) {
    try {
      return await this.prisma.manualRelation.create({
        data,
        include: {
          householdItem: true,
          todoTask: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("이미 이 매뉴얼에 연결되어 있어요.");
      }

      throw error;
    }
  }

  private async ensureFamilyMember(userId: string, familyId: string) {
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
      throw new ForbiddenException("우리집 매뉴얼에 접근할 수 없어요.");
    }

    return membership;
  }

  private ensureCanMutate(membership: { id: string; role: FamilyRole }, manual: { createdByMemberId: string | null }) {
    if (membership.role === FamilyRole.OWNER || membership.role === FamilyRole.ADMIN) {
      return;
    }

    if (manual.createdByMemberId === membership.id) {
      return;
    }

    throw new ForbiddenException("이 우리집 매뉴얼은 수정할 수 없어요.");
  }

  private serializeManual(manual: ManualWithRelations) {
    return {
      id: manual.id,
      familyId: manual.familyId,
      title: manual.title,
      category: manual.category,
      description: manual.description,
      isPinned: manual.isPinned,
      createdByMember: this.serializeMember(manual.createdByMember),
      steps: manual.steps.map((step) => this.serializeStep(step)),
      relations: manual.relations.map((relation) => this.serializeRelation(relation)),
      createdAt: manual.createdAt,
      updatedAt: manual.updatedAt,
      deletedAt: manual.deletedAt,
    };
  }

  private serializeStep(step: {
    id: string;
    homeManualId: string;
    stepNo: number;
    title: string;
    description: string | null;
    warning: string | null;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    return {
      id: step.id,
      homeManualId: step.homeManualId,
      title: step.title,
      description: step.description,
      warning: step.warning,
      mediaUrl: step.imageUrl,
      sortOrder: step.stepNo,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
      deletedAt: step.deletedAt,
    };
  }

  private serializeRelation(relation: {
    id: string;
    homeManualId: string;
    targetType: string | null;
    householdItemId: string | null;
    todoTaskId: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    householdItem?: { id: string; name: string; category: string | null } | null;
    todoTask?: { id: string; title: string; category: string | null } | null;
  }) {
    return {
      id: relation.id,
      homeManualId: relation.homeManualId,
      targetType: relation.targetType,
      householdItemId: relation.householdItemId,
      todoTaskId: relation.todoTaskId,
      note: relation.note,
      householdItem: relation.householdItem
        ? {
            id: relation.householdItem.id,
            name: relation.householdItem.name,
            category: relation.householdItem.category,
          }
        : null,
      todo: relation.todoTask
        ? {
            id: relation.todoTask.id,
            title: relation.todoTask.title,
            category: relation.todoTask.category,
          }
        : null,
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt,
      deletedAt: relation.deletedAt,
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

  private trimOptional(value: string | undefined | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
