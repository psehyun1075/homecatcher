import { EventType, RecurrenceType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateFamilyEventDto {
  @IsString({ message: "가족 일정 이름을 입력해 주세요." })
  @MinLength(1, { message: "가족 일정 이름을 입력해 주세요." })
  @MaxLength(100, { message: "가족 일정 이름은 100자 이하로 입력해 주세요." })
  title!: string;

  @IsOptional()
  @IsString({ message: "설명은 문자로 입력해 주세요." })
  @MaxLength(1000, { message: "설명은 1000자 이하로 입력해 주세요." })
  description?: string | null;

  @IsEnum(EventType, { message: "일정 종류를 다시 확인해 주세요." })
  eventType!: EventType;

  @IsOptional()
  @IsString({ message: "장소는 문자로 입력해 주세요." })
  @MaxLength(120, { message: "장소는 120자 이하로 입력해 주세요." })
  location?: string | null;

  @IsISO8601({}, { message: "일정 시작 시간을 다시 확인해 주세요." })
  startAt!: string;

  @IsOptional()
  @IsISO8601({}, { message: "일정 종료 시간을 다시 확인해 주세요." })
  endAt?: string | null;

  @IsOptional()
  @IsBoolean({ message: "종일 일정 여부를 다시 확인해 주세요." })
  allDay?: boolean = false;

  @IsOptional()
  @IsString({ message: "시간대는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "시간대가 너무 길어요." })
  timezone?: string = "Asia/Seoul";

  @IsOptional()
  @IsHexColor({ message: "표시 색상은 #RRGGBB 형식으로 입력해 주세요." })
  displayColor?: string | null;

  @IsOptional()
  @IsIn([RecurrenceType.ONCE, RecurrenceType.WEEKLY, RecurrenceType.MONTHLY, RecurrenceType.YEARLY], {
    message: "반복 설정을 다시 확인해 주세요.",
  })
  recurrenceType?: RecurrenceType = RecurrenceType.ONCE;

  @IsOptional()
  recurrenceRule?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray({ message: "참여자는 목록으로 입력해 주세요." })
  @ArrayUnique({ message: "참여자가 중복됐어요." })
  @IsUUID("4", { each: true, message: "참여자는 우리 가족 구성원만 선택할 수 있어요." })
  @Transform(({ value }) => value ?? [])
  participantMemberIds?: string[] = [];
}
