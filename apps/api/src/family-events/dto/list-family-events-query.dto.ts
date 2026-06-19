import { EventType } from "@prisma/client";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from "class-validator";

export class ListFamilyEventsQueryDto {
  @IsOptional()
  @IsISO8601({}, { message: "조회 시작일을 다시 확인해 주세요." })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: "조회 종료일을 다시 확인해 주세요." })
  to?: string;

  @IsOptional()
  @IsEnum(EventType, { message: "일정 종류를 다시 확인해 주세요." })
  eventType?: EventType;

  @IsOptional()
  @IsUUID("4", { message: "참여자를 다시 확인해 주세요." })
  participantMemberId?: string;

  @IsOptional()
  @IsInt({ message: "페이지는 숫자로 입력해 주세요." })
  @Min(1, { message: "페이지는 1 이상이어야 해요." })
  page?: number = 1;

  @IsOptional()
  @IsInt({ message: "목록 개수는 숫자로 입력해 주세요." })
  @Min(1, { message: "목록 개수는 1 이상이어야 해요." })
  @Max(100, { message: "목록은 한 번에 100개까지만 볼 수 있어요." })
  limit?: number = 20;
}
