import { IsUUID } from "class-validator";

export class HouseholdItemIdParamDto {
  @IsUUID("4", { message: "생필품 정보를 다시 확인해 주세요." })
  itemId!: string;
}
