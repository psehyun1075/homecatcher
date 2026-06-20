import { ActivityType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ListFeedQueryDto {
  @IsOptional()
  @IsString({ message: "커서를 다시 확인해 주세요." })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: "조회 개수를 확인해 주세요." })
  @Max(50, { message: "조회 개수를 확인해 주세요." })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ActivityType, { message: "활동 종류를 확인해 주세요." })
  activityType?: ActivityType;

  @IsOptional()
  @IsUUID("4", { message: "가족 구성원을 확인해 주세요." })
  actorMemberId?: string;

  @IsOptional()
  @IsISO8601({}, { message: "날짜를 확인해 주세요." })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: "날짜를 확인해 주세요." })
  to?: string;
}
