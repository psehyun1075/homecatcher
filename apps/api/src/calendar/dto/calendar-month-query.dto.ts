import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CalendarMonthQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: "조회 월을 다시 확인해 주세요." })
  month!: string;

  @IsOptional()
  @IsString({ message: "시간대는 문자로 입력해 주세요." })
  @MaxLength(40, { message: "시간대가 너무 길어요." })
  timezone?: string = "Asia/Seoul";

  @IsOptional()
  @IsString({ message: "캘린더 유형을 다시 확인해 주세요." })
  types?: string;
}
