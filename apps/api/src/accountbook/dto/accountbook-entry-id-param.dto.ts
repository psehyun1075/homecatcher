import { IsUUID } from "class-validator";

export class AccountbookEntryIdParamDto {
  @IsUUID("4", { message: "가계부 기록을 다시 확인해 주세요." })
  entryId!: string;
}
