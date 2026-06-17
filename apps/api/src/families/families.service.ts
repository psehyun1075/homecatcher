import {
  ConflictException,
  Inject,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { FamilyRole, InviteStatus, Prisma, UserStatus } from "@prisma/client";
import { randomBytes } from "crypto";

import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFamilyDto } from "./dto/create-family.dto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FamiliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createFamily(user: CurrentUserPayload, dto: CreateFamilyDto) {
    const account = await this.getActiveUser(user.userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const family = await tx.familyGroup.create({
        data: {
          familyName: dto.familyName.trim(),
          ownerUserId: account.id,
        },
      });

      const member = await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId: account.id,
          role: FamilyRole.OWNER,
          displayName: account.name,
        },
      });

      return {
        family,
        member,
      };
    });

    return {
      family: this.serializeFamily(result.family, FamilyRole.OWNER, 1),
    };
  }

  async listFamilies(user: CurrentUserPayload) {
    await this.getActiveUser(user.userId);

    const memberships = await this.prisma.familyMember.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
        family: {
          deletedAt: null,
        },
      },
      include: {
        family: {
          include: {
            members: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      families: memberships.map((membership) =>
        this.serializeFamily(membership.family, membership.role, membership.family.members.length),
      ),
    };
  }

  async getFamily(user: CurrentUserPayload, familyId: string) {
    await this.ensureFamilyMembership(user.userId, familyId);

    const family = await this.prisma.familyGroup.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
        members: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException("가족을 찾을 수 없어요.");
    }

    return {
      family: this.serializeFamily(family, undefined, family.members.length),
    };
  }

  async listMembers(user: CurrentUserPayload, familyId: string) {
    await this.ensureFamilyMembership(user.userId, familyId);

    const family = await this.prisma.familyGroup.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
    });

    if (!family) {
      throw new NotFoundException("가족을 찾을 수 없어요.");
    }

    const members = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return {
      members: members.map((member) => this.serializeMember(member)),
    };
  }

  async createInvite(user: CurrentUserPayload, familyId: string) {
    await this.ensureFamilyMembership(user.userId, familyId);

    const family = await this.prisma.familyGroup.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
    });

    if (!family) {
      throw new NotFoundException("가족을 찾을 수 없어요.");
    }

    const invite = await this.createUniqueInvite(familyId, user.userId);

    return {
      invite: this.serializeInvite(invite, family.familyName),
    };
  }

  async getInvite(inviteCode: string) {
    const invite = await this.prisma.invite.findUnique({
      where: {
        code: inviteCode,
      },
      include: {
        family: {
          select: {
            id: true,
            familyName: true,
          },
        },
      },
    });

    if (!invite || invite.deletedAt) {
      throw new NotFoundException("초대 코드를 찾을 수 없어요.");
    }

    this.assertInviteJoinable(invite);

    return {
      invite: this.serializeInvite(invite, invite.family.familyName),
    };
  }

  async acceptInvite(user: CurrentUserPayload, inviteCode: string) {
    const account = await this.getActiveUser(user.userId);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: {
          code: inviteCode,
        },
        include: {
          family: {
            select: {
              id: true,
              familyName: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!invite || invite.deletedAt) {
        throw new NotFoundException("초대 코드를 찾을 수 없어요.");
      }

      if (invite.status === InviteStatus.ACCEPTED) {
        throw new ConflictException("이미 수락된 초대예요.");
      }

      if (invite.status === InviteStatus.REVOKED) {
        throw new ConflictException("이미 취소된 초대예요.");
      }

      if (invite.status === InviteStatus.EXPIRED || (invite.expiresAt && invite.expiresAt <= now)) {
        if (invite.status === InviteStatus.PENDING) {
          await tx.invite.update({
            where: {
              id: invite.id,
            },
            data: {
              status: InviteStatus.EXPIRED,
            },
          });
        }

        throw new GoneException("만료된 초대 코드예요.");
      }

      if (!invite.family || invite.family.deletedAt) {
        throw new NotFoundException("가족을 찾을 수 없어요.");
      }

      const existingMember = await tx.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: invite.familyId,
            userId: account.id,
          },
        },
      });

      if (existingMember && !existingMember.deletedAt) {
        throw new ConflictException("이미 이 가족에 참여하고 있어요.");
      }

      const member = await tx.familyMember.create({
        data: {
          familyId: invite.familyId,
          userId: account.id,
          role: FamilyRole.MEMBER,
          displayName: account.name,
        },
      });

      const acceptedInvite = await tx.invite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedByUserId: account.id,
          acceptedAt: now,
        },
        include: {
          family: {
            select: {
              id: true,
              familyName: true,
            },
          },
        },
      });

      return {
        invite: acceptedInvite,
        member,
      };
    });

    return {
      family: {
        id: result.invite.family.id,
        familyName: result.invite.family.familyName,
      },
      invite: this.serializeInvite(result.invite, result.invite.family.familyName),
      member: this.serializeMember(result.member),
    };
  }

  private async createUniqueInvite(familyId: string, createdByUserId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(9).toString("base64url");
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

      try {
        return await this.prisma.invite.create({
          data: {
            familyId,
            createdByUserId,
            code,
            status: InviteStatus.PENDING,
            expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException("초대 코드를 만들지 못했어요. 다시 시도해 주세요.");
  }

  private async ensureFamilyMembership(userId: string, familyId: string) {
    const family = await this.prisma.familyGroup.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
    });

    if (!family) {
      throw new NotFoundException("가족을 찾을 수 없어요.");
    }

    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
    });

    if (!membership || membership.deletedAt) {
      throw new ForbiddenException("이 가족에 접근할 수 없어요.");
    }

    return membership;
  }

  private async getActiveUser(userId: string) {
    const user = await this.prisma.userAccount.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("계정을 확인할 수 없어요.");
    }

    return user;
  }

  private assertInviteJoinable(invite: {
    status: InviteStatus;
    expiresAt: Date | null;
    family: { familyName: string };
  }) {
    const now = new Date();

    if (invite.status === InviteStatus.ACCEPTED) {
      throw new ConflictException("이미 수락된 초대예요.");
    }

    if (invite.status === InviteStatus.REVOKED) {
      throw new ConflictException("이미 취소된 초대예요.");
    }

    if (invite.status === InviteStatus.EXPIRED || (invite.expiresAt && invite.expiresAt <= now)) {
      throw new GoneException("만료된 초대 코드예요.");
    }
  }

  private serializeFamily(
    family: {
      id: string;
      familyName: string;
      ownerUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
      ownerUser?: {
        id: string;
        email: string;
        name: string;
        status: UserStatus;
      } | null;
    },
    role?: FamilyRole,
    memberCount?: number,
  ) {
    return {
      id: family.id,
      familyName: family.familyName,
      ownerUserId: family.ownerUserId,
      ownerUser: family.ownerUser
        ? {
            id: family.ownerUser.id,
            email: family.ownerUser.email,
            name: family.ownerUser.name,
            status: family.ownerUser.status,
          }
        : null,
      memberCount,
      role,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    };
  }

  private serializeMember(member: {
    id: string;
    role: FamilyRole;
    displayName: string | null;
    joinedAt: Date;
    user?: { id: string; email: string; name: string; status: UserStatus } | null;
  }) {
    return {
      id: member.id,
      role: member.role,
      displayName: member.displayName,
      joinedAt: member.joinedAt,
      user: member.user
        ? {
            id: member.user.id,
            email: member.user.email,
            name: member.user.name,
            status: member.user.status,
          }
        : null,
    };
  }

  private serializeInvite(
    invite: {
      id: string;
      familyId: string;
      createdByUserId: string | null;
      code: string;
      status: InviteStatus;
      expiresAt: Date | null;
      acceptedByUserId: string | null;
      acceptedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    familyName: string,
  ) {
    return {
      id: invite.id,
      familyId: invite.familyId,
      familyName,
      createdByUserId: invite.createdByUserId,
      code: invite.code,
      status: invite.status,
      expiresAt: invite.expiresAt,
      acceptedByUserId: invite.acceptedByUserId,
      acceptedAt: invite.acceptedAt,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
    };
  }
}
