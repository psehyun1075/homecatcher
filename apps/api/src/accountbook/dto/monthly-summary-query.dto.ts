import { Matches } from "class-validator";

export class MonthlySummaryQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: "조회할 월은 YYYY-MM 형식으로 입력해 주세요." })
  month!: string;
}
