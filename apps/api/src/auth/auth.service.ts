import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { sign, verify } from "jsonwebtoken";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SignupDto } from "./dto/signup.dto";
import { CurrentUserPayload } from "./decorators/current-user.decorator";

type TokenKind = "access" | "refresh";

interface AuthTokenPayload {
  sub: string;
  sid: string;
  email: string;
  kind: TokenKind;
}

interface SessionTokenBundle {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async signup(dto: SignupDto) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.userAccount.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException("이미 가입된 이메일이에요.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const sessionId = randomUUID();
    const user = await this.prisma.userAccount.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
        status: UserStatus.ACTIVE,
      },
    });

    const tokens = await this.createSessionAndTokens(user.id, user.email, sessionId);

    return {
      ...tokens,
      user: this.serializeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.userAccount.findUnique({
      where: {
        email,
      },
    });

    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 맞지 않아요.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 맞지 않아요.");
    }

    await this.prisma.userAccount.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const sessionId = randomUUID();
    const tokens = await this.createSessionAndTokens(user.id, user.email, sessionId);

    return {
      ...tokens,
      user: this.serializeUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const secret = this.getRefreshSecret();
    const payload = this.verifyToken(dto.refreshToken, secret, "refresh");
    const session = await this.prisma.userSession.findUnique({
      where: {
        id: payload.sid,
      },
      include: {
        user: true,
      },
    });

    if (!session || session.deletedAt || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("리프레시 토큰이 만료됐어요. 다시 로그인해 주세요.");
    }

    if (!session.user || session.user.deletedAt || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("계정을 확인할 수 없어요.");
    }

    const matches = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);

    if (!matches) {
      throw new UnauthorizedException("리프레시 토큰이 올바르지 않아요.");
    }

    const tokens = await this.rotateSession(session.id, session.userId, session.user.email);

    return {
      ...tokens,
      user: this.serializeUser(session.user),
    };
  }

  async logout(user: CurrentUserPayload) {
    const session = await this.prisma.userSession.findUnique({
      where: {
        id: user.sessionId,
      },
    });

    if (!session || session.deletedAt) {
      throw new NotFoundException("세션을 찾을 수 없어요.");
    }

    if (session.revokedAt) {
      return {
        message: "이미 로그아웃되어 있어요.",
      };
    }

    await this.prisma.userSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: "로그아웃했어요.",
    };
  }

  async me(user: CurrentUserPayload) {
    const account = await this.prisma.userAccount.findUnique({
      where: {
        id: user.userId,
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException("내 정보를 찾을 수 없어요.");
    }

    return {
      user: this.serializeUser(account),
    };
  }

  private async createSessionAndTokens(userId: string, email: string, sessionId: string) {
    const tokens = this.issueTokens(userId, email, sessionId);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS);

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return tokens;
  }

  private async rotateSession(sessionId: string, userId: string, email: string) {
    const tokens = this.issueTokens(userId, email, sessionId);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS);

    await this.prisma.userSession.update({
      where: {
        id: sessionId,
      },
      data: {
        refreshTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
      },
    });

    return tokens;
  }

  private issueTokens(userId: string, email: string, sessionId: string): SessionTokenBundle {
    const accessSecret = this.getAccessSecret();
    const refreshSecret = this.getRefreshSecret();

    const payload: AuthTokenPayload = {
      sub: userId,
      sid: sessionId,
      email,
      kind: "access",
    };

    const refreshPayload: AuthTokenPayload = {
      ...payload,
      kind: "refresh",
    };

    return {
      accessToken: sign(payload, accessSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }),
      refreshToken: sign(refreshPayload, refreshSecret, {
        expiresIn: "7d",
      }),
    };
  }

  private verifyToken(token: string, secret: string, kind: TokenKind) {
    try {
      const payload = verify(token, secret) as AuthTokenPayload;

      if (payload.kind !== kind || !payload.sub || !payload.sid) {
        throw new UnauthorizedException("토큰이 올바르지 않아요.");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("토큰이 올바르지 않아요.");
    }
  }

  private getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new BadRequestException("JWT_ACCESS_SECRET 설정이 필요해요.");
    }

    return secret;
  }

  private getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new BadRequestException("JWT_REFRESH_SECRET 설정이 필요해요.");
    }

    return secret;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private serializeUser(user: {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    };
  }
}
