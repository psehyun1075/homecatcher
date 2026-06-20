import { NotificationType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsUUID("4", { message: "가족 정보를 확인해 주세요." })
  familyId?: string;

  @IsOptional()
  @IsEnum(NotificationType, { message: "알림 종류를 확인해 주세요." })
  notificationType?: NotificationType;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean({ message: "읽음 상태를 확인해 주세요." })
  unreadOnly?: boolean;

  @IsOptional()
  @IsString({ message: "커서를 다시 확인해 주세요." })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: "조회 개수를 확인해 주세요." })
  @Max(50, { message: "조회 개수를 확인해 주세요." })
  limit?: number = 20;
}
