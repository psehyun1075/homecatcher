import { TodoScheduleType } from "@prisma/client";
import { IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TodoScheduleDto {
  @IsEnum(TodoScheduleType, { message: "반복 주기를 확인해 주세요." })
  scheduleType!: TodoScheduleType;

  @IsOptional()
  @IsInt({ message: "반복 간격을 숫자로 입력해 주세요." })
  @Min(1, { message: "반복 간격은 1 이상이어야 해요." })
  @Max(3650, { message: "반복 간격이 너무 길어요." })
  intervalValue?: number;

  @IsOptional()
  @IsArray({ message: "요일을 목록으로 입력해 주세요." })
  @IsInt({ each: true, message: "요일은 숫자로 입력해 주세요." })
  @Min(0, { each: true, message: "요일은 0부터 6까지 입력해 주세요." })
  @Max(6, { each: true, message: "요일은 0부터 6까지 입력해 주세요." })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt({ message: "월 반복 날짜는 숫자로 입력해 주세요." })
  @Min(1, { message: "월 반복 날짜는 1 이상이어야 해요." })
  @Max(31, { message: "월 반복 날짜는 31 이하로 입력해 주세요." })
  dayOfMonth?: number;

  @IsOptional()
  @IsISO8601({}, { message: "시작일을 다시 확인해 주세요." })
  startAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: "종료일을 다시 확인해 주세요." })
  endAt?: string | null;

  @IsOptional()
  @IsString({ message: "시간대는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "시간대가 너무 길어요." })
  timezone?: string = "Asia/Seoul";
}
