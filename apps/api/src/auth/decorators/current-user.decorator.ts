import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserStatus } from "@prisma/client";

export interface CurrentUserPayload {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  status: UserStatus;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
