import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { verify, type JwtPayload } from "jsonwebtoken";

import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUserPayload } from "../decorators/current-user.decorator";

type TokenKind = "access" | "refresh";

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  sid: string;
  email: string;
  kind: TokenKind;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: CurrentUserPayload }>();
    const authorization = request.headers.authorization;
    const token = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!token?.startsWith("Bearer ")) {
      throw new UnauthorizedException("로그인이 필요해요. 다시 시도해 주세요.");
    }

    const accessToken = token.slice("Bearer ".length).trim();
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new UnauthorizedException("로그인 설정을 확인해 주세요.");
    }

    let payload: AuthTokenPayload;

    try {
      payload = verify(accessToken, secret) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException("로그인이 만료됐어요. 다시 로그인해 주세요.");
    }

    if (payload.kind !== "access" || !payload.sid || !payload.sub) {
      throw new UnauthorizedException("로그인이 필요해요. 다시 시도해 주세요.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: {
        id: payload.sid,
      },
      include: {
        user: true,
      },
    });

    if (!session || session.deletedAt || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("로그인이 만료됐어요. 다시 로그인해 주세요.");
    }

    if (!session.user || session.user.deletedAt || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("계정 상태를 확인할 수 없어요.");
    }

    request.user = {
      userId: session.user.id,
      sessionId: session.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
    };

    return true;
  }
}
